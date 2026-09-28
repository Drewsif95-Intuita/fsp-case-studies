// Company sign-in and API access. Locally the dev server answers /api/* without sign-in. On the FSP
// site every content request carries a delegated token for the shared Data Product - Internal Apps
// registration, which server/auth.py validates exactly as the Data Products handbook does.
import type { AccountInfo } from '@azure/msal-browser'
import type { CaseCatalogue } from './data/cases'

type SiteConfig = {
  local?: boolean
  configured: boolean
  tenantId?: string
  clientId?: string
  apiScope?: string
}

export type Session = {
  local: boolean
  userName?: string
  api: (path: string) => Promise<Response>
}

export type Problem = 'denied' | 'unavailable' | 'offline' | 'setup' | 'failed'

export type Start =
  | { state: 'ready'; session: Session; catalogue: CaseCatalogue }
  | { state: 'sign-in'; signIn: () => Promise<void>; note?: string }
  | { state: 'problem'; problem: Problem; otherAccount?: () => Promise<void> }

const returnKey = 'fsp.case-hub.return'
// After sign-in only the site's own pages are restored, never an arbitrary address.
const appPath = /^\/(?:|cases\/[a-z0-9-]+|products\/[a-z0-9-]+)$/

function safeReturn(value: string | null) {
  try {
    const url = new URL(value || '/', location.origin)
    return url.origin === location.origin && appPath.test(url.pathname)
      ? url.pathname + url.search
      : '/'
  } catch {
    return '/'
  }
}

class SignInNeeded extends Error {}

async function readCatalogue(session: Session): Promise<Start> {
  let response: Response
  try {
    response = await session.api('/api/cases')
  } catch (error) {
    if (error instanceof SignInNeeded) throw error
    return { state: 'problem', problem: 'offline' }
  }
  if (response.status === 401 || response.status === 403) return { state: 'problem', problem: 'denied' }
  if (!response.ok) return { state: 'problem', problem: 'unavailable' }
  return { state: 'ready', session, catalogue: (await response.json()) as CaseCatalogue }
}

export async function start(): Promise<Start> {
  let config: SiteConfig
  try {
    const response = await fetch('/api/config', { cache: 'no-store' })
    if (!response.ok) return { state: 'problem', problem: 'unavailable' }
    config = (await response.json()) as SiteConfig
  } catch {
    return { state: 'problem', problem: 'offline' }
  }

  if (config.local) {
    return readCatalogue({ local: true, api: (path) => fetch(path, { cache: 'no-store' }) })
  }
  if (!config.configured || !config.clientId || !config.tenantId || !config.apiScope) {
    return { state: 'problem', problem: 'setup' }
  }

  // Loaded only on the FSP site, so the local preview never needs the sign-in library.
  const { PublicClientApplication, InteractionRequiredAuthError } = await import('@azure/msal-browser')
  const scopes = [config.apiScope]
  const msal = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: `${location.origin}/auth/complete`,
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await msal.initialize()

  const signIn = async (chooseAccount: boolean) => {
    sessionStorage.setItem(returnKey, safeReturn(location.pathname + location.search))
    await msal.loginRedirect({ scopes, ...(chooseAccount ? { prompt: 'select_account' } : {}) })
  }

  let note: string | undefined
  try {
    // MSAL v5 takes this option here rather than in its configuration. A returning sign-in is
    // finished on whichever page it lands, then the page the reader asked for is restored.
    const result = await msal.handleRedirectPromise({ navigateToLoginRequestUrl: false })
    if (result?.account) {
      msal.setActiveAccount(result.account)
      history.replaceState(null, '', safeReturn(sessionStorage.getItem(returnKey)))
      sessionStorage.removeItem(returnKey)
    }
  } catch (error) {
    note =
      (error as { errorCode?: string }).errorCode === 'interaction_in_progress'
        ? 'A previous sign-in is still finishing. Reload this page, then sign in again.'
        : 'Sign-in did not complete. Please try again.'
  }

  const account: AccountInfo | null = msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null
  if (!account) return { state: 'sign-in', signIn: () => signIn(false), note }
  msal.setActiveAccount(account)

  const token = async (forceRefresh = false) => {
    try {
      const result = await msal.acquireTokenSilent({
        scopes,
        account,
        forceRefresh,
        redirectUri: `${location.origin}/auth/bridge`,
      })
      return result.accessToken
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) throw new SignInNeeded()
      throw error
    }
  }

  const api = async (path: string) => {
    const call = (value: string) =>
      fetch(path, {
        headers: { Authorization: `Bearer ${value}` },
        cache: 'no-store',
        credentials: 'omit',
      })
    const response = await call(await token())
    // A stale token can be refused: one fresh token settles it, otherwise the refusal stands.
    if (response.status === 401 || response.status === 403) return call(await token(true))
    return response
  }

  try {
    const started = await readCatalogue({ local: false, userName: account.name ?? account.username, api })
    return started.state === 'problem' && started.problem === 'denied'
      ? { ...started, otherAccount: () => signIn(true) }
      : started
  } catch (error) {
    if (error instanceof SignInNeeded) return { state: 'sign-in', signIn: () => signIn(false) }
    return { state: 'problem', problem: 'failed' }
  }
}

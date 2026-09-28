import { useEffect, useMemo, useState } from 'react'
import App from './App'
import { SignInScreen } from './components/SignInScreen'
import { LibraryContext } from './data/library'
import { buildLibrary } from './data/pages'
import { start, type Problem, type Start } from './session'

const problems: Record<Problem, string> = {
  denied:
    'Access was not granted. The case study hub is for FSP member accounts; guest and personal accounts cannot open it.',
  unavailable: 'The case study hub is temporarily unavailable. Please try again in a minute.',
  offline: 'The case study hub could not be reached. Check your connection and try again.',
  setup: 'Company sign-in is not set up yet. Please contact the site owner.',
  failed: 'Company sign-in could not start. Please reload the page or contact the site owner.',
}

function reload() {
  location.reload()
}

export function Root() {
  const [started, setStarted] = useState<Start | null>(null)

  useEffect(() => {
    let live = true
    start().then(
      (result) => live && setStarted(result),
      () => live && setStarted({ state: 'problem', problem: 'failed' }),
    )
    return () => {
      live = false
    }
  }, [])

  const value = useMemo(
    () =>
      started?.state === 'ready'
        ? {
            catalogue: started.catalogue,
            library: buildLibrary(started.catalogue),
            session: started.session,
          }
        : null,
    [started],
  )

  if (!started) return <SignInScreen message="Checking company sign-in…" />

  if (started.state === 'sign-in') {
    return (
      <SignInScreen
        message={started.note ?? 'Sign in with your FSP account to open the case study hub.'}
        action={{ label: 'Sign in with your FSP account', run: started.signIn }}
      />
    )
  }

  if (started.state === 'problem') {
    const action = started.otherAccount
      ? { label: 'Use a different account', run: started.otherAccount }
      : started.problem === 'setup'
        ? undefined
        : { label: 'Try again', run: reload }
    return <SignInScreen message={problems[started.problem]} action={action} />
  }

  return (
    <LibraryContext.Provider value={value}>
      <App />
    </LibraryContext.Provider>
  )
}

// The case catalogue is written by the framework's scripts/export_site_cases.py from cases/*/case-study.yaml
// and fetched from /api/cases at runtime: from the dev server locally, and on the FSP site only after
// company sign-in. It is never bundled, so no case copy sits in the public JavaScript.

export type CaseStatusKey = 'external' | 'ai-reviewed' | 'human-reviewed' | 'draft'

export type DeckFile = {
  file: string
  path: string
  url: string
  bytes: number
  sha256: string
  built: string
}

type Numbered = { number: string | null }

export type OnePager = {
  eyebrow: string
  title: string
  capabilities: string[]
  hero: { mode: 'statement'; text: string } | { mode: 'figure'; value: string; label: string }
  situation: { label: string; text: string }
  did: { label: string; items: string[] }
  delivered: { label: string; items: Array<{ heading: string; body: string }> }
  why: { label: string; text: string }
  footerTags: string[]
  footer: string
  missing: string[]
  deck: DeckFile
}

type SlideHead = { page: string; kicker: string; title: string }

export type LongFormModel = SlideHead & {
  diagram?: boolean
  stages?: Array<{ label: string; items: string[] }>
  tech?: { label: string; chain: Array<{ label: string; value: string }>; tags: string[] }
  principle?: { lead: string; body: string }
}

export type LongForm = {
  cover: { eyebrow: string; lines: string[] }
  about: SlideHead & {
    ambition: { label: string; paragraphs: string[] }
    challenges: { label: string; items: Array<{ lead: string; body: string }> }
    profile: { label: string; paragraphs: string[] }
  }
  approach: SlideHead & {
    subtitle: string
    columns: Array<{ label: string; items: string[] }>
    scope: { label: string; rows: string[][] }
    outcome: { label: string; rows: string[][] }
  }
  model: LongFormModel
  products: SlideHead & {
    subtitle: string
    purposeLabel: string
    valueLabel: string
    items: Array<Numbered & { title: string; purpose: string; value: string }>
    callout: string | null
    principles: { label: string; items: Array<Numbered & { lead: string; body: string }> }
  }
  close: SlideHead & {
    subtitle: string
    blocks: Array<{ label: string; items: string[] }>
    expertise: { label: string; items: string[] }
  }
  footer: string
  missing: string[]
  deck: DeckFile
}

export type CaseStatus = {
  key: CaseStatusKey
  label: string
  classification: string | null
  aiReviewDate: string | null
  clientSignoff: boolean
  externalUseAllowed: boolean
  logoPermission: boolean
  openQuestions: number
  hasPlaceholders: boolean
}

export type CaseRecord = {
  id: string
  client: string
  title: string
  anonymised: boolean
  eyebrow: string
  summary: string
  summaryField: string
  sector: string
  serviceLine: string | null
  engagementType: string | null
  engagementTypeInferred: boolean
  capabilities: string[]
  technologies: string[]
  status: CaseStatus
  recordPath: string
  updated: string
  readMinutes: number
  formats: { onePager?: OnePager; longForm?: LongForm }
}

export type CaseCatalogue = {
  mode: 'local-preview' | 'hosted'
  generatedFrom: string
  warning: string
  cases: CaseRecord[]
}

export const statusShort = {
  external: 'External use recorded',
  'ai-reviewed': 'AI-reviewed',
  'human-reviewed': 'Human-reviewed',
  draft: 'Draft',
} satisfies Record<CaseStatusKey, string>

export function findCase(catalogue: CaseCatalogue, id: string | undefined) {
  return catalogue.cases.find((record) => record.id === id)
}

// Decks come from /api/decks on the same origin: the dev server locally, and the FSP site's
// server after sign-in, which is why they are fetched with a token rather than linked.
export function deckHref(deck: DeckFile) {
  return `${import.meta.env.BASE_URL}${deck.url}`
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toDate(value: string) {
  // A bare date is a calendar day, not UTC midnight, so it must not shift with the timezone.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value)
}

export function formatDate(value: string) {
  const date = toDate(value)
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDay(value: string) {
  const date = toDate(value)
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}`
}

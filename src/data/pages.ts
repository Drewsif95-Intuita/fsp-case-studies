import pageCatalog from './page-catalog.json'

export type PageCategory = 'overview' | 'case-study' | 'product' | 'campaign'
export type LibraryFilter = 'all' | PageCategory
export type Audience = 'Anonymised' | 'Internal' | 'Product'

export type PageOwner = {
  name: string
  initials: string
}

export type PageCatalogItem = {
  sourceFile: string
  slug: string
  routePath: string
  assetFile?: string
  productKey?: string
  label: string
  title: string
  fullTitle?: string
  shortTitle: string
  category: PageCategory
  template?: string
  sector?: string
  description: string
  summary?: string
  tags?: string[]
  readMinutes?: number
  updated?: string
  audience?: Audience
  owner?: PageOwner
  order: number
}

export type LibraryPage = Omit<
  PageCatalogItem,
  'fullTitle' | 'summary' | 'tags' | 'readMinutes' | 'updated' | 'audience' | 'owner'
> & {
  assetPath?: string
  fullTitle: string
  summary: string
  tags: string[]
  readMinutes: number
  updated: string
  audience: Audience
  owner: PageOwner
  sectorLabel: string
  sectorKey: string
}

export type LegacyPage = LibraryPage & {
  assetFile: string
  assetPath: string
}

export const categoryLabels = {
  overview: 'Overview',
  'case-study': 'Case studies',
  product: 'Products',
  campaign: 'Campaign assets',
} satisfies Record<PageCategory, string>

const defaultOwner: PageOwner = {
  name: 'FSP Data and AI',
  initials: 'FSP',
}

const catalog = pageCatalog as PageCatalogItem[]
const assetBasePath = import.meta.env.BASE_URL

function toKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function defaultAudience(category: PageCategory): Audience {
  if (category === 'product') return 'Product'
  return category === 'case-study' ? 'Anonymised' : 'Internal'
}

function defaultReadMinutes(category: PageCategory) {
  if (category === 'overview') return 12
  if (category === 'campaign') return 11
  if (category === 'product') return 6
  return 8
}

function buildTags(page: PageCatalogItem, sectorLabel: string) {
  const tags = page.tags ?? [page.template, sectorLabel]
  return tags.filter((tag): tag is string => Boolean(tag))
}

export const pages: LibraryPage[] = catalog
  .map((page) => {
    const sectorLabel = page.sector ?? categoryLabels[page.category]

    return {
      ...page,
      assetPath: page.assetFile
        ? `${assetBasePath}legacy-pages/${page.assetFile}`
        : undefined,
      fullTitle: page.fullTitle ?? page.title,
      summary: page.summary ?? page.description,
      tags: buildTags(page, sectorLabel),
      readMinutes: page.readMinutes ?? defaultReadMinutes(page.category),
      updated: page.updated ?? 'May 2026',
      audience: page.audience ?? defaultAudience(page.category),
      owner: page.owner ?? defaultOwner,
      sectorLabel,
      sectorKey: toKey(sectorLabel),
    }
  })
  .sort((left, right) => left.order - right.order)

export const caseStudies = pages.filter((page) => page.category === 'case-study')
export const productPages = pages.filter((page) => page.category === 'product')
export const campaignPages = pages.filter((page) => page.category === 'campaign')

export const templateNames = Array.from(
  new Set(caseStudies.map((page) => page.template).filter(Boolean)),
)

export const sectorFilters = [
  { label: 'All sectors', value: 'all' },
  ...Array.from(new Set(pages.map((page) => page.sectorLabel))).map((sector) => ({
    label: sector,
    value: toKey(sector),
  })),
]

export const libraryFilters = [
  { label: 'All', value: 'all' },
  ...Object.entries(categoryLabels).map(([value, label]) => ({
    label,
    value: value as PageCategory,
  })),
] satisfies Array<{ label: string; value: LibraryFilter }>

export function findPageBySlug(slug: string | undefined) {
  return pages.find((page) => page.slug === slug)
}

export function findPageBySourceFile(sourceFile: string) {
  return pages.find((page) => page.sourceFile === sourceFile)
}

export function isLegacyPage(page: LibraryPage): page is LegacyPage {
  return Boolean(page.assetFile && page.assetPath)
}

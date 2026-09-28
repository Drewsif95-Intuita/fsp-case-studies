import pageCatalog from 'virtual:page-catalog'
import {
  formatDay,
  statusShort,
  type CaseCatalogue,
  type CaseRecord,
  type CaseStatusKey,
} from './cases'

export type PageCategory = 'overview' | 'case-study' | 'legacy' | 'product' | 'campaign'
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
  // Set only on pages generated from a case record.
  client?: string
  caseId?: string
  formats?: string[]
  statusKey?: CaseStatusKey
  statusLabel?: string
}

export type LegacyPage = LibraryPage & {
  assetFile: string
  assetPath: string
}

export type Library = {
  pages: LibraryPage[]
  caseStudies: LibraryPage[]
  legacyPages: LibraryPage[]
  productPages: LibraryPage[]
  campaignPages: LibraryPage[]
  engagementTypes: string[]
  sectorFilters: Array<{ label: string; value: string }>
  libraryFilters: Array<{ label: string; value: LibraryFilter }>
  findPageByRoute: (pathname: string) => LibraryPage | undefined
  findPageBySourceFile: (sourceFile: string) => LibraryPage | undefined
}

export const categoryLabels = {
  overview: 'Overview',
  'case-study': 'Case studies',
  legacy: 'Legacy pages',
  product: 'Products',
  campaign: 'Campaign assets',
} satisfies Record<PageCategory, string>

const defaultOwner: PageOwner = {
  name: 'FSP Data and AI',
  initials: 'FSP',
}

const assetBasePath = import.meta.env.BASE_URL

export function toKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function defaultAudience(category: PageCategory): Audience {
  if (category === 'product') return 'Product'
  return category === 'legacy' ? 'Anonymised' : 'Internal'
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

const formatLabels = { onePager: 'One-pager', longForm: 'Long form' } as const

function casePage(record: CaseRecord, order: number): LibraryPage {
  const formats = (['onePager', 'longForm'] as const)
    .filter((key) => record.formats[key])
    .map((key) => formatLabels[key])

  return {
    sourceFile: record.recordPath,
    slug: record.id,
    routePath: `/cases/${record.id}`,
    label: `${record.client} case study`,
    title: record.title,
    fullTitle: `${record.client}: ${record.title}`,
    shortTitle: record.title,
    category: 'case-study',
    template: record.engagementType ?? undefined,
    sector: record.sector,
    description: record.summary,
    summary: record.summary,
    tags: [...formats, ...record.technologies, ...record.capabilities],
    readMinutes: record.readMinutes,
    updated: formatDay(record.updated),
    audience: 'Internal',
    owner: defaultOwner,
    order,
    sectorLabel: record.sector,
    sectorKey: toKey(record.sector),
    client: record.client,
    caseId: record.id,
    formats,
    statusKey: record.status.key,
    statusLabel: statusShort[record.status.key],
  }
}

// Product, legacy and campaign pages are fixed at build time; a hosted build keeps only products.
const catalogPages: LibraryPage[] = (pageCatalog as PageCatalogItem[])
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

export function buildLibrary(catalogue: CaseCatalogue): Library {
  // Most recently changed records first, so the activity rail shows current work.
  const casePages = [...catalogue.cases]
    .sort(
      (left, right) =>
        right.updated.localeCompare(left.updated) || left.client.localeCompare(right.client),
    )
    .map(casePage)
  const pages = [...casePages, ...catalogPages]
  const caseStudies = pages.filter((page) => page.category === 'case-study')

  // One option per key: legacy and generated pages can spell the same sector differently.
  const sectorOptions = new Map<string, string>()
  for (const page of pages) {
    if (!sectorOptions.has(page.sectorKey)) sectorOptions.set(page.sectorKey, page.sectorLabel)
  }

  return {
    pages,
    caseStudies,
    legacyPages: pages.filter((page) => page.category === 'legacy'),
    productPages: pages.filter((page) => page.category === 'product'),
    campaignPages: pages.filter((page) => page.category === 'campaign'),
    engagementTypes: Array.from(
      new Set(caseStudies.map((page) => page.template).filter((type): type is string => Boolean(type))),
    ),
    sectorFilters: [
      { label: 'All sectors', value: 'all' },
      ...Array.from(sectorOptions, ([value, label]) => ({ label, value })).sort(
        (left, right) =>
          Number(left.value === 'unclassified') - Number(right.value === 'unclassified') ||
          left.label.localeCompare(right.label),
      ),
    ],
    // Only the kinds of page this build carries, so the FSP site offers no empty filters.
    libraryFilters: [
      { label: 'All', value: 'all' },
      ...Object.entries(categoryLabels)
        .filter(([value]) => pages.some((page) => page.category === value))
        .map(([value, label]) => ({ label, value: value as PageCategory })),
    ],
    findPageByRoute: (pathname) => pages.find((page) => page.routePath === pathname),
    findPageBySourceFile: (sourceFile) => pages.find((page) => page.sourceFile === sourceFile),
  }
}

export function isLegacyPage(page: LibraryPage): page is LegacyPage {
  return Boolean(page.assetFile && page.assetPath)
}

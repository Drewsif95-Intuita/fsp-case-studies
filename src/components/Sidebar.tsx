import { ChevronRight, Home, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLibrary } from '../data/library'
import type { LibraryPage } from '../data/pages'

const sectionCap = 8

type SidebarProps = {
  currentPage?: LibraryPage
  onNavigate: () => void
}

type SectionKey = 'cases' | 'legacy' | 'products' | 'campaigns'

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { catalogue, library } = useLibrary()
  const { pages, caseStudies, legacyPages, productPages, campaignPages } = library
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    cases: true,
    legacy: false,
    products: true,
    campaigns: true,
  })

  const normalisedQuery = query.trim().toLowerCase()
  const matches = (page: LibraryPage) => {
    if (!normalisedQuery) return true
    const searchable = [
      page.client,
      page.shortTitle,
      page.title,
      page.description,
      page.sectorLabel,
      page.template,
      ...page.tags,
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(normalisedQuery)
  }

  const groups = {
    cases: caseStudies.filter(matches),
    legacy: legacyPages.filter(matches),
    products: productPages.filter(matches),
    campaigns: campaignPages.filter(matches),
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  return (
    <aside className="sidebar" id="site-rail" aria-label="Library navigation">
      <label className="side-search">
        <Search size={13} aria-hidden="true" />
        <span className="sr-only">Search this hub</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this hub..."
        />
      </label>

      <NavLink className="nav-item" to="/" end onClick={onNavigate}>
        <Home size={15} aria-hidden="true" />
        <span className="nav-label">Library</span>
        <span className="nav-count">{pages.length}</span>
      </NavLink>

      <NavSection
        count={caseStudies.length}
        label="Case studies"
        open={openSections.cases}
        onToggle={() => toggleSection('cases')}
      >
        {groups.cases.length > 0 ? (
          groups.cases
            .slice(0, sectionCap)
            .map((page) => <NavPage key={page.sourceFile} page={page} onNavigate={onNavigate} />)
        ) : (
          <EmptyState />
        )}
        {groups.cases.length > sectionCap ? (
          <Link className="nav-more" to="/" onClick={onNavigate}>
            +{groups.cases.length - sectionCap} more in Library
          </Link>
        ) : null}
      </NavSection>

      <NavSection
        count={legacyPages.length}
        label="Legacy pages"
        open={openSections.legacy}
        onToggle={() => toggleSection('legacy')}
      >
        {groups.legacy.length > 0 ? (
          groups.legacy.map((page) => (
            <NavPage key={page.sourceFile} page={page} onNavigate={onNavigate} />
          ))
        ) : (
          <EmptyState />
        )}
      </NavSection>

      <NavSection
        count={productPages.length}
        label="Products"
        open={openSections.products}
        onToggle={() => toggleSection('products')}
      >
        {groups.products.length > 0 ? (
          groups.products.map((page) => (
            <NavPage key={page.sourceFile} page={page} onNavigate={onNavigate} />
          ))
        ) : (
          <EmptyState />
        )}
      </NavSection>

      <NavSection
        count={campaignPages.length}
        label="Campaigns"
        open={openSections.campaigns}
        onToggle={() => toggleSection('campaigns')}
      >
        {groups.campaigns.length > 0 ? (
          groups.campaigns
            .slice(0, sectionCap)
            .map((page) => <NavPage key={page.sourceFile} page={page} onNavigate={onNavigate} />)
        ) : (
          <EmptyState />
        )}
      </NavSection>

      <div className="sidebar-foot">
        <div className="sidebar-foot__title">
          {currentPage?.client ?? currentPage?.shortTitle ?? 'Library'}
        </div>
        <div>
          {catalogue.mode === 'hosted'
            ? 'FSP internal - built from case records'
            : 'Local preview - built from case records'}
        </div>
      </div>
    </aside>
  )
}

type NavSectionProps = {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function NavSection({ label, count, open, onToggle, children }: NavSectionProps) {
  // A build without legacy or campaign pages shows no heading for them.
  if (count === 0) return null

  return (
    <div className="nav-group">
      <button className="nav-section-head" type="button" onClick={onToggle} aria-expanded={open}>
        <ChevronRight
          className="caret"
          size={13}
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
          aria-hidden="true"
        />
        <span className="label">{label}</span>
        <span className="count">{count}</span>
      </button>
      {open ? <div className="nav-section-body">{children}</div> : null}
    </div>
  )
}

function NavPage({ page, onNavigate }: { page: LibraryPage; onNavigate: () => void }) {
  // Several engagements share a client, so a case row names both.
  if (page.client) {
    return (
      <NavLink className="nav-case" to={page.routePath} title={page.fullTitle} onClick={onNavigate}>
        <span className="stack">
          <span className="title">{page.client}</span>
          <span className="sub">{page.shortTitle}</span>
        </span>
      </NavLink>
    )
  }

  return (
    <NavLink className="nav-case" to={page.routePath} onClick={onNavigate}>
      <span className="row-main">
        <span className="title">{page.shortTitle}</span>
      </span>
      <span className="sector">{page.sectorLabel}</span>
    </NavLink>
  )
}

function EmptyState() {
  return <div className="nav-empty">No matches</div>
}

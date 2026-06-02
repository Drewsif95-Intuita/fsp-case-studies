import { ChevronLeft, ChevronRight, Home, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  campaignPages,
  caseStudies,
  pages,
  productPages,
  type LibraryPage,
} from '../data/pages'

const sectionCap = 8

type SidebarProps = {
  currentPage?: LibraryPage
  collapsed: boolean
  onToggleCollapsed: () => void
}

type SectionKey = 'cases' | 'products' | 'campaigns'

export function Sidebar({ currentPage, collapsed, onToggleCollapsed }: SidebarProps) {
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    cases: true,
    products: true,
    campaigns: true,
  })

  const normalisedQuery = query.trim().toLowerCase()
  const matches = (page: LibraryPage) => {
    if (!normalisedQuery) return true
    const searchable = [
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
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <Link className="brand" to="/" aria-label="FSP Case Study Hub home">
        <span className="brand-mark" aria-hidden="true">
          FSP
        </span>
        <span className="brand-copy">
          <span className="brand-name">Case Study Hub</span>
          <span className="brand-sub">Data and AI</span>
        </span>
      </Link>

      <button
        className="sidebar-toggle"
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={15} aria-hidden="true" />
        ) : (
          <ChevronLeft size={15} aria-hidden="true" />
        )}
      </button>

      <NavLink className="nav-item" to="/" end>
        <Home size={15} aria-hidden="true" />
        <span className="nav-label">Library</span>
        <span className="nav-count">{pages.length}</span>
      </NavLink>

      <label className="side-search">
        <Search size={12} aria-hidden="true" />
        <span className="sr-only">Search this hub</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this hub..."
        />
      </label>

      <NavSection
        count={caseStudies.length}
        label="Case studies"
        open={openSections.cases}
        onToggle={() => toggleSection('cases')}
      >
        {groups.cases.length > 0 ? (
          groups.cases.slice(0, sectionCap).map((page) => <NavPage key={page.sourceFile} page={page} />)
        ) : (
          <EmptyState />
        )}
        {groups.cases.length > sectionCap ? (
          <Link className="nav-more" to="/">
            +{groups.cases.length - sectionCap} more in Library
          </Link>
        ) : null}
      </NavSection>

      <NavSection
        count={productPages.length}
        label="Products"
        open={openSections.products}
        onToggle={() => toggleSection('products')}
      >
        {groups.products.length > 0 ? (
          groups.products.map((page) => <NavPage key={page.sourceFile} page={page} />)
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
          groups.campaigns.slice(0, sectionCap).map((page) => <NavPage key={page.sourceFile} page={page} />)
        ) : (
          <EmptyState />
        )}
      </NavSection>

      <div className="sidebar-foot">
        <span className="dot" aria-hidden="true" />
        <div>
          <div className="sidebar-foot__title">{currentPage?.shortTitle ?? 'Library'}</div>
          <div>Internal preview - Azure Static Web Apps</div>
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
  return (
    <div className="nav-group">
      <button className="nav-section-head" type="button" onClick={onToggle}>
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

function NavPage({ page }: { page: LibraryPage }) {
  return (
    <NavLink className="nav-case" to={page.routePath}>
      <span className="row-main">
        <span className={`sector-dot ${page.sectorKey}`} aria-hidden="true" />
        <span className="title">{page.shortTitle}</span>
      </span>
      <span className="sector">{page.sectorLabel}</span>
    </NavLink>
  )
}

function EmptyState() {
  return <div className="nav-empty">No matches</div>
}

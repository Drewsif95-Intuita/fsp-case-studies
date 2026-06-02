import { ArrowRight, BookOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  campaignPages,
  caseStudies,
  categoryLabels,
  libraryFilters,
  pages,
  sectorFilters,
  templateNames,
  productPages,
  type LibraryPage,
  type LibraryFilter,
} from '../data/pages'

export function LibraryDashboard() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all')
  const [activeSector, setActiveSector] = useState('all')

  const filteredPages = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()

    return pages.filter((page) => {
      const matchesFilter =
        activeFilter === 'all' || page.category === activeFilter
      const matchesSector =
        activeSector === 'all' || page.sectorKey === activeSector
      const searchable = [
        page.title,
        page.fullTitle,
        page.shortTitle,
        page.description,
        page.summary,
        page.sectorLabel,
        page.template,
        page.label,
        ...page.tags,
      ]
        .join(' ')
        .toLowerCase()

      return matchesFilter && matchesSector && searchable.includes(searchTerm)
    })
  }, [activeFilter, activeSector, query])

  const recentPages = pages.slice(0, 4)

  return (
    <main className="library">
      <div className="lib-header">
        <div>
          <h1 className="lib-title">Library</h1>
          <p className="lib-sub">
            FSP Data and AI case studies, product offers, and campaign assets in one shareable hub.
          </p>
        </div>
        <Link className="btn" to="/bundle">
          <BookOpen size={13} aria-hidden="true" />
          Open bundle
        </Link>
      </div>

      <div className="stat-chips" aria-label="Library summary">
        <StatChip active={activeFilter === 'all'} label="All" value={pages.length} onClick={() => setActiveFilter('all')} />
        <StatChip
          active={activeFilter === 'case-study'}
          label="Case studies"
          value={caseStudies.length}
          onClick={() => setActiveFilter('case-study')}
        />
        <StatChip
          active={activeFilter === 'product'}
          label="Products"
          value={productPages.length}
          onClick={() => setActiveFilter('product')}
        />
        <StatChip
          active={activeFilter === 'campaign'}
          label="Campaigns"
          value={campaignPages.length}
          onClick={() => setActiveFilter('campaign')}
        />
        <StatChip label="Templates" value={templateNames.length} />
      </div>

      <div className="section-head">
        <h3>Recent activity</h3>
      </div>
      <div className="recent">
        {recentPages.map((page) => (
          <Link key={page.sourceFile} className="recent-card" to={page.routePath}>
            <div className="who">Recently reviewed</div>
            <div className="what">{page.shortTitle}</div>
            <div className="when">Updated {page.updated}</div>
          </Link>
        ))}
      </div>

      <div className="section-head all-pages-head">
        <h3>All pages</h3>
        <span className="result-count">
          Showing {filteredPages.length} of {pages.length}
        </span>
      </div>

      <div className="toolbar">
        <label className="search">
          <Search size={13} aria-hidden="true" />
          <span className="sr-only">Search by client, sector, or theme</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by client, sector, or theme..."
          />
        </label>

        <div className="filter-row" aria-label="Page type">
          {libraryFilters.map((option) => (
            <button
              key={option.value}
              className={activeFilter === option.value ? 'active' : ''}
              type="button"
              onClick={() => setActiveFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="filter-row" aria-label="Sector">
          {sectorFilters.map((option) => (
            <button
              key={option.value}
              className={activeSector === option.value ? 'active' : ''}
              type="button"
              onClick={() => setActiveSector(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cards">
        {filteredPages.map((page) => (
          <PageCard key={page.sourceFile} page={page} />
        ))}
      </div>
    </main>
  )
}

type StatChipProps = {
  active?: boolean
  label: string
  value: number
  onClick?: () => void
}

function StatChip({ active = false, label, value, onClick }: StatChipProps) {
  return (
    <button
      className={`stat-chip ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="n">{value}</span>
      {label}
    </button>
  )
}

function PageCard({ page }: { page: LibraryPage }) {
  const categoryLabel = categoryLabels[page.category]

  return (
    <Link className="card" to={page.routePath}>
      <div className="card-meta">
        <span className={`sector-dot ${page.sectorKey}`} aria-hidden="true" />
        <span>{page.sectorLabel}</span>
        <span className="dot-sep">.</span>
        <span>{page.readMinutes} min read</span>
        <span className="dot-sep">.</span>
        <span>Updated {page.updated}</span>
        <span className="card-pill">{page.audience}</span>
      </div>
      <h3 className="card-title">{page.shortTitle}</h3>
      <p className="card-desc">{page.description}</p>
      <div className="card-foot">
        <div className="card-tags">
          <span className="tag">{categoryLabel}</span>
          {page.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <span className="card-open">
          Open
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

import { ArrowRight, BookOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../data/library'
import { categoryLabels, type LibraryPage, type LibraryFilter } from '../data/pages'

export function LibraryDashboard() {
  const { catalogue, library } = useLibrary()
  const {
    pages,
    caseStudies,
    legacyPages,
    productPages,
    campaignPages,
    engagementTypes,
    sectorFilters,
    libraryFilters,
  } = library
  const hosted = catalogue.mode === 'hosted'
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
        page.client,
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
  }, [activeFilter, activeSector, pages, query])

  const recentPages = pages.slice(0, 4)

  return (
    <main className="library">
      <header className="lib-hero">
        <div>
          <p className="eyebrow eyebrow--line">FSP · Case study library</p>
          <h1 className="lib-title">Case studies</h1>
          <div className="lib-rule" aria-hidden="true" />
          <p className="lib-sub">
            Each engagement's case study, generated from its case record, with the decks to
            download.{' '}
            {hosted
              ? 'Product offers sit alongside.'
              : 'Product offers and campaign assets sit alongside.'}
          </p>
        </div>
        {library.findPageByRoute('/bundle') ? (
          <Link className="btn" to="/bundle">
            <BookOpen size={14} aria-hidden="true" />
            Legacy bundle
          </Link>
        ) : null}
      </header>

      <div className="callout" role="note">
        <div>
          <p className="eyebrow">{hosted ? 'FSP internal' : 'Local preview'}</p>
          {hosted ? (
            <p>
              For FSP colleagues. These case studies are AI-reviewed internal drafts. None is
              cleared for external use unless its page says so, so check the status before sharing
              anything outside FSP.
            </p>
          ) : (
            <p>
              Case pages are built from <code>{catalogue.generatedFrom}</code> and include internal
              drafts. Nothing here is cleared for external use unless its status says so.
            </p>
          )}
        </div>
      </div>

      <div className="stat-chips" aria-label="Library summary">
        <StatChip active={activeFilter === 'all'} label="All" value={pages.length} onClick={() => setActiveFilter('all')} />
        <StatChip
          active={activeFilter === 'case-study'}
          label="Case studies"
          value={caseStudies.length}
          onClick={() => setActiveFilter('case-study')}
        />
        {legacyPages.length > 0 ? (
          <StatChip
            active={activeFilter === 'legacy'}
            label="Legacy pages"
            value={legacyPages.length}
            onClick={() => setActiveFilter('legacy')}
          />
        ) : null}
        {productPages.length > 0 ? (
          <StatChip
            active={activeFilter === 'product'}
            label="Products"
            value={productPages.length}
            onClick={() => setActiveFilter('product')}
          />
        ) : null}
        {campaignPages.length > 0 ? (
          <StatChip
            active={activeFilter === 'campaign'}
            label="Campaigns"
            value={campaignPages.length}
            onClick={() => setActiveFilter('campaign')}
          />
        ) : null}
        <StatChip label="Engagement types" value={engagementTypes.length} />
      </div>

      <section aria-labelledby="recent-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Case records</p>
            <h2 id="recent-heading">Recently changed</h2>
          </div>
        </div>
        <div className="recent">
          {recentPages.map((page) => (
            <Link key={page.sourceFile} className="recent-card" to={page.routePath}>
              <div className="who">{page.client ?? categoryLabels[page.category]}</div>
              <div className="what">{page.shortTitle}</div>
              <div className="when">Updated {page.updated}</div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="all-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">Browse</p>
            <h2 id="all-heading">All pages</h2>
          </div>
          <span className="result-count">
            Showing {filteredPages.length} of {pages.length}
          </span>
        </div>

        <div className="toolbar">
          <label className="search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search by client, sector, technology or theme</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by client, sector, technology or theme..."
            />
          </label>

          <div className="filter-group">
            <span className="filter-label" id="type-filter">Type</span>
            <div className="filter-row" aria-labelledby="type-filter">
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
          </div>

          <div className="filter-group">
            <span className="filter-label" id="sector-filter">Sector</span>
            <div className="filter-row" aria-labelledby="sector-filter">
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
        </div>

        <div className="cards">
          {filteredPages.map((page) => (
            <PageCard key={page.sourceFile} page={page} />
          ))}
        </div>
      </section>
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
  // A generated case lists the decks it has; other pages keep their category and first tags.
  const tags = page.formats ?? [categoryLabels[page.category], ...page.tags.slice(0, 2)]

  return (
    <Link className="card" to={page.routePath}>
      <div className="card-meta">
        <span className={`sector-dot ${page.sectorKey}`} aria-hidden="true" />
        <span>{page.sectorLabel}</span>
        {page.statusKey ? (
          <span className={`status-badge status-${page.statusKey}`}>{page.statusLabel}</span>
        ) : (
          <span className="card-pill">{page.audience}</span>
        )}
      </div>
      {page.client ? <div className="card-client">{page.client}</div> : null}
      <h3 className="card-title">{page.shortTitle}</h3>
      <p className="card-desc">{page.description}</p>
      <p className="card-when">
        Updated {page.updated}
        <span className="dot-sep" aria-hidden="true">
          ·
        </span>
        {page.readMinutes} min read
      </p>
      <div className="card-foot">
        <div className="card-tags">
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <span className="card-open">
          Open
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

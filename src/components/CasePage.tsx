import { AlertTriangle, FileDown, Layers } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLibrary } from '../data/library'
import {
  deckHref,
  formatBytes,
  formatDate,
  statusShort,
  type CaseRecord,
  type DeckFile,
  type LongForm,
  type LongFormModel,
  type OnePager,
} from '../data/cases'
import { toKey } from '../data/pages'

type FormatKey = 'one-pager' | 'long-form'

const formatNames: Record<FormatKey, string> = {
  'one-pager': 'One-pager',
  'long-form': 'Long form',
}

type CasePageProps = {
  record: CaseRecord
}

// Every string on this page comes from the case record's deck.* slots, the same copy the PPTX
// carries. The page arranges it; it never adds a claim.
export function CasePage({ record }: CasePageProps) {
  const { catalogue } = useLibrary()
  const [params, setParams] = useSearchParams()
  const { onePager, longForm } = record.formats

  const available: FormatKey[] = []
  if (onePager) available.push('one-pager')
  if (longForm) available.push('long-form')

  const requested = params.get('format') as FormatKey | null
  const view = requested && available.includes(requested) ? requested : available[0]
  const active = view === 'one-pager' ? onePager : longForm

  useEffect(() => {
    document.title = `${record.client}: ${record.title} | FSP Case Study Hub`
  }, [record.client, record.title])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [record.id])

  function choose(format: FormatKey) {
    setParams(format === available[0] ? {} : { format }, { replace: true })
  }

  return (
    <main className="case-page">
      <section className="case-hero">
        <div className="case-hero__copy">
          <p className="eyebrow eyebrow--line">{record.eyebrow}</p>
          <p className="case-hero__client">{record.client}</p>
          <h1>
            <Copy text={record.title} />
          </h1>
          <p className="case-hero__summary">
            <Copy text={record.summary} />
          </p>
          <ul className="case-facts" aria-label="Classification">
            <li>
              <span className={`sector-dot ${toKey(record.sector)}`} aria-hidden="true" />
              {record.sector}
            </li>
            {record.engagementType ? (
              <li>
                {record.engagementType}
                {record.engagementTypeInferred ? <span className="inferred">inferred</span> : null}
              </li>
            ) : null}
            {record.serviceLine ? <li>{record.serviceLine}</li> : null}
            <li>{record.readMinutes} min read</li>
          </ul>
          <div className="case-downloads" aria-label="Download the decks">
            {onePager ? <DeckButton label="One-pager" deck={onePager.deck} primary /> : null}
            {longForm ? (
              <DeckButton label="Long form" deck={longForm.deck} primary={!onePager} />
            ) : null}
          </div>
        </div>
        <StatusPanel record={record} />
      </section>

      <div className="case-body">
        {record.status.hasPlaceholders ? (
          <Notice>
            This record still carries [NEEDS DATA] placeholders. It is a draft and must not be
            represented as externally ready.
          </Notice>
        ) : null}
        {active && active.missing.length > 0 ? (
          <Notice tone="alert">
            {active.missing.length} line{active.missing.length === 1 ? '' : 's'} on this page{' '}
            {active.missing.length === 1 ? 'is' : 'are'} not in the built {formatNames[view].toLowerCase()}{' '}
            deck. The record has probably changed since the deck was built. Rebuild it with{' '}
            <code>python scripts/build_case.py {record.id}</code>.
            <details>
              <summary>Show the lines</summary>
              <ul>
                {active.missing.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </details>
          </Notice>
        ) : null}

        <div className="case-body__bar">
          {available.length > 1 ? (
            <div className="format-switch" role="group" aria-label="Deck format">
              {available.map((format) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={view === format}
                  onClick={() => choose(format)}
                >
                  {formatNames[format]}
                </button>
              ))}
            </div>
          ) : (
            <span className="format-single">{formatNames[view]}</span>
          )}
          <p className="format-note">
            The copy in the {formatNames[view].toLowerCase()} PPTX, in slide order.
          </p>
        </div>

        {view === 'one-pager' && onePager ? <OnePagerView data={onePager} /> : null}
        {view === 'long-form' && longForm ? <LongFormView data={longForm} /> : null}

        {catalogue.mode === 'hosted' ? null : (
          <p className="case-source">
            Generated from <code>{record.recordPath}</code>. Decks are in{' '}
            <code>cases/{record.id}/outputs/</code>.
          </p>
        )}
      </div>
    </main>
  )
}

function StatusPanel({ record }: { record: CaseRecord }) {
  const status = record.status
  const rows: Array<[string, string]> = [
    ['Classification', status.classification ?? 'Not recorded'],
    ['AI review', status.aiReviewDate ? formatDate(status.aiReviewDate) : 'Not recorded'],
    ['Client sign-off', status.clientSignoff ? 'Recorded' : 'Not recorded'],
    ['External use', status.externalUseAllowed ? 'Allowed' : 'Not allowed'],
    ['Logo permission', status.logoPermission ? 'Recorded' : 'Not recorded'],
    ['Open questions', String(status.openQuestions)],
  ]

  return (
    <aside className="case-status" aria-label="Review and permission status">
      <span className={`status-badge status-${status.key}`}>{statusShort[status.key]}</span>
      <p className="case-status__text">{status.label}.</p>
      <dl className="case-status__list">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

type DownloadState = 'idle' | 'busy' | 'failed'

// On the FSP site a deck is only released to a signed-in request, and a plain link cannot carry
// the token, so the file is fetched and then saved from memory.
function useDeckDownload(deck: DeckFile) {
  const { session } = useLibrary()
  const [state, setState] = useState<DownloadState>('idle')

  async function download() {
    setState('busy')
    try {
      const response = await session.api(deckHref(deck))
      if (!response.ok) throw new Error(`Deck request returned ${response.status}`)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = deck.file
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setState('idle')
    } catch {
      setState('failed')
    }
  }

  return { state, download }
}

function DeckButton({ label, deck, primary }: { label: string; deck: DeckFile; primary: boolean }) {
  const { state, download } = useDeckDownload(deck)
  const detail =
    state === 'busy'
      ? 'Downloading…'
      : state === 'failed'
        ? 'Download failed. Try again'
        : `PPTX · ${formatBytes(deck.bytes)}`

  return (
    <button
      className={`deck-download ${primary ? '' : 'deck-download--secondary'}`}
      type="button"
      onClick={download}
      disabled={state === 'busy'}
      title={deck.file}
    >
      <FileDown size={17} aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        <small aria-live="polite">{detail}</small>
      </span>
    </button>
  )
}

function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'alert'; children: ReactNode }) {
  return (
    <div className={`case-notice ${tone}`} role="note">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

const placeholder = /(\[needs data[^\]]*\])/gi

// Placeholders stay visible, so a draft cannot pass for finished copy.
function Copy({ text }: { text: string }) {
  const parts = text.split(placeholder)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="needs-data">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Bullets({ items, className = 'dot-list' }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={index}>
          <Copy text={item} />
        </li>
      ))}
    </ul>
  )
}

function Tags({ items, tone }: { items: string[]; tone?: 'strong' | 'dark' }) {
  return (
    <div className="tag-row">
      {items.map((item, index) => (
        <span key={index} className={`tag ${tone ?? ''}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

function OnePagerView({ data }: { data: OnePager }) {
  return (
    <article className="op-sheet" aria-label="One-pager">
      <div className="op-main">
        <div>
          <p className="eyebrow">{data.eyebrow}</p>
          <h2 className="op-title">
            <Copy text={data.title} />
          </h2>
          <p className="op-caps">{data.capabilities.join('  ·  ')}</p>
        </div>
        <section>
          <h3 className="op-label">{data.situation.label}</h3>
          <p className="op-text">
            <Copy text={data.situation.text} />
          </p>
        </section>
        <section>
          <h3 className="op-label">{data.did.label}</h3>
          <Bullets items={data.did.items} />
        </section>
        <section>
          <h3 className="op-label">{data.delivered.label}</h3>
          <div className="op-cards">
            {data.delivered.items.map((item, index) => (
              <div key={index} className="op-card">
                <h4>
                  <Copy text={item.heading} />
                </h4>
                <p>
                  <Copy text={item.body} />
                </p>
              </div>
            ))}
          </div>
        </section>
        <p className="op-tags">{data.footerTags.join('  ·  ')}</p>
      </div>
      <aside className="op-panel">
        {data.hero.mode === 'figure' ? (
          <div className="op-hero op-hero--figure">
            <strong>{data.hero.value}</strong>
            <span>{data.hero.label}</span>
          </div>
        ) : (
          <p className="op-hero op-hero--statement">
            <Copy text={data.hero.text} />
          </p>
        )}
        <h3 className="op-label">{data.why.label}</h3>
        <p className="op-why">
          <Copy text={data.why.text} />
        </p>
      </aside>
      <footer className="sheet-footer">{data.footer}</footer>
    </article>
  )
}

type SlideProps = {
  page: string
  kicker: string
  title: string
  subtitle?: string
  dark?: boolean
  children: ReactNode
}

function Slide({ page, kicker, title, subtitle, dark = false, children }: SlideProps) {
  return (
    <section className={`lf-slide ${dark ? 'lf-slide--dark' : ''}`}>
      <header className="lf-slide__head">
        <span className="lf-slide__page" aria-label={`Slide ${page}`}>
          {page}
        </span>
        <p className="eyebrow">{kicker}</p>
        <h2>
          <Copy text={title} />
        </h2>
        {subtitle ? (
          <p className="lf-slide__subtitle">
            <Copy text={subtitle} />
          </p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function LongFormView({ data }: { data: LongForm }) {
  const { cover, about, approach, model, products, close } = data

  return (
    <article className="lf" aria-label="Long form">
      <div className="lf-cover">
        <span className="lf-cover__page">01</span>
        <p className="eyebrow">{cover.eyebrow}</p>
        <p className="lf-cover__title">
          {cover.lines.map((line, index) => (
            <span key={index}>
              <Copy text={line} />
            </span>
          ))}
        </p>
      </div>

      <Slide page={about.page} kicker={about.kicker} title={about.title}>
        <div className="lf-about">
          <div className="lf-about__main">
            <div>
              <h3 className="lf-label">{about.ambition.label}</h3>
              {about.ambition.paragraphs.map((paragraph, index) => (
                <p key={index} className="lf-text">
                  <Copy text={paragraph} />
                </p>
              ))}
            </div>
            <div>
              <h3 className="lf-label">{about.challenges.label}</h3>
              <ul className="dot-list">
                {about.challenges.items.map((item, index) => (
                  <li key={index}>
                    <strong>
                      <Copy text={item.lead} />
                    </strong>{' '}
                    <Copy text={item.body} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <aside className="lf-profile">
            <h3>{about.profile.label}</h3>
            {about.profile.paragraphs.map((paragraph, index) => (
              <p key={index}>
                <Copy text={paragraph} />
              </p>
            ))}
          </aside>
        </div>
      </Slide>

      <Slide
        page={approach.page}
        kicker={approach.kicker}
        title={approach.title}
        subtitle={approach.subtitle}
      >
        <div className="lf-columns">
          {approach.columns.map((column, index) => (
            <section key={index} className="lf-column">
              <h3>{column.label}</h3>
              <Bullets items={column.items} />
            </section>
          ))}
        </div>
        <div className="lf-taxonomy">
          <section className="lf-tag-group">
            <h3>{approach.scope.label}</h3>
            {approach.scope.rows.map((row, index) => (
              <Tags key={index} items={row} />
            ))}
          </section>
          <section className="lf-tag-group">
            <h3>{approach.outcome.label}</h3>
            {approach.outcome.rows.map((row, index) => (
              <Tags key={index} items={row} tone="strong" />
            ))}
          </section>
        </div>
      </Slide>

      <Slide page={model.page} kicker={model.kicker} title={model.title}>
        {model.diagram ? <DiagramNotice page={model.page} deck={data.deck} /> : <Model model={model} />}
      </Slide>

      <Slide
        page={products.page}
        kicker={products.kicker}
        title={products.title}
        subtitle={products.subtitle}
      >
        <div className="lf-products">
          {products.items.map((product, index) => (
            <section key={index} className="lf-product">
              <header className={`lf-product__head ${product.number ? 'is-numbered' : ''}`}>
                {product.number ? <span className="lf-product__n">{product.number}</span> : null}
                <h3>
                  <Copy text={product.title} />
                </h3>
                {index === 0 && products.callout ? (
                  <span className="lf-callout">{products.callout}</span>
                ) : null}
              </header>
              <p>
                <span className="lf-lead">{products.purposeLabel}</span>
                <Copy text={product.purpose} />
              </p>
              <p>
                <span className="lf-lead">{products.valueLabel}</span>
                <Copy text={product.value} />
              </p>
            </section>
          ))}
        </div>
        <div className="lf-principles">
          <h3>{products.principles.label}</h3>
          <div className="lf-principles__grid">
            {products.principles.items.map((principle, index) => (
              <p key={index}>
                {principle.number ? (
                  <span className="lf-principle__n">{principle.number}</span>
                ) : null}
                <strong>
                  <Copy text={principle.lead} />
                </strong>{' '}
                <Copy text={principle.body} />
              </p>
            ))}
          </div>
        </div>
      </Slide>

      <Slide
        page={close.page}
        kicker={close.kicker}
        title={close.title}
        subtitle={close.subtitle}
        dark
      >
        <div className="lf-close">
          {close.blocks.map((block, index) => (
            <section key={index}>
              <h3>{block.label}</h3>
              <Bullets items={block.items} />
            </section>
          ))}
        </div>
        <div className="lf-expertise">
          <h3>{close.expertise.label}</h3>
          <Tags items={close.expertise.items} tone="dark" />
        </div>
      </Slide>

      <footer className="sheet-footer sheet-footer--standalone">{data.footer}</footer>
    </article>
  )
}

function Model({ model }: { model: LongFormModel }) {
  return (
    <>
      {model.stages ? (
        <ol className="lf-stages">
          {model.stages.map((stage, index) => (
            <li key={index} className="lf-stage">
              <h3>{stage.label}</h3>
              <ul>
                {stage.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pill">
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}
      {model.tech ? (
        <div className="lf-tech">
          <h3>{model.tech.label}</h3>
          <ol className="lf-chain">
            {model.tech.chain.map((step, index) => (
              <li key={index}>
                <span>{step.label}</span>
                <strong>{step.value}</strong>
              </li>
            ))}
          </ol>
          <Tags items={model.tech.tags} />
        </div>
      ) : null}
      {model.principle ? (
        <p className="lf-principle">
          <strong>
            <Copy text={model.principle.lead} />
          </strong>{' '}
          <Copy text={model.principle.body} />
        </p>
      ) : null}
    </>
  )
}

function DiagramNotice({ page, deck }: { page: string; deck: DeckFile }) {
  const { state, download } = useDeckDownload(deck)

  return (
    <div className="lf-diagram-note">
      <Layers size={20} aria-hidden="true" />
      <div>
        <strong>This slide carries the source deck's own architecture diagram.</strong>
        <p>
          It is imported into the PPTX as a graphic, so it is not redrawn here. Open slide {page} of
          the long form to see it.
        </p>
        <button className="btn" type="button" onClick={download} disabled={state === 'busy'}>
          <FileDown size={14} aria-hidden="true" />
          {state === 'failed' ? 'Download failed. Try again' : 'Download long form'}
        </button>
      </div>
    </div>
  )
}

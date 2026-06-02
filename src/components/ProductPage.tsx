import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ChartNoAxesColumnIncreasing,
  CircleDot,
  Droplets,
  HeartPulse,
  Landmark,
  PawPrint,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  anomalySuite,
  findProductSuite,
  type ProductAnomaly,
  type ProductDefinition,
  type ProductIconKey,
} from '../data/products'
import type { LibraryPage } from '../data/pages'

type ProductPageProps = {
  page: LibraryPage
}

type WeightKey = 'severity' | 'context' | 'urgency'
type WeightSet = Record<WeightKey, number>

const productIcons: Record<ProductIconKey, LucideIcon> = {
  leak: Droplets,
  disease: HeartPulse,
  telecom: RadioTower,
  financial: Landmark,
  veterinary: PawPrint,
}

const pipelineStages = [
  'Signal ingestion',
  'Statistical check',
  'Context filter',
  'Scoring engine',
  'Triage grade',
  'Routed action',
]

const weightLabels: Array<{ key: WeightKey; label: string }> = [
  { key: 'severity', label: 'Severity' },
  { key: 'context', label: 'Context' },
  { key: 'urgency', label: 'Urgency' },
]

export function ProductPage({ page }: ProductPageProps) {
  const suite = findProductSuite(page.productKey) ?? anomalySuite
  const originalDemoPath = `${import.meta.env.BASE_URL}product-demos/anomaly-intelligence-original.html`
  const [activeProductId, setActiveProductId] = useState(suite.products[0].id)
  const demoSectionRef = useRef<HTMLElement>(null)
  const activeProduct =
    suite.products.find((product) => product.id === activeProductId) ??
    suite.products[0]
  const [weights, setWeights] = useState<WeightSet>(() =>
    createWeights(suite.products[0]),
  )
  const [entityIndex, setEntityIndex] = useState(0)
  const [dashboardTime, setDashboardTime] = useState(formatDashboardTime)

  useEffect(() => {
    document.title = `${page.shortTitle} | FSP Case Study Hub`
  }, [page.shortTitle])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDashboardTime(formatDashboardTime())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (window.location.hash === '#operator-dashboard') {
      window.requestAnimationFrame(() => {
        document.querySelector('#operator-dashboard')?.scrollIntoView({
          block: 'start',
        })
      })
    }
  }, [])

  const activeEntity =
    activeProduct.entities[entityIndex % activeProduct.entities.length]

  const rankedAnomalies = activeProduct.anomalies
    .map((anomaly) => ({
      ...anomaly,
      weightedScore: calculateScore(anomaly, weights),
      dominant: dominantDimension(anomaly),
    }))
    .sort((left, right) => right.weightedScore - left.weightedScore)

  function updateWeight(key: WeightKey, value: number) {
    setWeights((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function selectProduct(product: ProductDefinition) {
    setActiveProductId(product.id)
    setWeights(createWeights(product))
    setEntityIndex(0)
  }

  function openProductDemo(product: ProductDefinition) {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    }
    selectProduct(product)
    window.requestAnimationFrame(() => {
      demoSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <main className="product-page">
      <section className="product-hero">
        <div className="product-hero__copy">
          <p className="eyebrow">{suite.eyebrow}</p>
          <h1>{suite.name}</h1>
          <p>{suite.summary}</p>
          <div className="product-hero__stats" aria-label="Product suite summary">
            <Metric value={suite.products.length.toString()} label="Products" />
            <Metric value="5" label="Industries" />
            <Metric value="1" label="Shared engine" />
          </div>
        </div>
      </section>

      <section className="product-catalogue" aria-labelledby="product-catalogue-heading">
        <div className="product-section-head">
          <p className="eyebrow">Product suite</p>
          <h2 id="product-catalogue-heading">Five products. Each built for one problem.</h2>
          <p>
            Select a product below to load its demo, alert feed, and operator
            dashboard. Each is independently deployable: not a module of a
            platform, but a complete solution.
          </p>
          <a
            className="source-demo-link"
            href={originalDemoPath}
            target="_blank"
            rel="noreferrer"
          >
            Open original source demo
            <ArrowRight size={13} aria-hidden="true" />
          </a>
        </div>
        <div className="product-catalogue-grid">
          {suite.products.map((product) => (
            <ProductCatalogueCard
              key={product.id}
              product={product}
              active={product.id === activeProduct.id}
              onOpenDemo={() => openProductDemo(product)}
            />
          ))}
        </div>
      </section>

      <section ref={demoSectionRef} className="product-workbench" aria-label="Product workbench">
        <div className="workbench-main">
          <div className="workbench-panel product-profile">
            <div className="panel-kicker">Active product</div>
            <div className="product-profile__title">
              <ProductIcon product={activeProduct} />
              <div>
                <h2>{activeProduct.name}</h2>
                <p>{activeProduct.market}</p>
              </div>
            </div>
            <p className="product-promise">{activeProduct.promise}</p>
            <div className="entity-card">
              <div>
                <div className="entity-card__label">Observed entity</div>
                <h3>{activeEntity.name}</h3>
                <p>{activeEntity.meta}</p>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() =>
                  setEntityIndex((current) =>
                    (current + 1) % activeProduct.entities.length,
                  )
                }
                aria-label="Switch entity"
                title="Switch entity"
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="signal-list">
              {activeEntity.signals.map((signal) => (
                <div
                  key={`${activeEntity.name}-${signal.label}`}
                  className={`signal-row ${signal.status ?? 'neutral'}`}
                >
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="workbench-panel scoring-card">
            <div className="panel-kicker">Scoring blend</div>
            <div className="scoring-card__head">
              <h2>Weighted priority</h2>
              <SlidersHorizontal size={18} aria-hidden="true" />
            </div>
            <div className="weight-controls">
              {weightLabels.map(({ key, label }) => (
                <label key={key} className="weight-control">
                  <span>
                    {label}
                    <strong>{weights[key]}</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights[key]}
                    onChange={(event) =>
                      updateWeight(key, Number(event.currentTarget.value))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="weight-summary">
              {weightLabels.map(({ key, label }) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{weightShare(weights, key)}%</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="workbench-panel anomaly-queue">
            <div className="panel-kicker">Prioritised anomalies</div>
            <div className="anomaly-list">
              {rankedAnomalies.map((anomaly, index) => (
                <AnomalyRow
                  key={anomaly.title}
                  anomaly={anomaly}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="product-dashboard">
          <div className="pipeline-card">
            <div className="panel-kicker">Alert pipeline</div>
            <div className="pipeline-grid">
              {pipelineStages.map((stage, index) => (
                <div
                  key={stage}
                  className={`pipeline-step ${index === 3 ? 'active' : ''}`}
                >
                  <CircleDot size={14} aria-hidden="true" />
                  <span>{stage}</span>
                  <strong>{activeProduct.pipeline[index]}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="metric-grid">
            {activeProduct.metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
            ))}
          </div>

          <div className="product-detail-grid">
            <DetailPanel
              icon={<Users size={16} aria-hidden="true" />}
              title="Primary users"
              body={activeProduct.primaryUsers}
            />
            <DetailPanel
              icon={<ChartNoAxesColumnIncreasing size={16} aria-hidden="true" />}
              title="Signal feeds"
              body={activeProduct.signals}
            />
            <DetailPanel
              icon={<ShieldCheck size={16} aria-hidden="true" />}
              title="Guardrails"
              body={activeProduct.guardrails}
            />
            <DetailPanel
              icon={<Bell size={16} aria-hidden="true" />}
              title="Default routing"
              body={rankedAnomalies[0].route}
            />
          </div>
        </div>
      </section>

      <OperatorDashboard product={activeProduct} timestamp={dashboardTime} />
      <ProductDetailSection products={suite.products} />
    </main>
  )
}

function ProductDetailSection({ products }: { products: ProductDefinition[] }) {
  return (
    <section
      id="product-detail"
      className="product-detail-section"
      aria-labelledby="product-detail-heading"
    >
      <div className="product-section-head">
        <p className="eyebrow">05 - product detail</p>
        <h2 id="product-detail-heading">Each product. Configured for its industry.</h2>
        <p>
          Signal feeds, regulatory guardrails, default weight blends, and
          primary users are pre-packaged per product. The shared scoring engine
          is invisible to the operator.
        </p>
      </div>

      <div className="product-config-grid">
        {products.map((product) => (
          <article key={product.id} className="product-config-card">
            <div className="product-config-card__head">
              <ProductIcon product={product} />
              <div>
                <h3>
                  intuita <span>{product.name}</span>
                </h3>
                <p>{product.market}</p>
              </div>
            </div>

            <ProductConfigItem label="Primary users" body={product.primaryUsers} />
            <ProductConfigItem label="Signal connectors" body={product.signals} />
            <ProductConfigItem label="Regulatory guardrails" body={product.guardrails} />

            <div className="product-config-card__blend">
              <span>Pre-configured weight blend</span>
              <strong>{product.defaultWeightLabel}</strong>
            </div>

            <div className="product-config-card__deploy">
              <strong>Deployment:</strong> {product.deployTime}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProductConfigItem({ label, body }: { label: string; body: string }) {
  return (
    <div className="product-config-item">
      <span>{label}</span>
      <p>{body}</p>
    </div>
  )
}

function OperatorDashboard({
  product,
  timestamp,
}: {
  product: ProductDefinition
  timestamp: string
}) {
  const dashboard = product.dashboard
  const maxSparkValue = Math.max(
    1,
    ...dashboard.sparkSeries.flatMap((series) => series.bars),
  )
  const lanes: Array<'critical' | 'high' | 'medium' | 'low'> = [
    'critical',
    'high',
    'medium',
    'low',
  ]

  return (
    <section
      id="operator-dashboard"
      className="operator-dashboard-section"
      aria-labelledby="operator-dashboard-heading"
    >
      <div className="product-section-head">
        <p className="eyebrow">04 - operator dashboard</p>
        <h2 id="operator-dashboard-heading">Product dashboard - operator view.</h2>
        <p>
          Every Intuita product ships with a pre-configured operator dashboard.
          KPIs, alert swimlanes, trend charts, and resolution metrics are tuned
          to the terminology and rhythms of each industry.
        </p>
      </div>

      <div className="operator-dashboard-shell">
        <div className="operator-dashboard-chrome">
          <div className="operator-dashboard-chrome__left">
            <span className="chrome-dot chrome-dot--red" aria-hidden="true" />
            <span className="chrome-dot chrome-dot--amber" aria-hidden="true" />
            <span className="chrome-dot chrome-dot--green" aria-hidden="true" />
            <span className="dashboard-live-dot" aria-hidden="true" />
            <span>
              intuita anomaly engine - {dashboard.label} - Operator Dashboard
            </span>
          </div>
          <span>Last updated {timestamp}</span>
        </div>

        <div className="operator-dashboard-body">
          <div className="dashboard-kpi-row">
            {dashboard.kpis.map((kpi) => (
              <div key={kpi.label} className={`dashboard-kpi-card tone-${kpi.tone}`}>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.delta}</small>
                <SparkBars
                  bars={[40, 55, 45, 60, 50, 70, 65, 75]}
                  maxValue={100}
                  tone="neutral"
                  compact
                />
              </div>
            ))}
          </div>

          <div className="operator-dashboard-main">
            <div className="dashboard-panel dashboard-panel--swimlane">
              <div className="dashboard-panel-title">Alert status board - by severity</div>
              <div className="dashboard-swimlane-board">
                {lanes.map((lane) => {
                  const laneAlerts = product.anomalies.filter(
                    (anomaly) => scoreBand(anomaly.alertScore ?? 0) === lane,
                  )

                  return (
                    <div key={lane} className="dashboard-swimlane-row">
                      <div className={`dashboard-swimlane-label tone-${lane}`}>
                        {lane}
                      </div>
                      <div className="dashboard-swimlane-lane">
                        {laneAlerts.length > 0 ? (
                          laneAlerts.map((anomaly) => (
                            <article
                              key={anomaly.id ?? anomaly.title}
                              className={`dashboard-swimlane-card tone-${lane}`}
                              title={anomaly.summary}
                            >
                              <strong>{anomaly.id}</strong>
                              <span>{anomaly.title}</span>
                            </article>
                          ))
                        ) : (
                          <span className="dashboard-empty-lane">No {lane} alerts</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="dashboard-right-rail">
              <div className="dashboard-panel">
                <div className="dashboard-panel-title">Alert volume - last 8 periods</div>
                <div className="dashboard-spark-series">
                  {dashboard.sparkSeries.map((series) => (
                    <div key={series.label} className="dashboard-spark-row">
                      <span>{series.label}</span>
                      <SparkBars
                        bars={series.bars}
                        maxValue={maxSparkValue}
                        tone={series.tone}
                      />
                    </div>
                  ))}
                  <div className="dashboard-spark-labels">
                    {dashboard.sparkLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-title">Alert frequency heatmap</div>
                <div className="dashboard-heatmap">
                  <span aria-hidden="true" />
                  {dashboard.heatmapColLabels.map((label) => (
                    <span key={label} className="dashboard-heatmap-label">
                      {label}
                    </span>
                  ))}
                  {dashboard.heatmap.map((row, rowIndex) => (
                    <FragmentRow
                      key={dashboard.heatmapRowLabels[rowIndex]}
                      row={row}
                      rowLabel={dashboard.heatmapRowLabels[rowIndex]}
                    />
                  ))}
                </div>
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-title">Resolution time (MTTR)</div>
                <div className="dashboard-mttr-row">
                  <DashboardMttr value={dashboard.mttr.critical} label="Critical" tone="critical" />
                  <DashboardMttr value={dashboard.mttr.high} label="High" tone="high" />
                  <DashboardMttr value={dashboard.mttr.medium} label="Medium" tone="medium" />
                </div>
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-title">Alert status breakdown</div>
                <DashboardDonut segments={dashboard.statusBreakdown} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SparkBars({
  bars,
  maxValue,
  tone,
  compact,
}: {
  bars: number[]
  maxValue: number
  tone: 'critical' | 'high' | 'medium' | 'neutral'
  compact?: boolean
}) {
  return (
    <div className={`dashboard-spark-bars ${compact ? 'is-compact' : ''}`}>
      {bars.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={`tone-${tone}`}
          style={{ height: `${Math.max(12, Math.round((value / maxValue) * 100))}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function FragmentRow({ row, rowLabel }: { row: number[]; rowLabel: string }) {
  return (
    <>
      <span className="dashboard-heatmap-row-label">{rowLabel.split('-')[0]}</span>
      {row.map((value, index) => (
        <span
          key={`${rowLabel}-${index}`}
          className={`dashboard-heatmap-cell heat-${value}`}
          title={`${rowLabel} - ${value} alerts`}
          aria-label={`${rowLabel}, ${value} alerts`}
        />
      ))}
    </>
  )
}

function DashboardMttr({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: 'critical' | 'high' | 'medium'
}) {
  return (
    <div className="dashboard-mttr-card">
      <strong className={`tone-${tone}`}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function DashboardDonut({
  segments,
}: {
  segments: ProductDefinition['dashboard']['statusBreakdown']
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  const donutSegments = segments.reduce(
    (current, segment) => {
      const angle = (segment.count / total) * 360
      const path = describeDonutSegment(
        40,
        40,
        32,
        current.offset,
        current.offset + angle,
      )

      return {
        offset: current.offset + angle,
        paths: [...current.paths, { ...segment, path }],
      }
    },
    {
      offset: -90,
      paths: [] as Array<(typeof segments)[number] & { path: string }>,
    },
  ).paths

  return (
    <div className="dashboard-donut-wrap">
      <svg className="dashboard-donut" viewBox="0 0 80 80" aria-hidden="true">
        {donutSegments.map((segment) => (
          <path
            key={segment.label}
            className={`dashboard-donut-segment tone-${segment.tone}`}
            d={segment.path}
          />
        ))}
        <circle cx="40" cy="40" r="18" className="dashboard-donut-hole" />
        <text x="40" y="45" textAnchor="middle" className="dashboard-donut-total">
          {total}
        </text>
      </svg>
      <div className="dashboard-donut-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="dashboard-donut-legend-item">
            <span className={`tone-${segment.tone}`} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong>{segment.count}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function describeDonutSegment(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function ProductCatalogueCard({
  product,
  active,
  onOpenDemo,
}: {
  product: ProductDefinition
  active: boolean
  onOpenDemo: () => void
}) {
  return (
    <button
      className={`product-catalogue-card ${active ? 'active' : ''}`}
      type="button"
      onClick={onOpenDemo}
      aria-pressed={active}
    >
      <span className="product-catalogue-card__top">
        <span className={`product-vertical product-vertical--${product.id}`}>
          {product.vertical}
        </span>
        {active ? <span className="product-active-badge">Active</span> : null}
      </span>

      <span className="product-catalogue-card__name">
        <ProductIcon product={product} />
        <strong>
          intuita <span>{product.name}</span>
        </strong>
      </span>

      <span className="product-catalogue-card__tagline">
        {product.catalogueTagline}
      </span>

      <span className="product-feature-list">
        {product.features.map((feature) => (
          <span key={feature} className="product-feature-item">
            <span aria-hidden="true" />
            {feature}
          </span>
        ))}
      </span>

      <span className="product-catalogue-card__meta">
        <span>
          <strong>Default weights:</strong> {product.defaultWeightLabel}
        </span>
        <span>
          <strong>Users:</strong> {product.users}
        </span>
        <span>
          <strong>Deploy:</strong> {product.deployTime}
        </span>
      </span>

      <span className="product-catalogue-card__cta">
        View demo
        <ArrowRight size={13} aria-hidden="true" />
      </span>
    </button>
  )
}

function ProductIcon({ product }: { product: ProductDefinition }) {
  const Icon = productIcons[product.id]
  return (
    <span className={`product-icon product-icon--${product.id}`}>
      <Icon size={18} aria-hidden="true" />
    </span>
  )
}

function AnomalyRow({
  anomaly,
  rank,
}: {
  anomaly: ProductAnomaly & { weightedScore: number; dominant: WeightKey }
  rank: number
}) {
  return (
    <article className={`anomaly-row ${rank === 1 ? 'top' : ''}`}>
      <div className="anomaly-rank">{rank}</div>
      <div>
        <div className="anomaly-row__head">
          <h3>{anomaly.title}</h3>
          <span>{anomaly.weightedScore}</span>
        </div>
        <p>{anomaly.summary}</p>
        <div className="anomaly-row__foot">
          <span>
            <AlertTriangle size={12} aria-hidden="true" />
            {dimensionLabel(anomaly.dominant)} led
          </span>
          <span>
            {anomaly.route}
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  )
}

function DetailPanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="detail-panel">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function calculateScore(anomaly: ProductAnomaly, weights: WeightSet) {
  const total = weights.severity + weights.context + weights.urgency || 1
  return Math.round(
    (anomaly.score.severity * weights.severity +
      anomaly.score.context * weights.context +
      anomaly.score.urgency * weights.urgency) /
      total,
  )
}

function createWeights(product: ProductDefinition): WeightSet {
  return { ...product.defaultWeights }
}

function dominantDimension(anomaly: ProductAnomaly): WeightKey {
  const entries = Object.entries(anomaly.score) as Array<[WeightKey, number]>
  return entries.sort((left, right) => right[1] - left[1])[0][0]
}

function dimensionLabel(key: WeightKey) {
  if (key === 'severity') return 'Severity'
  if (key === 'context') return 'Context'
  return 'Urgency'
}

function weightShare(weights: WeightSet, key: WeightKey) {
  const total = weights.severity + weights.context + weights.urgency || 1
  return Math.round((weights[key] / total) * 100)
}

function scoreBand(score: number) {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function formatDashboardTime() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
}

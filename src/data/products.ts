export type ProductIconKey =
  | 'leak'
  | 'disease'
  | 'telecom'
  | 'financial'
  | 'veterinary'

export type SignalStatus = 'alert' | 'warn' | 'good' | 'neutral'

export type ProductSignal = {
  label: string
  value: string
  status?: SignalStatus
}

export type ProductEntity = {
  name: string
  meta: string
  signals: ProductSignal[]
}

export type ProductAnomaly = {
  id?: string
  title: string
  summary: string
  route: string
  status?: 'escalated' | 'assigned' | 'monitoring' | 'resolved'
  alertScore?: number
  score: {
    severity: number
    context: number
    urgency: number
  }
}

export type ProductDashboard = {
  label: string
  kpis: Array<{
    label: string
    value: string
    delta: string
    tone: 'critical' | 'high' | 'medium' | 'neutral'
  }>
  sparkSeries: Array<{
    label: string
    bars: number[]
    tone: 'critical' | 'high' | 'medium'
  }>
  sparkLabels: string[]
  heatmap: number[][]
  heatmapRowLabels: string[]
  heatmapColLabels: string[]
  mttr: {
    critical: string
    high: string
    medium: string
  }
  statusBreakdown: Array<{
    label: string
    count: number
    tone: 'critical' | 'high' | 'medium' | 'neutral'
  }>
}

export type ProductDefinition = {
  id: ProductIconKey
  name: string
  vertical: string
  market: string
  tagline: string
  catalogueTagline: string
  features: string[]
  defaultWeightLabel: string
  users: string
  deployTime: string
  promise: string
  primaryUsers: string
  signals: string
  guardrails: string
  defaultWeights: {
    severity: number
    context: number
    urgency: number
  }
  pipeline: string[]
  metrics: Array<{
    label: string
    value: string
    detail: string
  }>
  dashboard: ProductDashboard
  entities: ProductEntity[]
  anomalies: ProductAnomaly[]
}

export type ProductSuite = {
  slug: string
  name: string
  eyebrow: string
  headline: string
  summary: string
  products: ProductDefinition[]
}

export const anomalySuite: ProductSuite = {
  slug: 'anomaly-intelligence',
  name: 'Anomaly Intelligence',
  eyebrow: 'Product suite',
  headline: 'Purpose-built anomaly detection for operational teams.',
  summary:
    'A productised anomaly detection offer with industry-specific signals, scoring weights, guardrails, alert routing, and operator dashboards configured around one problem at a time.',
  products: [
    {
      id: 'leak',
      name: 'LeakSense',
      vertical: 'Water and gas networks',
      market: 'Water and gas networks',
      tagline:
        'Real-time burst and leakage detection for distribution networks. Prioritised alerts from pressure, acoustic, and flow signals before customers notice.',
      catalogueTagline:
        'Real-time burst and leakage detection for distribution networks. Prioritised alerts from pressure, acoustic, and flow signals before customers notice.',
      features: [
        'Pre-configured for Ofwat performance commitment reporting',
        'Pressure drop, acoustic logger, and DMA night-flow signal connectors',
        'Vulnerable customer impact scoring built in',
        'Field crew dispatch integration ready on day one',
      ],
      defaultWeightLabel: '50% Severity - 25% Context - 25% Urgency',
      users: 'Network operations - Field dispatch',
      deployTime: '~2 weeks to first alert',
      promise:
        'Turns network telemetry into a ranked queue for field teams, balancing operational severity with customer and regulatory context.',
      primaryUsers: 'Network operations controller, field engineer dispatcher',
      signals:
        'Pressure sensors, acoustic loggers, flow meters, smart meter DMA, customer reports',
      guardrails:
        'Performance commitments, resilience targets, vulnerable customer protection',
      defaultWeights: { severity: 50, context: 25, urgency: 25 },
      pipeline: ['184k signals', '2.8k checks', '312 qualified', '46 scored', '18 alerts', '12 routed'],
      metrics: [
        { label: 'Open alerts', value: '18', detail: '6 critical' },
        { label: 'Field routes', value: '12', detail: 'Ready for dispatch' },
        { label: 'Mean time to triage', value: '11m', detail: 'From signal to route' },
        { label: 'Network zones', value: '42', detail: 'Live monitored areas' },
      ],
      dashboard: {
        label: 'Leak Detection',
        kpis: [
          { label: 'Critical alerts', value: '2', delta: '+1 vs yesterday', tone: 'critical' },
          { label: 'High alerts', value: '1', delta: '-1 vs yesterday', tone: 'high' },
          { label: 'Signals ingested', value: '847', delta: '+12% vs avg', tone: 'neutral' },
          { label: 'Avg score', value: '62', delta: '+4 pts vs last wk', tone: 'neutral' },
          { label: 'Pipe coverage', value: '94%', delta: 'Sensor uptime', tone: 'medium' },
        ],
        sparkSeries: [
          { label: 'Critical', bars: [1, 0, 2, 1, 0, 3, 1, 2], tone: 'critical' },
          { label: 'High', bars: [2, 1, 1, 2, 2, 1, 2, 1], tone: 'high' },
          { label: 'Medium', bars: [3, 2, 4, 2, 3, 2, 3, 2], tone: 'medium' },
        ],
        sparkLabels: ['-7d', '-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
        heatmap: [
          [1, 0, 2, 1, 0, 1, 0],
          [0, 1, 1, 2, 1, 0, 0],
          [2, 1, 0, 1, 1, 2, 1],
          [1, 2, 3, 2, 1, 1, 0],
        ],
        heatmapRowLabels: ['00-06', '06-12', '12-18', '18-24'],
        heatmapColLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        mttr: { critical: '1.8h', high: '6.4h', medium: '38h' },
        statusBreakdown: [
          { label: 'Escalated', count: 2, tone: 'critical' },
          { label: 'Assigned', count: 1, tone: 'high' },
          { label: 'Monitoring', count: 2, tone: 'medium' },
          { label: 'Resolved', count: 14, tone: 'neutral' },
        ],
      },
      entities: [
        {
          name: 'Zone 4B - Northern Grid',
          meta: 'Distribution main - 180mm cast iron - 1972',
          signals: [
            { label: 'Pressure drop (24h)', value: '-18%', status: 'alert' },
            { label: 'Flow anomaly score', value: '87/100', status: 'alert' },
            { label: 'Last inspection', value: '14 months ago', status: 'warn' },
            { label: 'Pipe age', value: '52 years', status: 'warn' },
            { label: 'Soil type', value: 'Clay, corrosive', status: 'neutral' },
          ],
        },
        {
          name: 'Industrial Feeder 7',
          meta: 'High-pressure trunk - steel - 2005',
          signals: [
            { label: 'Pressure deviation', value: 'Stable', status: 'good' },
            { label: 'Acoustic sensor', value: 'Threshold breach', status: 'alert' },
            { label: 'Flow balance', value: '-3.2 m3/h', status: 'warn' },
            { label: 'Adjacent incidents', value: '2 nearby (30d)', status: 'warn' },
            { label: 'Customer impact', value: '14 industrial sites', status: 'neutral' },
          ],
        },
      ],
      anomalies: [
        {
          id: 'LK-0041',
          title: 'Burst - Zone 4B Northern Grid',
          summary:
            'Pressure drop and acoustic signal indicate a probable main burst requiring emergency excavation.',
          route: 'Emergency dispatch',
          status: 'escalated',
          alertScore: 93,
          score: { severity: 95, context: 70, urgency: 90 },
        },
        {
          id: 'LK-0042',
          title: 'Sustained micro-leak - Industrial Feeder 7',
          summary:
            'Acoustic threshold breach without pressure drop. Small bore pinhole leak suspected.',
          route: 'Network investigation',
          status: 'assigned',
          alertScore: 71,
          score: { severity: 65, context: 80, urgency: 55 },
        },
        {
          id: 'LK-0043',
          title: 'Customer-reported seepage - Loop 12C',
          summary:
            'Three damp patches reported in 48 hours. Possible joint failure on service connection.',
          route: 'Customer response',
          status: 'assigned',
          alertScore: 66,
          score: { severity: 55, context: 60, urgency: 70 },
        },
        {
          id: 'LK-0044',
          title: 'Night-flow elevation - Sector 9',
          summary:
            'Night flow 18% above seasonal baseline for five consecutive nights. Silent leak candidate.',
          route: 'Monitoring queue',
          status: 'monitoring',
          alertScore: 47,
          score: { severity: 45, context: 55, urgency: 40 },
        },
        {
          id: 'LK-0045',
          title: 'Smart meter imbalance - District C',
          summary:
            'District meter records 6% more than the sum of customer meters. Unaccounted water rising.',
          route: 'Scheduled review',
          status: 'monitoring',
          alertScore: 34,
          score: { severity: 35, context: 65, urgency: 30 },
        },
      ],
    },
    {
      id: 'disease',
      name: 'ClinicalRadar',
      vertical: 'NHS and primary care',
      market: 'Clinical and population health',
      tagline:
        'Population-level clinical anomaly detection for GP practices and community health teams. Surfaces deteriorating patients before crisis, not after.',
      catalogueTagline:
        'Population-level clinical anomaly detection for GP practices and community health teams. Surfaces deteriorating patients before crisis, not after.',
      features: [
        'NICE guideline pathway triggers built into scoring logic',
        'EHR connectors for SystmOne, EMIS, and Vision',
        'Deprivation and vulnerability contextualisation as standard',
        'DCB0129/0160 clinical safety documentation included',
      ],
      defaultWeightLabel: '20% Severity - 45% Context - 35% Urgency',
      users: 'GP - Community nurse - Care coordinator',
      deployTime: '~3 weeks including IG sign-off',
      promise:
        'Helps clinical and care teams spot the patients most likely to need intervention, with traceable scoring context.',
      primaryUsers: 'GP, community nurse, care coordinator, triage clinician',
      signals:
        'EHR vital trends, medication dispensing, appointment attendance, deprivation index, wearable data',
      guardrails:
        'Information governance, clinical safety, consent controls, escalation protocols',
      defaultWeights: { severity: 20, context: 45, urgency: 35 },
      pipeline: ['96k signals', '4.4k checks', '506 qualified', '58 scored', '21 alerts', '9 routed'],
      metrics: [
        { label: 'Open alerts', value: '21', detail: '9 same-day' },
        { label: 'Cohorts watched', value: '14', detail: 'Long-term conditions' },
        { label: 'Review queue', value: '58', detail: 'Clinician qualified' },
        { label: 'Care routes', value: '9', detail: 'Assigned today' },
      ],
      dashboard: {
        label: 'Disease Diagnostics',
        kpis: [
          { label: 'Critical alerts', value: '2', delta: '+2 vs yesterday', tone: 'critical' },
          { label: 'High alerts', value: '1', delta: 'Stable', tone: 'high' },
          { label: 'Patients monitored', value: '1,204', delta: 'Active panel', tone: 'neutral' },
          { label: 'Avg score', value: '63', delta: '+6 pts vs last wk', tone: 'neutral' },
          { label: 'Clinical coverage', value: '88%', delta: 'EHR connected', tone: 'medium' },
        ],
        sparkSeries: [
          { label: 'Critical', bars: [0, 1, 0, 1, 2, 1, 0, 2], tone: 'critical' },
          { label: 'High', bars: [1, 2, 1, 1, 0, 2, 1, 1], tone: 'high' },
          { label: 'Medium', bars: [4, 3, 5, 3, 4, 3, 4, 2], tone: 'medium' },
        ],
        sparkLabels: ['-7d', '-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
        heatmap: [
          [0, 0, 1, 0, 0, 0, 0],
          [1, 2, 2, 3, 2, 0, 0],
          [2, 3, 3, 2, 2, 1, 0],
          [1, 1, 1, 2, 1, 0, 0],
        ],
        heatmapRowLabels: ['00-06', '06-12', '12-18', '18-24'],
        heatmapColLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        mttr: { critical: '0.8h', high: '4.2h', medium: '48h' },
        statusBreakdown: [
          { label: 'Escalated', count: 2, tone: 'critical' },
          { label: 'Assigned', count: 1, tone: 'high' },
          { label: 'Monitoring', count: 2, tone: 'medium' },
          { label: 'Resolved', count: 22, tone: 'neutral' },
        ],
      },
      entities: [
        {
          name: 'Patient TM - Male, 58',
          meta: 'Type 2 diabetes - COPD - long-term condition register',
          signals: [
            { label: 'HbA1c latest', value: '82 mmol/mol rising', status: 'alert' },
            { label: 'SpO2 trend (7d)', value: 'Declining', status: 'alert' },
            { label: 'Missed reviews', value: '2 in 6 months', status: 'warn' },
            { label: 'Medication adherence', value: '-45%', status: 'alert' },
            { label: 'Deprivation decile', value: '2, high need', status: 'neutral' },
          ],
        },
        {
          name: 'Patient SB - Female, 34',
          meta: 'Pregnancy - 28 weeks - community midwifery',
          signals: [
            { label: 'Blood pressure', value: '156/104 mmHg', status: 'alert' },
            { label: 'Proteinuria', value: 'Positive', status: 'alert' },
            { label: 'Foetal movement', value: 'Reduced report', status: 'alert' },
            { label: 'BMI', value: '32, elevated risk', status: 'warn' },
            { label: 'Previous PE', value: 'No', status: 'good' },
          ],
        },
      ],
      anomalies: [
        {
          id: 'DX-0091',
          title: 'Pre-eclampsia - immediate obstetric review',
          summary:
            'Blood pressure, proteinuria, and reduced foetal movement combine into a same-day assessment route.',
          route: 'Clinical escalation',
          status: 'escalated',
          alertScore: 96,
          score: { severity: 96, context: 88, urgency: 98 },
        },
        {
          id: 'DX-0092',
          title: 'Post-op DVT/PE risk - Patient DH',
          summary:
            'Rising D-dimer and immobility on day five post-discharge indicate elevated clot risk.',
          route: 'Community review',
          status: 'escalated',
          alertScore: 88,
          score: { severity: 80, context: 75, urgency: 85 },
        },
        {
          id: 'DX-0093',
          title: 'Glycaemic deterioration - Patient TM',
          summary:
            'HbA1c, adherence, and missed review signals indicate need for structured intervention.',
          route: 'Care coordinator',
          status: 'assigned',
          alertScore: 74,
          score: { severity: 70, context: 90, urgency: 55 },
        },
        {
          id: 'DX-0094',
          title: 'COPD exacerbation risk - deprivation decile 2 cluster',
          summary:
            'SpO2 declining across a four-patient cohort entering winter. Proactive outreach indicated.',
          route: 'Practice nurse outreach',
          status: 'monitoring',
          alertScore: 58,
          score: { severity: 60, context: 80, urgency: 50 },
        },
        {
          id: 'DX-0095',
          title: 'Medication non-adherence cluster',
          summary:
            'Five patients show more than 40% adherence drop in 60 days. Pharmacy or social review indicated.',
          route: 'Practice review agenda',
          status: 'monitoring',
          alertScore: 39,
          score: { severity: 40, context: 85, urgency: 35 },
        },
      ],
    },
    {
      id: 'telecom',
      name: 'NetWatch',
      vertical: 'Telecoms and ISPs',
      market: 'Infrastructure and faults',
      tagline:
        'NOC-grade fault detection and capacity anomaly alerting for fixed and mobile operators. From cell outages to core router instability, ranked by real-world SLA impact.',
      catalogueTagline:
        'NOC-grade fault detection and capacity anomaly alerting for fixed and mobile operators. From cell outages to core router instability, ranked by real-world SLA impact.',
      features: [
        'SNMP, NetFlow, and vendor-native KPI connectors',
        'SLA penalty exposure scoring on every alert',
        'Ofcom resilience obligation flags pre-wired',
        'Adjacent-site load rebalancing recommendations built in',
      ],
      defaultWeightLabel: '40% Severity - 30% Context - 30% Urgency',
      users: 'NOC engineer - Field dispatch - Capacity planner',
      deployTime: '~2 weeks to live alert feed',
      promise:
        'Gives network teams one operational queue that blends service severity, customer impact, and failure trajectory.',
      primaryUsers: 'NOC engineer, field dispatch coordinator, capacity planner',
      signals:
        'SNMP/NetFlow telemetry, cell KPIs, customer tickets, SLA counters, weather correlation',
      guardrails:
        'Resilience obligations, SLA penalty exposure, emergency service priority',
      defaultWeights: { severity: 40, context: 30, urgency: 30 },
      pipeline: ['221k signals', '8.1k checks', '740 qualified', '94 scored', '32 alerts', '16 routed'],
      metrics: [
        { label: 'Open alerts', value: '32', detail: '11 critical' },
        { label: 'Sites affected', value: '47', detail: 'Across 6 regions' },
        { label: 'Customers at risk', value: '8.7k', detail: 'Estimated impact' },
        { label: 'SLA watch', value: '14', detail: 'Penalty exposure' },
      ],
      dashboard: {
        label: 'Telecom Network',
        kpis: [
          { label: 'Critical alerts', value: '2', delta: '+1 vs yesterday', tone: 'critical' },
          { label: 'High alerts', value: '1', delta: 'Stable', tone: 'high' },
          { label: 'Signals ingested', value: '2,341', delta: '+38% surge', tone: 'neutral' },
          { label: 'Avg score', value: '70', delta: '+9 pts elevated', tone: 'neutral' },
          { label: 'Network uptime', value: '99.1%', delta: '-0.8% today', tone: 'high' },
        ],
        sparkSeries: [
          { label: 'Critical', bars: [0, 1, 1, 0, 1, 2, 0, 2], tone: 'critical' },
          { label: 'High', bars: [1, 1, 2, 2, 1, 1, 2, 1], tone: 'high' },
          { label: 'Medium', bars: [2, 3, 2, 4, 3, 2, 3, 2], tone: 'medium' },
        ],
        sparkLabels: ['-7d', '-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
        heatmap: [
          [0, 1, 0, 0, 0, 1, 0],
          [1, 1, 2, 1, 1, 2, 1],
          [2, 3, 2, 3, 2, 1, 1],
          [3, 2, 4, 2, 3, 2, 1],
        ],
        heatmapRowLabels: ['00-06', '06-12', '12-18', '18-24'],
        heatmapColLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        mttr: { critical: '0.9h', high: '3.8h', medium: '12h' },
        statusBreakdown: [
          { label: 'Escalated', count: 2, tone: 'critical' },
          { label: 'Assigned', count: 1, tone: 'high' },
          { label: 'Monitoring', count: 2, tone: 'medium' },
          { label: 'Resolved', count: 31, tone: 'neutral' },
        ],
      },
      entities: [
        {
          name: 'Cell Site MAN-NE-047',
          meta: '4G/5G macro - Manchester NE - 3 sector',
          signals: [
            { label: 'Downtime (24h)', value: '3.2 hours', status: 'alert' },
            { label: 'Active users affected', value: '4,200', status: 'alert' },
            { label: 'Packet loss', value: '18.4%', status: 'alert' },
            { label: 'Backhaul latency', value: '+340ms above SLA', status: 'alert' },
            { label: 'Adjacent site load', value: 'Offloading now', status: 'warn' },
          ],
        },
        {
          name: 'Core Router CR-LDN-3',
          meta: 'BGP edge node - London DC - Tier-1 peering',
          signals: [
            { label: 'CPU utilisation', value: '91%, peak 95%', status: 'alert' },
            { label: 'BGP session flaps', value: '4 in 30 min', status: 'alert' },
            { label: 'Traffic volume', value: '+38% baseline', status: 'warn' },
            { label: 'Error rate', value: 'Normal', status: 'good' },
            { label: 'Redundancy path', value: 'Active', status: 'good' },
          ],
        },
      ],
      anomalies: [
        {
          id: 'NW-1101',
          title: 'Cell outage - MAN-NE-047',
          summary:
            'Three-hour downtime, 4,200 users, and high packet loss require emergency dispatch and load rebalancing.',
          route: 'NOC escalation',
          status: 'escalated',
          alertScore: 95,
          score: { severity: 95, context: 85, urgency: 90 },
        },
        {
          id: 'NW-1102',
          title: 'Core router instability - CR-LDN-3',
          summary:
            'BGP flaps and high CPU create risk of peering session drop affecting transit traffic.',
          route: 'Core network team',
          status: 'escalated',
          alertScore: 82,
          score: { severity: 80, context: 70, urgency: 85 },
        },
        {
          id: 'NW-1103',
          title: 'DSLAM sync storm - LDS-S-22',
          summary:
            'Sync error spike on FTTC exchange with hundreds of residential customers at risk.',
          route: 'Field engineering',
          status: 'assigned',
          alertScore: 65,
          score: { severity: 65, context: 60, urgency: 60 },
        },
        {
          id: 'NW-1104',
          title: 'Traffic surge - Northern region',
          summary:
            'Traffic running 38% above baseline on three nodes. Capacity threshold breach predicted within four hours.',
          route: 'Capacity planning',
          status: 'monitoring',
          alertScore: 58,
          score: { severity: 50, context: 75, urgency: 70 },
        },
        {
          id: 'NW-1105',
          title: 'Predictive - scheduled maintenance overdue',
          summary:
            'Eleven nodes beyond maintenance SLA correlate with three-times fault probability in the next 30 days.',
          route: 'Maintenance review',
          status: 'monitoring',
          alertScore: 36,
          score: { severity: 35, context: 80, urgency: 30 },
        },
      ],
    },
    {
      id: 'financial',
      name: 'SignalGuard',
      vertical: 'Financial services',
      market: 'Transactions and fraud',
      tagline:
        'Transaction anomaly and financial crime detection built for FCA-regulated firms. Card fraud, APP fraud, AML structuring, and Consumer Duty vulnerability flags in one prioritised feed.',
      catalogueTagline:
        'Transaction anomaly and financial crime detection built for FCA-regulated firms. Card fraud, APP fraud, AML structuring, and Consumer Duty vulnerability flags in one prioritised feed.',
      features: [
        'PSR APP fraud reimbursement clock integration',
        'FCA Consumer Duty vulnerability scoring as standard',
        'Real-time card block and CHAPS recall action hooks',
        'SAR compilation and MLRO routing pre-built',
      ],
      defaultWeightLabel: '45% Severity - 35% Context - 20% Urgency',
      users: 'Fraud analyst - Compliance - Relationship manager',
      deployTime: '~3 weeks including FCA notification',
      promise:
        'Helps analysts separate urgent customer harm and financial crime events from noisy model output.',
      primaryUsers: 'Fraud analyst, financial crime investigator, relationship manager, compliance officer',
      signals:
        'Transaction telemetry, device fingerprint, fraud scores, geo-velocity, beneficiary changes',
      guardrails:
        'Consumer Duty, strong authentication, fraud controls, reimbursement obligations',
      defaultWeights: { severity: 45, context: 35, urgency: 20 },
      pipeline: ['1.8m events', '26k checks', '1.9k qualified', '214 scored', '44 alerts', '19 routed'],
      metrics: [
        { label: 'Open alerts', value: '44', detail: '19 customer harm' },
        { label: 'Value at risk', value: 'GBP 1.4m', detail: 'Prevention queue' },
        { label: 'Callback routes', value: '17', detail: 'Awaiting customer' },
        { label: 'Model drift watch', value: '3', detail: 'Needs review' },
      ],
      dashboard: {
        label: 'Financial Services',
        kpis: [
          { label: 'Critical alerts', value: '2', delta: 'Stable', tone: 'critical' },
          { label: 'High alerts', value: '1', delta: '+1 vs yesterday', tone: 'high' },
          { label: 'Transactions monitored', value: '58,420', delta: 'Last 24h', tone: 'neutral' },
          { label: 'Avg score', value: '73', delta: '+11 pts elevated', tone: 'neutral' },
          { label: 'ML model accuracy', value: '91.4%', delta: 'FP rate +34%', tone: 'high' },
        ],
        sparkSeries: [
          { label: 'Critical', bars: [1, 2, 1, 2, 1, 0, 1, 2], tone: 'critical' },
          { label: 'High', bars: [2, 1, 2, 1, 2, 2, 1, 1], tone: 'high' },
          { label: 'Medium', bars: [3, 4, 3, 5, 3, 4, 3, 3], tone: 'medium' },
        ],
        sparkLabels: ['-7d', '-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
        heatmap: [
          [1, 0, 0, 0, 0, 1, 2],
          [2, 3, 2, 2, 2, 3, 2],
          [3, 4, 3, 4, 3, 2, 2],
          [2, 2, 2, 3, 2, 4, 3],
        ],
        heatmapRowLabels: ['00-06', '06-12', '12-18', '18-24'],
        heatmapColLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        mttr: { critical: '0.2h', high: '2.1h', medium: '24h' },
        statusBreakdown: [
          { label: 'Escalated', count: 2, tone: 'critical' },
          { label: 'Assigned', count: 1, tone: 'high' },
          { label: 'Monitoring', count: 2, tone: 'medium' },
          { label: 'Resolved', count: 48, tone: 'neutral' },
        ],
      },
      entities: [
        {
          name: 'Account ****7821',
          meta: 'Current account - retail - six-year tenure',
          signals: [
            { label: 'Velocity anomaly', value: '12 tx in 4 min', status: 'alert' },
            { label: 'Geo mismatch', value: 'UK to Brazil', status: 'alert' },
            { label: 'Fraud score', value: '94/100', status: 'alert' },
            { label: 'Device fingerprint', value: 'New device', status: 'warn' },
            { label: 'Customer contacted', value: 'No', status: 'neutral' },
          ],
        },
        {
          name: 'SME Redgate Trading Ltd',
          meta: 'Business current - GBP 340k monthly turnover',
          signals: [
            { label: 'CHAPS outflow', value: 'GBP 280k new payee', status: 'alert' },
            { label: 'Payee match', value: 'No previous history', status: 'alert' },
            { label: 'Director mandate', value: 'Single signatory', status: 'warn' },
            { label: 'IP origin', value: 'VPN detected', status: 'warn' },
            { label: 'AML risk rating', value: 'Medium', status: 'neutral' },
          ],
        },
      ],
      anomalies: [
        {
          id: 'FN-2201',
          title: 'Card fraud - Account ****7821',
          summary:
            'High-velocity transactions, geo mismatch, and new device produce an immediate card block route.',
          route: 'Fraud operations',
          status: 'escalated',
          alertScore: 97,
          score: { severity: 97, context: 80, urgency: 95 },
        },
        {
          id: 'FN-2202',
          title: 'APP fraud - Redgate Trading CHAPS',
          summary:
            'Large unknown payee payment via VPN resembles authorised push payment fraud pattern.',
          route: 'Payment hold and callback',
          status: 'escalated',
          alertScore: 90,
          score: { severity: 90, context: 85, urgency: 88 },
        },
        {
          id: 'FN-2203',
          title: 'Elder financial abuse - INV-44921',
          summary:
            'Accelerated drawdown, beneficiary change, and vulnerability flag trigger customer harm review.',
          route: 'Relationship manager',
          status: 'assigned',
          alertScore: 80,
          score: { severity: 75, context: 95, urgency: 70 },
        },
        {
          id: 'FN-2204',
          title: 'AML - structuring pattern detected',
          summary:
            'Series of sub-GBP 10k cash deposits across three accounts over 14 days. Structuring to avoid threshold detected.',
          route: 'MLRO review queue',
          status: 'monitoring',
          alertScore: 60,
          score: { severity: 65, context: 88, urgency: 45 },
        },
        {
          id: 'FN-2205',
          title: 'Model drift - fraud scoring engine',
          summary:
            'False positive rate sits 34% above the 30-day baseline. Model recalibration required within SLA window.',
          route: 'Model governance queue',
          status: 'monitoring',
          alertScore: 37,
          score: { severity: 40, context: 70, urgency: 50 },
        },
      ],
    },
    {
      id: 'veterinary',
      name: 'VetAlert',
      vertical: 'Companion animal healthcare',
      market: 'Cats, dogs, and vet practice',
      tagline:
        'Clinical anomaly detection for veterinary practices, cats and dogs. From diabetic crises to CKD progression, cardiac risk, and overdue wellness cohorts. Built around RCVS standards.',
      catalogueTagline:
        'Clinical anomaly detection for veterinary practices, cats and dogs. From diabetic crises to CKD progression, cardiac risk, and overdue wellness cohorts. Built around RCVS standards.',
      features: [
        'Species-specific scoring profiles for feline and canine patients',
        'Breed protocol flags (CKCS cardiac, CKD substaging, BVA/KC)',
        'Insurance pre-authorisation request automation',
        'Practice management system connectors (VetSoft, RoboVet, Merlin)',
      ],
      defaultWeightLabel: '30% Severity - 45% Context - 25% Urgency',
      users: 'Vet surgeon - Veterinary nurse - Practice manager',
      deployTime: '~2 weeks to first patient alert',
      promise:
        'Supports practices with a ranked wellness and clinical-risk queue tuned to species, breed, age, and care-plan context.',
      primaryUsers: 'Veterinary surgeon, veterinary nurse, practice manager, client care coordinator',
      signals:
        'Clinical records, weight trends, owner-reported changes, vaccination register, breed protocol flags',
      guardrails:
        'Professional conduct, prescribing rules, client data controls, insurance pre-authorisation',
      defaultWeights: { severity: 30, context: 45, urgency: 25 },
      pipeline: ['38k signals', '2.2k checks', '318 qualified', '67 scored', '24 alerts', '10 routed'],
      metrics: [
        { label: 'Open alerts', value: '24', detail: '10 clinician routes' },
        { label: 'Senior pets', value: '146', detail: 'Wellness watch' },
        { label: 'Breed protocols', value: '31', detail: 'Active flags' },
        { label: 'Owner callbacks', value: '18', detail: 'Client care queue' },
      ],
      dashboard: {
        label: 'Companion Animal',
        kpis: [
          { label: 'Critical alerts', value: '2', delta: '+1 vs last week', tone: 'critical' },
          { label: 'High alerts', value: '1', delta: 'Stable', tone: 'high' },
          { label: 'Patients monitored', value: '342', delta: 'Active practice', tone: 'neutral' },
          { label: 'Avg score', value: '72', delta: '+8 pts vs avg', tone: 'neutral' },
          { label: 'Recall coverage', value: '76%', delta: 'Vaccination current', tone: 'medium' },
        ],
        sparkSeries: [
          { label: 'Critical', bars: [0, 0, 1, 0, 1, 0, 1, 2], tone: 'critical' },
          { label: 'High', bars: [1, 0, 1, 1, 0, 1, 1, 1], tone: 'high' },
          { label: 'Medium', bars: [2, 2, 1, 3, 2, 2, 1, 2], tone: 'medium' },
        ],
        sparkLabels: ['-7d', '-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'],
        heatmap: [
          [0, 0, 0, 0, 0, 0, 0],
          [1, 1, 2, 2, 1, 2, 1],
          [2, 2, 1, 2, 2, 1, 1],
          [0, 1, 1, 1, 1, 0, 0],
        ],
        heatmapRowLabels: ['00-06', '06-12', '12-18', '18-24'],
        heatmapColLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        mttr: { critical: '1.2h', high: '24h', medium: '72h' },
        statusBreakdown: [
          { label: 'Escalated', count: 2, tone: 'critical' },
          { label: 'Assigned', count: 1, tone: 'high' },
          { label: 'Monitoring', count: 2, tone: 'medium' },
          { label: 'Resolved', count: 9, tone: 'neutral' },
        ],
      },
      entities: [
        {
          name: 'Biscuit - Labrador - 9yr',
          meta: 'Dog - annual health plan - six-year patient history',
          signals: [
            { label: 'Water intake (7d)', value: '+180% baseline', status: 'alert' },
            { label: 'Urination frequency', value: 'Markedly increased', status: 'alert' },
            { label: 'Weight change (3wk)', value: '-1.8kg', status: 'warn' },
            { label: 'Glucose last visit', value: '18.4 mmol/L', status: 'alert' },
            { label: 'Last wellness check', value: '14 months ago', status: 'warn' },
          ],
        },
        {
          name: 'Mochi - DSH Cat - 7yr',
          meta: 'Cat - indoor only - preventive care plan',
          signals: [
            { label: 'Appetite change', value: 'Off food 4 days', status: 'alert' },
            { label: 'Vomiting episodes', value: '3 in 48 hours', status: 'alert' },
            { label: 'Palpation finding', value: 'Cranial mass noted', status: 'alert' },
            { label: 'Weight trend', value: '-12% body weight', status: 'warn' },
            { label: 'Senior bloodwork', value: 'Overdue 8 months', status: 'warn' },
          ],
        },
      ],
      anomalies: [
        {
          id: 'VT-0078',
          title: 'Abdominal mass - Mochi',
          summary:
            'Palpable mass, weight loss, and anorexia combine into a same-week diagnostic route.',
          route: 'Veterinary surgeon',
          status: 'escalated',
          alertScore: 90,
          score: { severity: 90, context: 80, urgency: 85 },
        },
        {
          id: 'VT-0079',
          title: 'Cardiac decompensation risk - Rufus',
          summary:
            'Murmur grade, resting respiratory rate, and breed protocol flags escalate the cardiac review.',
          route: 'Clinical review',
          status: 'escalated',
          alertScore: 87,
          score: { severity: 85, context: 92, urgency: 78 },
        },
        {
          id: 'VT-0080',
          title: 'Suspected diabetes mellitus - Biscuit',
          summary:
            'PU/PD, weight loss, and high glucose indicate a diabetes confirmation and treatment route.',
          route: 'Diagnostics and client plan',
          status: 'assigned',
          alertScore: 79,
          score: { severity: 82, context: 88, urgency: 68 },
        },
        {
          id: 'VT-0081',
          title: 'Overdue senior wellness cohort',
          summary:
            'Fourteen patients aged seven-plus have bloodwork overdue by more than six months. Early CKD, hyperthyroidism, and diabetes detection window.',
          route: 'Recall campaign',
          status: 'monitoring',
          alertScore: 49,
          score: { severity: 45, context: 90, urgency: 38 },
        },
        {
          id: 'VT-0082',
          title: 'CKD progression - Oreo',
          summary:
            'Creatinine, isosthenuria, hypertension, and rising phosphate indicate IRIS Stage 3 CKD progression.',
          route: 'Same-week consult',
          status: 'assigned',
          alertScore: 76,
          score: { severity: 84, context: 95, urgency: 72 },
        },
        {
          id: 'VT-0083',
          title: 'Leptospirosis vaccination lapse - 23 dogs',
          summary:
            'Boosters lapsed by more than 15 months while autumn high-risk season approaches.',
          route: 'Seasonal recall',
          status: 'monitoring',
          alertScore: 54,
          score: { severity: 50, context: 75, urgency: 60 },
        },
      ],
    },
  ],
}

export function findProductSuite(slug: string | undefined) {
  if (!slug || slug !== anomalySuite.slug) return undefined
  return anomalySuite
}

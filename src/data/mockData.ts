export const AGENT_STAGES = [
  {
    id: 1,
    label: "Entity Resolver",
    durationMs: 1200,
    findings: [
      "Static example, not a real company",
      "Registry lookup: source required",
      "Trading subsidiary: not verified",
      "Employee count: not verified",
    ],
    confidence: "high",
    summary: "Entity resolved. 4 sources indexed.",
    hasWarning: false,
  },
  {
    id: 2,
    label: "Registry Connector",
    durationMs: 1000,
    findings: [
      "Companies House: accounts and filings accessed",
      "HMRC registry: referenced in filing footnote",
      "Intermediate holding structure noted in accounts",
      "Ownership detail: partially clear; further review required",
    ],
    confidence: "medium",
    summary: "Registry data accessed. Ownership partially clear.",
    hasWarning: true,
  },
  {
    id: 3,
    label: "Source Hierarchy",
    durationMs: 1200,
    findings: [
      "Companies House accounts: Tier 1, authoritative",
      "Audited annual report: Tier 2, audited",
      "Management pack: Tier 4; claims require verification",
      "Aggregator revenue estimates: Tier 5, low confidence",
    ],
    confidence: "high",
    summary: "Source tiers assigned. Hierarchy locked.",
    hasWarning: false,
  },
  {
    id: 4,
    label: "Evidence Registry",
    durationMs: 1300,
    findings: [
      "Verified facts: 12",
      "Claims (unverified): 7",
      "Assumptions: 4",
      "Unknowns: 9",
      "Conflicts: 2",
      "Blocking gaps identified: 3",
    ],
    confidence: "medium",
    summary: "Registry built. 2 conflicts flagged.",
    hasWarning: true,
  },
  {
    id: 5,
    label: "Financial Normaliser",
    durationMs: 1800,
    findings: [
      "Financial evidence extracted. Revenue and ARR remain unverified unless supported by filings or trusted source metadata.",
      "Adjusted EBITDA: non-GAAP figure requiring reconciliation; not independently verified",
      "Net cash: registry source checked. See evidence cards for status.",
      "Recurring revenue: management estimate (Tier 4); candidate only",
    ],
    confidence: "medium",
    summary: "Financials normalised. 1 non-GAAP caveat.",
    hasWarning: true,
  },
  {
    id: 6,
    label: "Document Ingestion",
    durationMs: 1500,
    findings: [
      "Mock document: Management Pack",
      "Extracted 3 financial tables",
      "8 candidate facts extracted",
      "Claims treated as Tier 4 until verified against filed accounts",
    ],
    confidence: "medium",
    summary: "8 candidate facts ingested.",
    hasWarning: true,
  },
  {
    id: 7,
    label: "Document Reconciliation",
    durationMs: 1600,
    findings: [
      "Net cash: aligns with Companies House filing; conflict resolved",
      "Revenue: source-backed bridge required. No sample amount shown.",
      "ARR from management pack: definition absent from official accounts; candidate only",
      "Customer concentration: diligence item, not yet verified",
    ],
    confidence: "medium",
    summary: "1 conflict, 1 candidate, 1 diligence item.",
    hasWarning: true,
  },
  {
    id: 8,
    label: "Software-M&A Scorecard",
    durationMs: 1400,
    findings: [
      "ARR quality: moderate; definition unverified",
      "Services mix: estimate unavailable in static sample mode",
      "Adjusted EBITDA bridge: required before IC",
      "Customer concentration: schedule required",
      "Product defensibility: medium-high due to the telco operations niche",
    ],
    confidence: "medium",
    summary: "Scorecard: 2 amber flags. Defensibility medium-high.",
    hasWarning: true,
  },
  // ── AI-specific stages ────────────────────────────────────────────────────
  {
    id: 9,
    label: "AI Signal Extractor",
    durationMs: 1300,
    findings: [
      "AI claim found: 'AI-powered workflow assistant' (Tier 4)",
      "Roadmap AI feature mentions: 2, unverified",
      "No customer-facing AI features confirmed in public filings",
      "Live monetised AI module: unknown",
    ],
    confidence: "medium",
    summary: "AI claims extracted. 0 verified, 2 candidate.",
    hasWarning: true,
  },
  {
    id: 10,
    label: "Replica Risk Assessor",
    durationMs: 1400,
    findings: [
      "Generic workflow UI: high replica risk",
      "Proprietary data position: unknown. Technical diligence required.",
      "Integration depth: medium, with moderate switching costs",
      "AI-native competitor risk: elevated for workflow-layer products",
    ],
    confidence: "medium",
    summary: "Replica risk: medium-high. Proprietary data unverified.",
    hasWarning: true,
  },
  {
    id: 11,
    label: "AI Moat Assessor",
    durationMs: 1200,
    findings: [
      "Proprietary dataset: unverified and flagged as a gap",
      "Feedback loops: no evidence in public sources",
      "Embedded workflow depth: medium; claimed, not verified",
      "Domain-specific model or rule-set: unknown",
    ],
    confidence: "medium",
    summary: "AI moat: unproven. 3 unknowns flagged.",
    hasWarning: true,
  },
  {
    id: 12,
    label: "Inference Economics Model",
    durationMs: 1300,
    findings: [
      "AI feature COGS: not disclosed",
      "Model/vendor dependency: unknown",
      "Gross margin drag from inference: unknown",
      "Pricing power for AI cost absorption: requires financial diligence",
    ],
    confidence: "low",
    summary: "Inference economics: 4 unknowns. Diligence required.",
    hasWarning: true,
  },
  {
    id: 13,
    label: "P&L Impact Mapper",
    durationMs: 1400,
    findings: [
      "Revenue expansion levers: potential, not quantified",
      "Services cannibalisation risk: medium; AI risk not monetised",
      "Support OPEX reduction: potential, with no supporting data",
      "R&D productivity uplift: potential, with no supporting evidence",
      "EBITDA impact: mixed; inference COGS unknown",
    ],
    confidence: "medium",
    summary: "P&L levers identified. No metric verified.",
    hasWarning: true,
  },
  {
    id: 14,
    label: "AI Diligence Generator",
    durationMs: 1200,
    findings: [
      "AI diligence questions generated: 7",
      "Key gaps: inference cost, live AI module revenue, proprietary data",
      "Valuation caveat: AI upside should not increase base valuation until proven",
      "Required before IC: technical AI diligence session",
    ],
    confidence: "high",
    summary: "7 AI diligence questions generated. Valuation caveat applied.",
    hasWarning: false,
  },
  // ── post-AI stages ────────────────────────────────────────────────────────
  {
    id: 15,
    label: "Buyer-Specific Fit",
    durationMs: 1500,
    findings: [
      "Fit mode: Auto-detect → Adjacent selected",
      "Platform: Generic Vertical Software Acquirer",
      "Fit score: 7.0 / 10",
      "Synergies: not underwritten. A specific buyer thesis is required.",
      "Integration risk: medium due to a complex telco workflow",
    ],
    confidence: "medium",
    summary: "Adjacent fit. Score: 7.0/10. Synergies unconfirmed.",
    hasWarning: false,
  },
  {
    id: 16,
    label: "Sanity Check",
    durationMs: 1400,
    findings: [
      "Revenue conflict resolved: Companies House takes precedence",
      "ARR absent from official accounts. Blocking gap confirmed.",
      "Customer concentration: elevated; blocking diligence item",
      "IC readiness: Request Financials",
    ],
    confidence: "medium",
    summary: "Conflicts adjudicated. 1 blocking gap confirmed.",
    hasWarning: true,
  },
  {
    id: 17,
    label: "Valuation Caveat Engine",
    durationMs: 2000,
    findings: [
      "Primary method: revenue multiple. Base revenue requires filing confirmation.",
      "Multiple range: 3.5x / 4.5x / 6.0x (illustrative)",
      "EV range: illustrative only and dependent on source-backed revenue and an ARR definition",
      "Caveat: multiple depends on ARR definition and SaaS/services split",
      "AI upside caveat: not reflected in base valuation pending technical diligence",
    ],
    confidence: "medium",
    summary: "EV range not shown in static sample mode. Revenue split + AI caveats require source-backed evidence.",
    hasWarning: true,
  },
  {
    id: 18,
    label: "IC Readiness",
    durationMs: 1300,
    findings: [
      "Evidence quality: Good",
      "Revenue quality: Moderate",
      "Valuation readiness: Partial",
      "Recommendation: Request Financials / Technical Diligence",
      "IC readiness: Partially ready; 7 blocking gaps remain, including AI diligence",
    ],
    confidence: "medium",
    summary: "IC readiness: Partial. Action: Request Financials + AI Diligence.",
    hasWarning: false,
  },
  {
    id: 19,
    label: "Diligence Gap Engine",
    durationMs: 1600,
    findings: [
      "DD plan generated: 8 workstreams (incl. AI Risk)",
      "Priority items: ARR definition, EBITDA bridge, AI module revenue, inference costs",
      "Workstreams: Revenue, Customer, Product, Technology, Legal, Financial, AI Risk, Management",
      "Diligence questions generated: 31",
    ],
    confidence: "high",
    summary: "DD plan: 8 workstreams. 31 diligence questions.",
    hasWarning: false,
  },
  {
    id: 20,
    label: "Report Writer",
    durationMs: 1200,
    findings: [
      "Sections: Evidence Registry, Sanity Check, Valuation Caveats, Strategic Fit, AI Disruption, IC Memo, DD Plan",
      "Report length: ~2,800 words",
      "All claims include source confidence and status",
      "Export formats: Markdown (demo)",
    ],
    confidence: "high",
    summary: "Report generated with AI disruption section and caveats.",
    hasWarning: false,
  },
];

export const EVIDENCE_CARDS = [
  { field: "Revenue", value: "—", source: "—", confidence: "low" as const, status: "blocking" as const },
  { field: "Adjusted EBITDA", value: "Unknown", source: "Source required", confidence: "low" as const, status: "caveat" as const },
  { field: "ARR", value: "Claimed — definition absent", source: "Management Pack", confidence: "low" as const, status: "candidate" as const },
  { field: "Top-customer concentration", value: "Unknown", source: "Source required", confidence: "low" as const, status: "diligence" as const },
  { field: "Ownership structure", value: "Unknown", source: "No authoritative source", confidence: "low" as const, status: "blocking" as const },
];

export const PREVIOUS_REPORTS = [
  { company: "Illustrative target 1", ticker: "Static example", recommendation: "Request Evidence", evidenceQuality: "Unknown", strategicFit: "Illustrative", blockingGaps: 7, date: "Today" },
  { company: "Illustrative target 2", ticker: "Static example", recommendation: "Request Evidence", evidenceQuality: "Unknown", strategicFit: "Illustrative", blockingGaps: 4, date: "Yesterday" },
  { company: "Illustrative target 3", ticker: "Static example", recommendation: "Monitor", evidenceQuality: "Unknown", strategicFit: "Illustrative", blockingGaps: 3, date: "3 days ago" },
];

// ── Deal Cockpit ──────────────────────────────────────────────────────────────

export type RecommendationLevel = 'green' | 'amber' | 'red' | 'blue' | 'grey';

export interface EvidenceItem {
  field: string;
  value: string;
  source: string;
  confidence: 'low' | 'medium' | 'high';
  status: 'verified' | 'caveat' | 'candidate' | 'diligence' | 'blocking' | 'pending';
}

export interface DiligenceGap {
  label: string;
  severity: 'blocking' | 'high' | 'medium';
  note: string;
}

export interface DetailDecisionItem {
  date: string;
  action: string;
  note: string;
}

export interface CockpitTarget {
  company: string;
  jurisdiction: string;
  recommendation: string;
  recommendationLevel: RecommendationLevel;
  pipelineStatus: string;
  icReadiness: string;
  valuationReadiness: string;
  aiReplicaRisk: string;
  evidenceConfidence: string;
  nextAction: string;
  lastRun: string;
  // Detail panel fields
  decisionSummary: string;
  strategicFit: string;
  aiDisruptionSummary: string;
  score: number;
  topEvidenceCards: EvidenceItem[];
  topDiligenceGaps: DiligenceGap[];
  detailDecisionHistory: DetailDecisionItem[];
}

export const DEAL_COCKPIT_TARGETS: CockpitTarget[] = [
  {
    company: 'LedgerWorks Systems Ltd.',
    jurisdiction: 'UK',
    recommendation: 'Request Financials',
    recommendationLevel: 'amber',
    pipelineStatus: 'Request Financials',
    icReadiness: 'Partial',
    valuationReadiness: 'Caveated. ARR bridge required.',
    aiReplicaRisk: 'Low',
    evidenceConfidence: 'Unknown',
    nextAction: 'Request management accounts for ARR bridge.',
    lastRun: '2026-06-25',
    decisionSummary: 'Static example pipeline entry. Revenue, ARR and customer evidence require source-backed validation before IC use.',
    strategicFit: 'Core: revenue infrastructure',
    aiDisruptionSummary: 'Low AI replica risk. Domain-specific workflow logic creates meaningful switching costs. No live AI module identified; AI as a feature rather than a moat.',
    score: 82,
    topEvidenceCards: [
      { field: 'Revenue', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
      { field: 'Net cash', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
      { field: 'ARR', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
    ],
    topDiligenceGaps: [
      { label: 'ARR definition and bridge', severity: 'blocking', note: 'ARR definition and methodology required.' },
      { label: 'SaaS vs. services revenue split', severity: 'high', note: 'Filing does not distinguish recurring vs. non-recurring. Critical for multiple benchmarking.' },
      { label: 'Customer concentration', severity: 'medium', note: 'Customer concentration schedule requires confirmation.' },
    ],
    detailDecisionHistory: [
      { date: '2026-06-25', action: 'Marked Request Financials', note: 'ARR definition blocking IC readiness.' },
      { date: '2026-06-20', action: 'Screen initiated', note: 'Initial pipeline entry — sourced from sector scan.' },
    ],
  },
  {
    company: 'Illustrative Target Co.',
    jurisdiction: 'UK',
    recommendation: 'Request Financials',
    recommendationLevel: 'amber',
    pipelineStatus: 'Request Financials',
    icReadiness: 'Partial',
    valuationReadiness: 'Blocked pending ARR bridge',
    aiReplicaRisk: 'Medium-high',
    evidenceConfidence: 'Medium',
    nextAction: 'ARR definition, SaaS/services split, customer concentration.',
    lastRun: '2026-06-24',
    decisionSummary: 'Attractive AI workflow opportunity with growing ARR, but AI moat is unproven and replica risk is elevated. Generic workflow UI layer presents substitution risk from AI-native entrants. Requires technical AI diligence before valuation can be formed.',
    strategicFit: 'Adjacent: workflow automation',
    aiDisruptionSummary: 'Medium-high AI replica risk. AI-native tools may substitute for the workflow automation layer. The proprietary data position is unverified and remains a blocking diligence gap. Moat claims require a technical session.',
    score: 67,
    topEvidenceCards: [
      { field: 'Revenue', value: '—', source: '—', confidence: 'low', status: 'blocking' },
      { field: 'Adjusted EBITDA', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'caveat' },
      { field: 'ARR', value: 'Claimed — definition absent', source: 'Management Pack', confidence: 'low', status: 'candidate' },
    ],
    topDiligenceGaps: [
      { label: 'AI moat and proprietary data', severity: 'blocking', note: 'No verified proprietary dataset or feedback loop. Technical diligence session required before IC.' },
      { label: 'Inference economics', severity: 'blocking', note: 'AI feature COGS not disclosed. Gross margin drag from model inference is unknown.' },
      { label: 'ARR definition and SaaS split', severity: 'high', note: 'ARR from management pack — definition and services vs. recurring split unconfirmed.' },
    ],
    detailDecisionHistory: [
      { date: '2026-06-24', action: 'Added diligence question', note: 'ARR definition and SaaS/services split requested.' },
      { date: '2026-06-18', action: 'Screen initiated', note: 'Entered pipeline from AI workflow sector scan.' },
    ],
  },
  {
    company: 'VerticalOps CRM GmbH',
    jurisdiction: 'DE',
    recommendation: 'Monitor',
    recommendationLevel: 'blue',
    pipelineStatus: 'Monitor',
    icReadiness: 'Incomplete',
    valuationReadiness: 'Unknown due to insufficient data',
    aiReplicaRisk: 'Medium',
    evidenceConfidence: 'Low',
    nextAction: 'Request Handelsregister filings and revenue split.',
    lastRun: '2026-06-23',
    decisionSummary: 'Strategic adjacency in CRM vertical is plausible but registry evidence is incomplete. Revenue and ARR data are unknown. Not actionable until registry data is available.',
    strategicFit: 'Adjacent: vertical CRM',
    aiDisruptionSummary: 'Medium AI replica risk. CRM layer faces substitution pressure from AI-native tools. No evidence of proprietary workflow depth or data lock-in sufficient to differentiate.',
    score: 51,
    topEvidenceCards: [
      { field: 'Revenue', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'candidate' },
      { field: 'Employees', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'candidate' },
      { field: 'ARR', value: 'Unknown', source: 'No source', confidence: 'low', status: 'blocking' },
    ],
    topDiligenceGaps: [
      { label: 'Handelsregister filings', severity: 'blocking', note: 'German registry filings not retrieved. Revenue and ownership data unverifiable.' },
      { label: 'ARR and recurring revenue', severity: 'blocking', note: 'No ARR data available from any source. Valuation not formable.' },
      { label: 'Ownership and group structure', severity: 'high', note: 'Holding structure not documented. Acquisition perimeter unclear.' },
    ],
    detailDecisionHistory: [
      { date: '2026-06-23', action: 'Marked Monitor', note: 'Registry evidence incomplete — not actionable yet.' },
      { date: '2026-06-15', action: 'Screen initiated', note: 'Entered pipeline from European CRM sector watch.' },
    ],
  },
  {
    company: 'SignalDesk Analytics Inc.',
    jurisdiction: 'US',
    recommendation: 'Pass',
    recommendationLevel: 'red',
    pipelineStatus: 'Pass',
    icReadiness: 'Not ready',
    valuationReadiness: 'Not applicable',
    aiReplicaRisk: 'High',
    evidenceConfidence: 'Low',
    nextAction: 'High AI replica risk. Insufficient moat evidence. No further action recommended.',
    lastRun: '2026-06-22',
    decisionSummary: 'Public filing evidence is available but AI replica risk is high. Analytics layer is highly substitutable by AI-native tools. No proprietary data moat identified. Product defensibility is insufficient for investment thesis.',
    strategicFit: 'Non-core: analytics layer',
    aiDisruptionSummary: 'High AI replica risk. Analytics and reporting layer is among the most exposed categories to AI commoditisation. No proprietary dataset or workflow depth identified. Inference economics unknown. Pass recommended.',
    score: 28,
    topEvidenceCards: [
      { field: 'Revenue', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
      { field: 'Gross margin', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
      { field: 'ARR', value: 'Not disclosed', source: 'No source', confidence: 'low', status: 'blocking' },
    ],
    topDiligenceGaps: [
      { label: 'AI moat — none identified', severity: 'blocking', note: 'No proprietary data, feedback loop, or domain-specific model. High substitution risk.' },
      { label: 'Inference economics', severity: 'blocking', note: 'AI feature cost structure not disclosed. Margin drag unknown.' },
      { label: 'Product defensibility', severity: 'blocking', note: 'Analytics layer lacks switching costs. Competitor replication risk is high.' },
    ],
    detailDecisionHistory: [
      { date: '2026-06-22', action: 'Marked Pass', note: 'High AI replica risk. No moat evidence.' },
      { date: '2026-06-10', action: 'Screen initiated', note: 'Entered pipeline from US analytics sector scan.' },
    ],
  },
  {
    company: 'DataRoomOps Ltd.',
    jurisdiction: 'UK',
    recommendation: 'Prepare Evidence Pack',
    recommendationLevel: 'grey',
    pipelineStatus: 'Prepare Evidence Pack',
    icReadiness: 'In preparation',
    valuationReadiness: 'Partial; revenue and ARR pending',
    aiReplicaRisk: 'Low',
    evidenceConfidence: 'Medium',
    nextAction: 'Assemble IC evidence pack. Confirm ARR definition with management.',
    lastRun: '2026-06-26',
    decisionSummary: 'Niche data room and deal workflow software example. Revenue and ARR definition require source-backed confirmation before IC use.',
    strategicFit: 'Adjacent: deal workflow tooling',
    aiDisruptionSummary: 'Low AI replica risk. Structural compliance requirements in data room workflows limit AI substitution. Proprietary deal data may provide a defensible data moat, subject to technical diligence.',
    score: 71,
    topEvidenceCards: [
      { field: 'Revenue', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'blocking' },
      { field: 'EBITDA margin', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'caveat' },
      { field: 'ARR', value: 'Unknown', source: 'Source required', confidence: 'low', status: 'candidate' },
    ],
    topDiligenceGaps: [
      { label: 'ARR definition confirmation', severity: 'high', note: 'ARR requires definition and methodology sign-off.' },
      { label: 'Customer churn rate', severity: 'high', note: 'No churn data available in public filings. Required for SaaS multiple benchmarking.' },
      { label: 'Ownership structure', severity: 'medium', note: 'Holding company structure partially clear — full perimeter required for IC.' },
    ],
    detailDecisionHistory: [
      { date: '2026-06-26', action: 'Evidence pack initiated', note: 'Registry data complete. ARR confirmation in progress.' },
      { date: '2026-06-19', action: 'Screen initiated', note: 'Entered pipeline from deal-tech sector watch.' },
    ],
  },
];

export interface DecisionHistoryItem {
  company: string;
  action: string;
  date: string;
  note: string;
}

export const DECISION_HISTORY: DecisionHistoryItem[] = [
  { company: 'DataRoomOps Ltd.', action: 'Evidence pack initiated', date: '2026-06-26', note: 'Registry data complete. ARR confirmation in progress.' },
  { company: 'LedgerWorks Systems Ltd.', action: 'Marked Request Financials', date: '2026-06-25', note: 'ARR definition blocking IC readiness.' },
  { company: 'Illustrative Target Co.', action: 'Added diligence question', date: '2026-06-24', note: 'ARR definition and SaaS/services split.' },
  { company: 'VerticalOps CRM GmbH', action: 'Marked Monitor', date: '2026-06-23', note: 'Registry evidence incomplete.' },
  { company: 'SignalDesk Analytics Inc.', action: 'Marked Pass', date: '2026-06-22', note: 'High AI replica risk, no moat evidence.' },
];

// ── Pipeline summary strip counts ─────────────────────────────────────────────

export const PIPELINE_SUMMARY = [
  { label: 'Request Financials', level: 'amber' as RecommendationLevel, count: 2 },
  { label: 'Monitor',            level: 'blue'  as RecommendationLevel, count: 1 },
  { label: 'Pass',               level: 'red'   as RecommendationLevel, count: 1 },
  { label: 'Prepare Evidence Pack', level: 'grey' as RecommendationLevel, count: 1 },
];

// ── Target Comparison ─────────────────────────────────────────────────────────

export interface ComparisonTarget {
  company: string;
  rank: number;
  score: number;
  rankReason: string;
  recommendation: string;
  recommendationLevel: RecommendationLevel;
  icReadiness: string;
  valuationReadiness: string;
  strategicFit: string;
  aiReplicaRisk: string;
  aiMoat: string;
  evidenceConfidence: string;
  blockingGaps: number;
  blockers: string[];
  nextAction: string;
}

export const TARGET_COMPARISON: ComparisonTarget[] = [
  {
    company: 'LedgerWorks Systems Ltd.',
    rank: 1,
    score: 82,
    rankReason: 'Strongest strategic fit and evidence quality in cohort. ARR bridge is the only remaining blocker before IC.',
    recommendation: 'Pursue',
    recommendationLevel: 'green',
    icReadiness: 'Partial',
    valuationReadiness: 'Caveated. ARR bridge required.',
    strategicFit: 'Core: revenue infrastructure',
    aiReplicaRisk: 'Low',
    aiMoat: 'Partial evidence',
    evidenceConfidence: 'High',
    blockingGaps: 1,
    blockers: ['ARR definition and bridge not confirmed'],
    nextAction: 'Request management accounts for ARR bridge.',
  },
  {
    company: 'Illustrative Target Co.',
    rank: 2,
    score: 67,
    rankReason: 'Attractive AI opportunity but AI moat is unproven and replica risk is medium-high. Technical diligence required.',
    recommendation: 'Request Financials',
    recommendationLevel: 'amber',
    icReadiness: 'Partial',
    valuationReadiness: 'Blocked pending ARR bridge',
    strategicFit: 'Adjacent: workflow automation',
    aiReplicaRisk: 'Medium-high',
    aiMoat: 'Unproven',
    evidenceConfidence: 'Medium',
    blockingGaps: 3,
    blockers: [
      'AI moat and proprietary data unverified',
      'Inference economics not disclosed',
      'ARR definition unconfirmed',
    ],
    nextAction: 'ARR definition, SaaS/services split, technical AI diligence.',
  },
  {
    company: 'SignalDesk Analytics Inc.',
    rank: 3,
    score: 28,
    rankReason: 'Public filing evidence available, but inference economics and product defensibility need work. High replica risk.',
    recommendation: 'Pass',
    recommendationLevel: 'red',
    icReadiness: 'Not ready',
    valuationReadiness: 'Not applicable',
    strategicFit: 'Non-core: analytics layer',
    aiReplicaRisk: 'High',
    aiMoat: 'None identified',
    evidenceConfidence: 'Low',
    blockingGaps: 7,
    blockers: [
      'High AI replica risk. Analytics layer is commoditised.',
      'No proprietary data moat identified',
      'Product defensibility insufficient',
    ],
    nextAction: 'No further action recommended.',
  },
  {
    company: 'VerticalOps CRM GmbH',
    rank: 4,
    score: 51,
    rankReason: 'Strategic adjacency plausible but registry evidence is incomplete. German filings not yet retrieved.',
    recommendation: 'Monitor',
    recommendationLevel: 'blue',
    icReadiness: 'Incomplete',
    valuationReadiness: 'Unknown',
    strategicFit: 'Adjacent: vertical CRM',
    aiReplicaRisk: 'Medium',
    aiMoat: 'Unknown',
    evidenceConfidence: 'Low',
    blockingGaps: 5,
    blockers: [
      'Handelsregister filings not retrieved',
      'ARR and recurring revenue unknown',
      'Ownership and group structure undocumented',
    ],
    nextAction: 'Request Handelsregister filings, revenue split, ARR definition.',
  },
];

// ── Buyer Thesis Templates ────────────────────────────────────────────────────

export interface BuyerThesisTemplate {
  id: string;
  label: string;
  objective: string;
  rewards: string[];
  penalises: string[];
  requiredEvidence: string[];
  aiStance: string;
  typicalOutput: string;
}

export const BUYER_THESIS_TEMPLATES: BuyerThesisTemplate[] = [
  {
    id: 'pe-add-on',
    label: 'PE software platform add-on',
    objective: 'Acquire a software business that can be integrated into an existing platform or managed independently, with a clear path to EBITDA improvement.',
    rewards: ['Recurring revenue', 'EBITDA margin', 'Strong evidence quality', 'Management independence'],
    penalises: ['Customer concentration', 'Custom services dependency', 'Weak evidence', 'High AI replica risk'],
    requiredEvidence: ['ARR definition', 'Revenue split (SaaS vs services)', 'Churn rate', 'Customer concentration', 'EBITDA bridge', 'Ownership clarity'],
    aiStance: 'AI replica risk is assessed. Moat evidence is required before valuation uplift is assumed.',
    typicalOutput: 'IC screen with evidence register, blocking gaps and a structured request list.',
  },
  {
    id: 'vertical-rollup',
    label: 'Vertical software roll-up',
    objective: 'Build a portfolio of vertical SaaS businesses with recurring revenue, durable niches and low churn.',
    rewards: ['Recurring revenue', 'Durable niche', 'Low churn', 'Management independence'],
    penalises: ['Customer concentration', 'Custom services dependency', 'Weak evidence quality', 'High AI replica risk'],
    requiredEvidence: ['ARR', 'Churn', 'Customer concentration', 'Revenue split', 'Product architecture', 'Ownership clarity'],
    aiStance: 'AI replica risk is assessed at screen stage. High replica risk disqualifies from roll-up thesis.',
    typicalOutput: 'Buyer-fit score, evidence register and diligence gap list per target.',
  },
  {
    id: 'vc-growth',
    label: 'VC growth investment',
    objective: 'Back a high-growth software company with a clear AI or product moat and a large addressable market.',
    rewards: ['ARR growth rate', 'AI moat evidence', 'Market size', 'Product differentiation'],
    penalises: ['Slow growth', 'Weak AI positioning', 'High customer concentration', 'Thin gross margin'],
    requiredEvidence: ['ARR growth', 'Net revenue retention', 'AI moat evidence', 'Market size', 'Burn rate', 'Runway'],
    aiStance: 'AI moat is required for premium valuation. Replica risk is a disqualifier at growth multiples.',
    typicalOutput: 'Investment memo with AI positioning assessment and growth quality score.',
  },
];

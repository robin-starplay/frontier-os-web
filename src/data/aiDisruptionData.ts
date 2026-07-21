// ─────────────────────────────────────────────────────────────────────────────
// Illustrative AI-disruption data — Illustrative Target Co.
// All values are illustrative. Not real company data.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_TARGET = {
  name: 'Illustrative Target Co.',
  revenue: 'Not verified in preview',
  recurringRevenue: '—',
  ebitda: '[illustrative]',
  aiClaim: 'AI-powered workflow assistant',
  aiModuleRevenue: 'Unknown',
  inferenceCost: 'Unknown',
  proprietaryData: 'Unverified',
  integrationDepth: 'Medium',
  replicaRisk: 'Medium-high',
  aiOpportunity: 'High',
  aiMoat: 'Unproven',
  recommendation: 'Request Financials / Technical Diligence',
};

// Top-row scores
export const AI_SCORES = [
  { label: 'AI Disruption Score', value: 6, max: 10, color: 'amber' },
  { label: 'AI Replica Risk',     value: 7, max: 10, color: 'red' },
  { label: 'AI Moat',             value: 4, max: 10, color: 'amber' },
  { label: 'AI Opportunity',      value: 8, max: 10, color: 'green' },
  { label: 'Defensibility',       value: 5, max: 10, color: 'amber' },
];

// Replica risk drivers
export const REPLICA_RISK_DRIVERS = [
  { label: 'Generic workflow UI',        level: 'High',         color: 'red' },
  { label: 'Proprietary data',           level: 'Unknown',      color: 'muted' },
  { label: 'Deep integrations',          level: 'Medium',       color: 'amber' },
  { label: 'Customer switching cost',    level: 'Medium',       color: 'amber' },
  { label: 'Regulatory complexity',      level: 'Low / Medium', color: 'green' },
  { label: 'AI-native competitor risk',  level: 'High',         color: 'red' },
];

// AI moat evidence cards
export const AI_MOAT_EVIDENCE = [
  { claim: 'Company claims AI-powered matching',           status: 'CLAIM',       confidence: 'Medium' },
  { claim: 'No verified proprietary dataset disclosed',    status: 'UNKNOWN',     confidence: 'Low' },
  { claim: 'Workflow embedded in hiring process',          status: 'ASSUMPTION',  confidence: 'Medium' },
  { claim: 'No source-backed AI adoption metrics',         status: 'GAP',         confidence: 'High' },
];

// P&L impact map
export const PL_IMPACT_ROWS = [
  { item: 'Revenue expansion',        direction: 'Positive', confidence: 'Medium' },
  { item: 'Services cannibalisation', direction: 'Negative', confidence: 'Medium' },
  { item: 'Support OPEX',             direction: 'Positive', confidence: 'Medium' },
  { item: 'R&D productivity',         direction: 'Positive', confidence: 'Low–Medium' },
  { item: 'Inference COGS',           direction: 'Negative', confidence: 'Unknown' },
  { item: 'EBITDA impact',            direction: 'Mixed',    confidence: 'Medium' },
];

// Diligence questions
export const AI_DILIGENCE_QUESTIONS = [
  'What percentage of revenue is recurring software vs services?',
  'Which AI features are live vs roadmap?',
  'What are monthly inference costs per active customer?',
  'Is AI offered as a separate module or included in the core product?',
  'What proprietary data improves model output?',
  'Which workflows could a customer rebuild internally with AI tools?',
  'How much implementation work can AI automate?',
];

// ── 6 landing cards ──────────────────────────────────────────────────────────

export type EvidenceStatus = 'Fact' | 'Claim' | 'Unknown' | 'Gap';

export interface AICardRow {
  label: string;
  value?: string;
  status?: EvidenceStatus;
}

export interface AICard {
  id: string;
  title: string;
  subtitle: string;
  rows: AICardRow[];
  accent: 'blue' | 'red' | 'green' | 'amber' | 'purple';
}

export const AI_DISRUPTION_CARDS: AICard[] = [
  {
    id: 'ai-used',
    title: 'AI Already Used?',
    subtitle: 'Product claims, roadmap and evidence status.',
    accent: 'blue',
    rows: [
      { label: 'Product AI claims',           status: 'Claim' },
      { label: 'AI-powered workflow assistant', status: 'Claim' },
      { label: 'Roadmap AI feature mentions',  status: 'Claim' },
      { label: 'Customer-facing automation',   status: 'Unknown' },
      { label: 'Live monetised AI module',      status: 'Unknown' },
    ],
  },
  {
    id: 'replica-risk',
    title: 'AI Replica Risk',
    subtitle: 'Could an AI-native entrant rebuild this workflow?',
    accent: 'red',
    rows: [
      { label: 'Workflow complexity',       value: 'Medium' },
      { label: 'Data uniqueness',           value: 'Unverified' },
      { label: 'Integration depth',         value: 'Medium' },
      { label: 'Regulatory / domain logic', value: 'Low–Medium' },
      { label: 'Switching costs',           value: 'Medium' },
      { label: 'Rebuildability exposure',   value: 'Medium–High' },
    ],
  },
  {
    id: 'ai-moat',
    title: 'AI Moat',
    subtitle: 'Evidence of defensible AI advantage.',
    accent: 'green',
    rows: [
      { label: 'Proprietary data',           status: 'Unknown' },
      { label: 'Feedback loops',             status: 'Unknown' },
      { label: 'Embedded workflows',         status: 'Claim' },
      { label: 'Distribution advantage',     status: 'Claim' },
      { label: 'Domain-specific models',     status: 'Unknown' },
    ],
  },
  {
    id: 'inference-economics',
    title: 'Inference Economics',
    subtitle: 'AI feature cost structure and margin impact.',
    accent: 'amber',
    rows: [
      { label: 'AI feature COGS',               status: 'Unknown' },
      { label: 'Usage-based model costs',        status: 'Unknown' },
      { label: 'Gross margin drag',              status: 'Unknown' },
      { label: 'Model / vendor dependency',      status: 'Gap' },
      { label: 'Pricing power to absorb AI costs', status: 'Gap' },
    ],
  },
  {
    id: 'pl-levers',
    title: 'P&L Expansion Levers',
    subtitle: 'Where AI can move revenue, OPEX or EBITDA.',
    accent: 'purple',
    rows: [
      { label: 'New AI modules',               value: 'Potential' },
      { label: 'Pricing / upsell analytics',   value: 'Potential' },
      { label: 'Churn prediction',             value: 'Potential' },
      { label: 'Support automation',           value: 'Potential' },
      { label: 'Implementation automation',    value: 'Potential' },
      { label: 'R&D productivity',             value: 'Potential' },
    ],
  },
  {
    id: 'ic-questions',
    title: 'IC Diligence Questions',
    subtitle: 'What must be requested before IC.',
    accent: 'blue',
    rows: [
      { label: 'What is claimed?',              value: '5 claims, 0 verified' },
      { label: 'What is verified?',             value: '0 of 5 AI claims' },
      { label: 'What breaks valuation?',        value: 'AI upside unmonetised' },
      { label: 'Must request before IC',        value: 'Technical diligence' },
    ],
  },
];

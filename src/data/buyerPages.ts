// ── Buyer landing page data ────────────────────────────────────────────────────
// One entry per audience. The BuyerLandingTemplate renders these.

export type ChipColor = 'green' | 'amber' | 'red' | 'muted' | 'blue';

export interface SampleRow {
  label: string;
  value?: string;
  chip?: { text: string; color: ChipColor };
}

export interface WorkflowStep {
  number: number;
  label: string;
  description: string;
}

export interface BuyerPageData {
  slug: string;
  navLabel: string;
  headline: string;
  subheadline: string;
  badge: string;
  painPoints: string[];
  howHelps: string[];
  sampleCardTarget: string;
  sampleRows: SampleRow[];
  workflowSteps: WorkflowStep[];
  lockedFeatures: string[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

// ── Private Equity ────────────────────────────────────────────────────────────

const privateEquity: BuyerPageData = {
  slug: 'private-equity',
  navLabel: 'Private Equity',
  headline: 'Screen software targets before analyst time gets expensive.',
  subheadline:
    'Frontier OS helps PE teams separate verified facts from claims, identify diligence blockers, test AI defensibility, and decide whether a software target is ready for IC.',
  badge: 'PRIVATE EQUITY',
  painPoints: [
    'CIMs and websites mix facts, claims and assumptions.',
    'ARR, retention and customer concentration are often missing.',
    'AI claims are hard to underwrite without a structured screen.',
    'Analyst time gets wasted on targets that should have been screened earlier.',
    'IC memos need source-backed evidence, not generic AI-generated text.',
  ],
  howHelps: [
    'URL-only first-pass acquisition screen — no NDA required.',
    'Evidence confidence rating for every claim in the screen.',
    'IC readiness and valuation readiness signals in each output.',
    'AI disruption screen — replica risk, moat evidence, inference economics.',
    'Ranked diligence questions to structure the next analyst call.',
    'Target comparison across 2–5 candidates by buyer thesis.',
    'Deal Cockpit to track next actions across your pipeline.',
  ],
  sampleCardTarget: 'Illustrative Target Co.',
  sampleRows: [
    { label: 'Recommendation',      chip: { text: 'Request Financials', color: 'amber' } },
    { label: 'IC readiness',        chip: { text: 'Partial',            color: 'amber' } },
    { label: 'Valuation readiness', chip: { text: 'Blocked',            color: 'red'   }, value: 'Pending ARR bridge' },
    { label: 'AI replica risk',     chip: { text: 'Medium-high',        color: 'amber' } },
    { label: 'AI moat evidence',    chip: { text: 'Unproven',           color: 'muted' } },
    { label: 'Next action',         value: 'Request ARR definition, SaaS/services split, customer concentration and AI feature usage data.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Define acquisition criteria',   description: 'Set sector, geography, ARR range and strategic rationale.' },
    { number: 2, label: 'Run URL screen',                description: 'First-pass evidence, IC readiness and AI risk — URL only.' },
    { number: 3, label: 'Compare shortlist',             description: 'Rank 2–5 targets by buyer thesis and evidence quality.' },
    { number: 4, label: 'Save to Cockpit',               description: 'Track diligence blockers and next actions per target.' },
    { number: 5, label: 'Prepare IC memo',               description: 'Export evidence register and diligence question set.' },
  ],
  lockedFeatures: [
    'IC memo PDF export — formatted evidence register',
    'Multi-stage workflow tracking across deal phases',
    'Team sharing and annotations on deal cards',
    'CRM and data-room integration',
  ],
  primaryCtaLabel: 'Run acquisition screen',
  primaryCtaHref: '/run?mode=sample',
  secondaryCtaLabel: 'Request private beta access',
  secondaryCtaHref: '/request-pilot',
};

// ── Software Roll-ups ─────────────────────────────────────────────────────────

const softwareRollups: BuyerPageData = {
  slug: 'software-rollups',
  navLabel: 'Software Roll-ups',
  headline: 'Build a repeatable target-screening engine for software roll-ups.',
  subheadline:
    'Rank add-ons by strategic fit, evidence quality, AI risk, integration complexity and next action — across your full pipeline, not one target at a time.',
  badge: 'SOFTWARE ROLL-UPS',
  painPoints: [
    'Many targets, limited diligence bandwidth.',
    'Inconsistent target quality across the pipeline.',
    'Add-on fit is asserted but rarely evidenced.',
    'ARR definitions vary — weak evidence makes comparisons unreliable.',
    'Integration risk and operational complexity are hard to assess early.',
    'AI disruption is reshaping value across vertical niches.',
  ],
  howHelps: [
    'Compare 2–5 targets side by side against a shared buyer thesis.',
    'Rank candidates by strategic fit, evidence confidence and AI risk.',
    'Track next actions per target in the Deal Cockpit.',
    'Identify evidence gaps before you spend analyst time on a call.',
    'Flag AI replica risk and moat evidence across the shortlist.',
    'Origination — surface ranked targets from a buyer thesis description.',
  ],
  sampleCardTarget: 'Illustrative target 1 vs. illustrative target 2',
  sampleRows: [
    { label: 'Buyer thesis fit', chip: { text: 'Strong — sample target',   color: 'green' } },
    { label: 'AI replica risk',  chip: { text: 'Low / Medium-high',        color: 'amber' } },
    { label: 'Evidence quality', chip: { text: 'High / Partial',           color: 'amber' } },
    { label: 'Integration risk', chip: { text: 'Low / Moderate',          color: 'amber' } },
    { label: 'Next action',      value: 'Run URL screens and request ARR bridge before progressing.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Enter buyer thesis',   description: 'Sector, geography, revenue range and add-on rationale.' },
    { number: 2, label: 'Run origination',      description: 'Frontier OS surfaces ranked candidates from its registry.' },
    { number: 3, label: 'Screen top targets',   description: 'URL-only first-pass for each candidate — evidence and AI risk.' },
    { number: 4, label: 'Compare shortlist',    description: 'Rank by strategic fit, evidence quality and next action.' },
    { number: 5, label: 'Track in Cockpit',     description: 'Pipeline view with diligence blockers per target.' },
  ],
  lockedFeatures: [
    'Bulk target import from your pipeline spreadsheet',
    'Auto-ranked update when new evidence is filed',
    'Roll-up fit scoring against platform criteria',
    'Integration complexity matrix per target',
  ],
  primaryCtaLabel: 'Compare targets',
  primaryCtaHref: '/compare',
  secondaryCtaLabel: 'Start origination',
  secondaryCtaHref: '/origination',
};

// ── Corporate Development ─────────────────────────────────────────────────────

const corporateDevelopment: BuyerPageData = {
  slug: 'corporate-development',
  navLabel: 'Corporate Development',
  headline: 'Find software targets that actually fit your strategy.',
  subheadline:
    'Frontier OS helps corp dev teams test adjacency, build-vs-buy urgency, cross-sell potential, integration risk and AI capability gaps — before you spend time on NDAs.',
  badge: 'CORPORATE DEVELOPMENT',
  painPoints: [
    'Strategic fit is often asserted in CIMs, not evidenced.',
    'Product and customer overlap are unclear from public sources.',
    'Build-vs-buy logic needs structure beyond gut feel.',
    'AI capability gaps are hard to assess without a structured framework.',
    'Internal approval requires clear, source-backed evidence.',
  ],
  howHelps: [
    'Buyer thesis fit screen — how well does this target match your criteria?',
    'Synergy hypotheses surfaced from public evidence.',
    'Integration risk flags — product, customer and technology overlap.',
    'AI capability-gap view — where does the target rely on third-party AI?',
    'Next diligence questions to structure the first management call.',
  ],
  sampleCardTarget: 'VerticalOps CRM GmbH',
  sampleRows: [
    { label: 'Strategic fit',      chip: { text: 'Partial',       color: 'amber' } },
    { label: 'AI capability gap',  chip: { text: 'Identified',    color: 'amber' } },
    { label: 'Integration risk',   chip: { text: 'Moderate',      color: 'amber' } },
    { label: 'IC readiness',       chip: { text: 'Not ready',     color: 'red'   } },
    { label: 'Next action',        value: 'Confirm Handelsregister filings and product-customer overlap before progressing.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Define strategic rationale',  description: 'Adjacency thesis, build-vs-buy criteria and deal parameters.' },
    { number: 2, label: 'Screen candidate',            description: 'URL-only first-pass — strategic fit, AI risk and evidence confidence.' },
    { number: 3, label: 'Map synergy hypotheses',      description: 'Cross-sell, product overlap and capability gaps from evidence.' },
    { number: 4, label: 'Compare alternatives',        description: 'Test multiple targets against the same strategic rationale.' },
    { number: 5, label: 'Prepare internal case',       description: 'Evidence register and diligence questions for approval.' },
  ],
  lockedFeatures: [
    'Synergy hypothesis scoring against your strategy map',
    'Build-vs-buy framework with evidence weighting',
    'AI capability gap report per target',
    'Internal approval evidence pack export',
  ],
  primaryCtaLabel: 'Run strategic fit screen',
  primaryCtaHref: '/run?mode=sample',
  secondaryCtaLabel: 'Start origination',
  secondaryCtaHref: '/origination',
};

// ── Search Funds ──────────────────────────────────────────────────────────────

const searchFunds: BuyerPageData = {
  slug: 'search-funds',
  navLabel: 'Search Funds',
  headline: 'Find acquisition targets that fit a search fund operator.',
  subheadline:
    'Frontier OS ranks targets by durability, simplicity, owner-transition fit, recurring revenue, customer concentration and operational complexity.',
  badge: 'SEARCH FUNDS',
  painPoints: [
    'Too many targets look promising at surface level.',
    'Founder dependency is hard to assess from public sources.',
    'Recurring revenue is often poorly defined or undisclosed.',
    'Customer concentration can kill a deal — often discovered too late.',
    'Some software targets are too operationally complex for a first-time operator.',
  ],
  howHelps: [
    'Search fund fit score — durability, simplicity and owner-transition readiness.',
    'Operational complexity screen to identify targets beyond first-operator scope.',
    'Owner-transition diligence questions specific to search fund buyers.',
    'AI replica risk — tests whether the product is defensible without the founder.',
    'Next-action ranking across your shortlist.',
  ],
  sampleCardTarget: 'LedgerWorks Billing Ltd.',
  sampleRows: [
    { label: 'Search fund fit',       chip: { text: 'Partial',           color: 'amber' } },
    { label: 'Operational complexity',chip: { text: 'Moderate',          color: 'amber' } },
    { label: 'Founder dependency',    chip: { text: 'High — flag',       color: 'red'   } },
    { label: 'AI replica risk',       chip: { text: 'Low',               color: 'green' } },
    { label: 'Next action',           value: 'Request ARR bridge and top-customer schedule. Assess founder transition plan.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Define search thesis',        description: 'Sector, geography, ARR range and operator-fit criteria.' },
    { number: 2, label: 'Run origination',             description: 'Surface ranked targets from a buyer thesis description.' },
    { number: 3, label: 'Screen candidates',           description: 'Search fund fit score, AI risk and founder dependency signals.' },
    { number: 4, label: 'Compare shortlist',           description: 'Rank candidates by fit, evidence and transition risk.' },
    { number: 5, label: 'Prioritise next actions',     description: 'Track diligence blockers and outreach sequence in Cockpit.' },
  ],
  lockedFeatures: [
    'Operator readiness report per target',
    'Founder dependency scoring from public signals',
    'Owner-transition diligence question set',
    'Search fund lender information pack template',
  ],
  primaryCtaLabel: 'Start search fund origination',
  primaryCtaHref: '/origination',
  secondaryCtaLabel: 'Run target screen',
  secondaryCtaHref: '/run?mode=sample',
};

// ── Founders ──────────────────────────────────────────────────────────────────

const founders: BuyerPageData = {
  slug: 'founders',
  navLabel: 'Founders',
  headline: 'See what investors will challenge before they challenge it.',
  subheadline:
    'Frontier OS shows how buyers may assess your revenue quality, ARR bridge, customer concentration, AI claims, evidence gaps and IC readiness — before you enter a process.',
  badge: 'FOUNDERS',
  painPoints: [
    'Founders do not always know which assumptions buyers will challenge.',
    'Investor diligence can expose weak or inconsistent ARR definitions.',
    'AI claims in materials need evidence — "AI-powered" is not enough.',
    'Customer concentration can surface late and derail a process.',
    'CIMs often lack buyer-grade evidence for the claims they make.',
  ],
  howHelps: [
    'Founder readiness screen — see your company through a buyer lens.',
    'Investor challenge map — the questions a PE, strategic or search fund would ask.',
    'Evidence gap list — what claims are unverified from public sources.',
    'AI defensibility questions — how buyers will test your AI story.',
    'Sell-side preparation view — what to resolve before entering a process.',
  ],
  sampleCardTarget: 'Your company — buyer perspective',
  sampleRows: [
    { label: 'Buyer concern',  value: 'ARR definition unclear — bridge to cash receipts required', chip: { text: 'Flag', color: 'red' } },
    { label: 'Buyer concern',  value: 'Customer concentration not disclosed in public materials',   chip: { text: 'Flag', color: 'red' } },
    { label: 'Buyer concern',  value: 'AI usage claims not evidenced — adoption data not found',   chip: { text: 'Flag', color: 'amber' } },
    { label: 'IC readiness',   chip: { text: 'Not ready', color: 'red' } },
    { label: 'Next action',    value: 'Prepare ARR bridge, top-customer schedule and AI adoption proof before process.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Run readiness screen',    description: 'Enter your URL — Frontier OS screens as a buyer would.' },
    { number: 2, label: 'Review challenge map',    description: 'See which claims will be challenged and why.' },
    { number: 3, label: 'Identify evidence gaps',  description: 'List what buyers will find missing in public sources.' },
    { number: 4, label: 'Prepare responses',       description: 'Structure ARR bridge, customer schedule and AI evidence.' },
    { number: 5, label: 'Re-screen before process', description: 'Verify readiness before entering a formal process.' },
  ],
  lockedFeatures: [
    'Sell-side preparation report with prioritised actions',
    'Investor challenge simulator — model questions by buyer type',
    'AI defensibility evidence template',
    'Process readiness score with improvement tracker',
  ],
  primaryCtaLabel: 'Run founder readiness screen',
  primaryCtaHref: '/run?mode=sample',
  secondaryCtaLabel: 'Request private beta access',
  secondaryCtaHref: '/request-pilot',
};

// ── VC / Growth ───────────────────────────────────────────────────────────────

const vcGrowth: BuyerPageData = {
  slug: 'vc-growth',
  navLabel: 'VC / Growth',
  headline: 'Test whether software growth is durable in an AI-native market.',
  subheadline:
    'Frontier OS helps growth investors screen software companies for revenue quality, AI defensibility, product risk and evidence gaps — before the first partner meeting.',
  badge: 'VC / GROWTH',
  painPoints: [
    'AI claims are everywhere — most are not evidenced.',
    'Growth quality matters more than growth rate alone.',
    'Software moats are changing as foundation models commoditise features.',
    'Inference economics may compress margins at scale.',
    'Public signals are often incomplete or lagged.',
  ],
  howHelps: [
    'AI replica risk — could this product be rebuilt on a foundation model in 12 months?',
    'AI moat evidence — proprietary data, workflows, switching costs and network effects.',
    'Inference economics questions — margin risk as AI usage scales.',
    'Evidence confidence rating on every revenue and customer claim.',
    'Growth-quality diligence gaps — what is missing before a conviction call.',
  ],
  sampleCardTarget: 'Illustrative Target Co.',
  sampleRows: [
    { label: 'AI replica risk',      chip: { text: 'High',          color: 'red'   } },
    { label: 'AI moat evidence',     chip: { text: 'Unproven',      color: 'muted' } },
    { label: 'Revenue quality',      chip: { text: 'Partial',       color: 'amber' } },
    { label: 'Evidence confidence',  chip: { text: 'Low',           color: 'red'   } },
    { label: 'Next action',          value: 'Request AI adoption data, proprietary dataset evidence and net revenue retention before conviction call.' },
  ],
  workflowSteps: [
    { number: 1, label: 'Screen the AI story',        description: 'Replica risk, moat evidence and inference economics questions.' },
    { number: 2, label: 'Assess revenue quality',     description: 'ARR definition, retention signals and customer concentration.' },
    { number: 3, label: 'Map evidence gaps',          description: 'What is missing from public sources before the conviction call.' },
    { number: 4, label: 'Compare sector candidates',  description: 'Rank 2–5 companies by AI defensibility and evidence quality.' },
    { number: 5, label: 'Track in Cockpit',           description: 'Pipeline view with next actions and follow-up questions.' },
  ],
  lockedFeatures: [
    'Portfolio monitoring — re-screen holdings on a schedule',
    'AI moat trajectory — track defensibility over time',
    'Inference economics model per target',
    'Sector comparison dashboard across portfolio candidates',
  ],
  primaryCtaLabel: 'Run AI defensibility screen',
  primaryCtaHref: '/run?mode=sample',
  secondaryCtaLabel: 'Request private beta access',
  secondaryCtaHref: '/request-pilot',
};

// ── Export all ────────────────────────────────────────────────────────────────

export const BUYER_PAGES: BuyerPageData[] = [
  privateEquity,
  softwareRollups,
  corporateDevelopment,
  searchFunds,
  founders,
  vcGrowth,
];

export const BUYER_PAGE_MAP: Record<string, BuyerPageData> = Object.fromEntries(
  BUYER_PAGES.map(p => [p.slug, p]),
);

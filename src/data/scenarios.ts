// ─── Demo scenario data ───────────────────────────────────────────────────────
// Field names aligned to backend spec

export interface AnalysisStageData {
  id: number;
  label: string;
  evidenceFound: number;
  confidence: 'High' | 'Medium' | 'Low';
  finding: string;
  durationMs: number;
}

export interface EvidenceCard {
  field: string;
  value: string;
  status: 'verified' | 'caveat' | 'claim' | 'blocking' | 'unknown';
  source: string;
}

export interface AnalysisSummary {
  recommendation: string;
  recommendationLevel: 'green' | 'amber' | 'red' | 'blue' | 'grey';
  ic_readiness: string;
  valuation_readiness: string;
  ai_replica_risk: string;
  ai_moat: string;
  strategic_fit: string;
  next_action: string;
}

export interface DemoScenario {
  id: string;
  // Selector card metadata
  name: string;
  jurisdiction: string;
  mode: string;
  buyer_thesis: string;
  main_risk: string;
  expected_output: string;
  // Form values
  company: string;
  website: string;
  buyer: string;
  jurisdictionCode: 'uk' | 'us' | 'de' | 'unknown';
  modeCode: 'url-only' | 'doc-assisted' | 'hybrid';
  // Analysis pipeline
  analysis_stages: AnalysisStageData[];
  // Results
  analysis_summary: AnalysisSummary;
  evidence_cards: EvidenceCard[];
  diligence_questions: string[];
}

// ─── Neutral stages — used for all real URL submissions ───────────────────────
// These contain NO company-specific names, no hardcoded financial figures, and no
// verification claims. They are the single source of truth for the live analysis
// progress panel shown to users. Demo scenario stages (below) are only used in
// the sampleMode homepage loop.

export const NEUTRAL_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Preparing quality-first run',   evidenceFound: 0, confidence: 'Medium', finding: 'Preparing a source-backed run and preserving the submitted workspace context.',                                      durationMs: 1800 },
  { id: 2, label: 'Checking public website',       evidenceFound: 0, confidence: 'Medium', finding: 'Checking the submitted company website for public positioning and claims.',                                           durationMs: 2000 },
  { id: 3, label: 'Attempting registry verification', evidenceFound: 0, confidence: 'Medium', finding: 'Attempting registry and filing checks where available. Financials remain unverified unless source metadata is returned.', durationMs: 2400 },
  { id: 4, label: 'Ranking evidence',              evidenceFound: 0, confidence: 'Medium', finding: 'Separating verified facts, company claims, unknowns and diligence blockers.',                                         durationMs: 2000 },
  { id: 5, label: 'Identifying diligence gaps',    evidenceFound: 0, confidence: 'Medium', finding: 'Flagging unresolved financial, customer, retention and defensibility questions for follow-up.',                       durationMs: 2100 },
  { id: 6, label: 'Preparing result',              evidenceFound: 0, confidence: 'Medium', finding: 'Preparing the reviewer screen and saving the run summary where workspace IDs are available.',                         durationMs: 1900 },
];

// ─── Stage definitions per scenario ──────────────────────────────────────────

const ILLUSTRATIVE_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Resolve entity',             evidenceFound: 4,  confidence: 'High',   finding: 'Example target resolved. CR reference checked.',                        durationMs: 1100 },
  { id: 2, label: 'Check registry sources',     evidenceFound: 8,  confidence: 'High',   finding: 'Registry sources checked. Source tiers assigned based on available filings.',                 durationMs: 900  },
  { id: 3, label: 'Rank evidence',              evidenceFound: 18, confidence: 'Medium', finding: 'Evidence ranked by source tier. Facts, claims and blocking gaps separated.',                   durationMs: 1100 },
  { id: 4, label: 'Extract financial evidence', evidenceFound: 6,  confidence: 'Medium', finding: 'Financial evidence checked. Revenue, ARR and retention remain unverified unless supported by filings, management accounts or trusted source metadata.', durationMs: 1400 },
  { id: 5, label: 'Assess AI defensibility', evidenceFound: 3,  confidence: 'Medium', finding: 'Replica risk: medium-high. AI moat: unproven. Inference economics: unknown.',                durationMs: 1300 },
  { id: 6, label: 'Test buyer fit',          evidenceFound: 5,  confidence: 'Medium', finding: 'Adjacent fit. Strategic overlap moderate. Synergies not underwritten.',                      durationMs: 1000 },
  { id: 7, label: 'Find diligence gaps',     evidenceFound: 7,  confidence: 'High',   finding: 'ARR definition, SaaS/services split, customer concentration, AI module revenue.',            durationMs: 1200 },
  { id: 8, label: 'Build IC screen',         evidenceFound: 0,  confidence: 'High',   finding: 'Recommendation: Request Financials. IC readiness: Partial.',                                 durationMs: 900  },
];

const US_PUBLIC_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Resolve entity',          evidenceFound: 6,  confidence: 'High',   finding: 'SignalDesk Analytics Inc. resolved. SEC EDGAR filings located.',                             durationMs: 1100 },
  { id: 2, label: 'Check registry sources',     evidenceFound: 12, confidence: 'High',   finding: 'SEC 10-K and 10-Q filings accessed. 4 source tiers assigned.',                               durationMs: 900  },
  { id: 3, label: 'Rank evidence',              evidenceFound: 24, confidence: 'High',   finding: 'Evidence ranked by source tier. Facts, claims and blocking gaps separated.',                   durationMs: 1100 },
  { id: 4, label: 'Extract financial evidence', evidenceFound: 9,  confidence: 'High',   finding: 'Financial evidence extracted from SEC filings. See evidence cards for field-level confirmation status.', durationMs: 1400 },
  { id: 5, label: 'Assess AI defensibility', evidenceFound: 5,  confidence: 'Low',    finding: 'Replica risk: high. AI layer is generic. No proprietary dataset evidence.',                  durationMs: 1300 },
  { id: 6, label: 'Test buyer fit',          evidenceFound: 4,  confidence: 'Medium', finding: 'Non-core fit. Synergies speculative without cost restructuring plan.',                        durationMs: 1000 },
  { id: 7, label: 'Find diligence gaps',     evidenceFound: 6,  confidence: 'High',   finding: 'AI module defensibility, inference cost per unit, customer concentration >10%.',             durationMs: 1200 },
  { id: 8, label: 'Build IC screen',         evidenceFound: 0,  confidence: 'High',   finding: 'Recommendation: Pass. IC readiness: Not ready. High replica risk.',                          durationMs: 900  },
];

const GERMAN_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Resolve entity',          evidenceFound: 3,  confidence: 'Medium', finding: 'VerticalOps CRM GmbH. resolved. Handelsregister partially accessed.',                        durationMs: 1100 },
  { id: 2, label: 'Check registry sources',  evidenceFound: 5,  confidence: 'Medium', finding: 'Bundesanzeiger and Handelsregister accessed. Limited public filing detail.',                  durationMs: 900  },
  { id: 3, label: 'Rank evidence',              evidenceFound: 11, confidence: 'Medium', finding: 'Evidence ranked by source tier. Facts, claims and blocking gaps separated.',                   durationMs: 1100 },
  { id: 4, label: 'Extract financial evidence', evidenceFound: 4,  confidence: 'Low',    finding: 'Revenue estimated — low confidence. ARR definition absent from public filings.',              durationMs: 1400 },
  { id: 5, label: 'Assess AI defensibility', evidenceFound: 2,  confidence: 'Low',    finding: 'Replica risk: medium. AI claims unverified. No public technical disclosure.',                 durationMs: 1300 },
  { id: 6, label: 'Test buyer fit',          evidenceFound: 3,  confidence: 'Low',    finding: 'Adjacent fit possible. DACH vertical niche relevant. Synergies unconfirmed.',                 durationMs: 1000 },
  { id: 7, label: 'Find diligence gaps',     evidenceFound: 8,  confidence: 'High',   finding: 'Revenue split, ARR definition, Handelsregister full filing, ownership structure.',           durationMs: 1200 },
  { id: 8, label: 'Build IC screen',         evidenceFound: 0,  confidence: 'Medium', finding: 'Recommendation: Monitor. IC readiness: Incomplete.',                                         durationMs: 900  },
];

const DOC_ASSISTED_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Resolve entity',          evidenceFound: 4,  confidence: 'High',   finding: 'Entity resolved from buyer deck. Companies House cross-referenced.',                          durationMs: 1100 },
  { id: 2, label: 'Check registry sources',  evidenceFound: 9,  confidence: 'High',   finding: 'UK filings + CIM ingested. Document claims ranked below official filings.',                  durationMs: 900  },
  { id: 3, label: 'Rank evidence',              evidenceFound: 22, confidence: 'Medium', finding: 'Evidence ranked by source tier. Claims from CIM separated from filed accounts. Conflicts flagged.', durationMs: 1100 },
  { id: 4, label: 'Extract financial evidence', evidenceFound: 8,  confidence: 'Medium', finding: 'CIM ARR vs. filed revenue — conflict logged. EBITDA bridge required.',                       durationMs: 1400 },
  { id: 5, label: 'Assess AI defensibility', evidenceFound: 4,  confidence: 'Medium', finding: 'CIM claims AI-native positioning. No registry corroboration. Replica risk: medium.',         durationMs: 1300 },
  { id: 6, label: 'Test buyer fit',          evidenceFound: 6,  confidence: 'Medium', finding: 'Core fit claimed in CIM. Independent fit score: Adjacent / medium confidence.',               durationMs: 1000 },
  { id: 7, label: 'Find diligence gaps',     evidenceFound: 9,  confidence: 'High',   finding: 'Revenue conflict resolution, ARR waterfall, AI module economics, management accounts.',      durationMs: 1200 },
  { id: 8, label: 'Build IC screen',         evidenceFound: 0,  confidence: 'High',   finding: 'Recommendation: Request Financials. IC readiness: Partial.',                                 durationMs: 900  },
];

const SELLSIDE_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Resolve entity',          evidenceFound: 4,  confidence: 'High',   finding: 'Client entity confirmed. Filings and management pack aligned.',                              durationMs: 1100 },
  { id: 2, label: 'Check registry sources',  evidenceFound: 8,  confidence: 'High',   finding: 'Registry sources checked. Source hierarchy locked.',                                       durationMs: 900  },
  { id: 3, label: 'Rank evidence',              evidenceFound: 20, confidence: 'High',   finding: 'Evidence ranked by source tier. Facts, claims and blocking gaps separated.',                   durationMs: 1100 },
  { id: 4, label: 'Extract financial evidence', evidenceFound: 7,  confidence: 'High',   finding: 'Financial evidence extracted from filings and management accounts. See evidence cards for field-level confirmation status.', durationMs: 1400 },
  { id: 5, label: 'Assess AI defensibility', evidenceFound: 5,  confidence: 'Medium', finding: 'AI moat: partial evidence. Inference cost disclosed. Replica risk: low-medium.',            durationMs: 1300 },
  { id: 6, label: 'Test buyer fit',          evidenceFound: 7,  confidence: 'High',   finding: 'Q&A prep: 12 likely buyer questions mapped. Narrative gaps identified.',                     durationMs: 1000 },
  { id: 7, label: 'Find diligence gaps',     evidenceFound: 5,  confidence: 'High',   finding: 'Management continuity, AI roadmap evidence, customer reference readiness.',                  durationMs: 1200 },
  { id: 8, label: 'Build IC screen',         evidenceFound: 0,  confidence: 'High',   finding: 'Sell-side pack: Ready. Evidence register exportable. Buyer Q&A list generated.',            durationMs: 900  },
];

// ─── 5 demo scenarios ─────────────────────────────────────────────────────────

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'uk-add-on',
    name: 'UK vertical software add-on',
    jurisdiction: 'UK',
    mode: 'URL-only',
    buyer_thesis: 'PE platform add-on — recurring revenue, EBITDA quality, ARR confirmation',
    main_risk: 'ARR definition absent. AI replica risk medium-high.',
    expected_output: 'IC screen: Request Financials. Partial readiness.',
    company: 'Illustrative Target Co.',
    website: 'https://example.com',
    buyer: 'Generic Vertical Software Acquirer',
    jurisdictionCode: 'uk',
    modeCode: 'url-only',
    analysis_stages: ILLUSTRATIVE_STAGES,
    analysis_summary: {
      recommendation: 'Request Financials',
      recommendationLevel: 'amber',
      ic_readiness: 'Partial',
      valuation_readiness: 'Blocked pending ARR bridge',
      ai_replica_risk: 'Medium-high',
      ai_moat: 'Unproven',
      strategic_fit: 'Adjacent / medium confidence',
      next_action: 'Request ARR definition, SaaS/services split and customer concentration data.',
    },
    evidence_cards: [
      { field: 'Revenue',              value: '—',                          status: 'blocking', source: '—' },
      { field: 'Adjusted EBITDA',      value: '[illustrative]',             status: 'caveat',   source: 'Annual Report — non-GAAP' },
      { field: 'ARR',                  value: 'Claimed — definition absent', status: 'claim',    source: 'Management pack (unverified)' },
      { field: 'Customer concentration', value: '55% top-5', status: 'blocking', source: 'Not disclosed officially' },
      { field: 'AI module revenue',    value: 'Unknown',      status: 'blocking', source: 'No public disclosure' },
    ],
    diligence_questions: [
      'Provide an ARR definition and the ARR waterfall for the last 3 years.',
      'What is the SaaS / professional services revenue split?',
      'Provide customer concentration — top 5 and top 10 by revenue.',
      'What is the live AI feature revenue and inference cost per unit?',
      'Provide an EBITDA bridge from reported to adjusted EBITDA.',
    ],
  },
  {
    id: 'us-public',
    name: 'US public software screen',
    jurisdiction: 'US',
    mode: 'URL-only',
    buyer_thesis: 'Cross-border acquisition screen — public target, SEC filings available',
    main_risk: 'High AI replica risk. Generic AI layer with no proprietary dataset.',
    expected_output: 'IC screen: Pass. Not recommended.',
    company: 'SignalDesk Analytics Inc.',
    website: 'https://signaldesk.example.com',
    buyer: 'European Vertical Software Consolidator',
    jurisdictionCode: 'us',
    modeCode: 'url-only',
    analysis_stages: US_PUBLIC_STAGES,
    analysis_summary: {
      recommendation: 'Pass',
      recommendationLevel: 'red',
      ic_readiness: 'Not ready',
      valuation_readiness: 'Not applicable',
      ai_replica_risk: 'High',
      ai_moat: 'None identified',
      strategic_fit: 'Non-core',
      next_action: 'High replica risk and insufficient moat evidence. No further action recommended.',
    },
    evidence_cards: [
      { field: 'ARR',                  value: '$62.1m',       status: 'verified', source: 'SEC 10-K filing' },
      { field: 'NRR',                  value: '104%',         status: 'verified', source: 'SEC 10-K filing' },
      { field: 'Gross margin',         value: '71%',          status: 'verified', source: 'SEC 10-K filing' },
      { field: 'AI moat',              value: 'None identified', status: 'blocking', source: 'No technical disclosure' },
      { field: 'Customer concentration', value: 'Unknown',   status: 'blocking', source: 'Not disclosed' },
    ],
    diligence_questions: [
      'What proprietary dataset underpins the AI layer?',
      'Disclose inference cost per active user.',
      'What is the top-10 customer revenue concentration?',
      'Provide customer churn by cohort for the last 3 years.',
      'What is the revenue split by product line?',
    ],
  },
  {
    id: 'de-target',
    name: 'German software target',
    jurisdiction: 'DE',
    mode: 'URL-only',
    buyer_thesis: 'DACH vertical SaaS roll-up — niche product, limited public evidence',
    main_risk: 'Incomplete registry evidence. Low financial confidence.',
    expected_output: 'IC screen: Monitor. Incomplete readiness.',
    company: 'VerticalOps CRM GmbH',
    website: 'https://verticalops.example.de',
    buyer: 'DACH Software Roll-up Acquirer',
    jurisdictionCode: 'de',
    modeCode: 'url-only',
    analysis_stages: GERMAN_STAGES,
    analysis_summary: {
      recommendation: 'Monitor',
      recommendationLevel: 'blue',
      ic_readiness: 'Incomplete',
      valuation_readiness: 'Unknown',
      ai_replica_risk: 'Medium',
      ai_moat: 'Unknown',
      strategic_fit: 'Adjacent / low confidence',
      next_action: 'Request Handelsregister full filing, revenue split and ARR definition.',
    },
    evidence_cards: [
      { field: 'Revenue',              value: '~€18m est.',   status: 'claim',    source: 'Aggregator estimate (low confidence)' },
      { field: 'Adjusted EBITDA',      value: 'Unknown',      status: 'blocking', source: 'No public filing' },
      { field: 'ARR',                  value: 'Not disclosed', status: 'blocking', source: 'No public disclosure' },
      { field: 'Ownership structure',  value: 'Partially clear', status: 'caveat', source: 'Handelsregister — partial' },
      { field: 'AI claims',            value: 'Unverified',   status: 'claim',    source: 'Website only' },
    ],
    diligence_questions: [
      'Provide full Handelsregister filings and ownership chain.',
      'What is the ARR definition and ARR for the last 3 years?',
      'What is the SaaS vs. services revenue split?',
      'Provide customer concentration — top 5 by revenue.',
      'What AI features are live and generating revenue?',
    ],
  },
  {
    id: 'doc-assisted',
    name: 'Document-assisted buyer deck review',
    jurisdiction: 'UK',
    mode: 'Document-assisted',
    buyer_thesis: 'Buy-side: validate CIM claims against official filings',
    main_risk: 'CIM ARR vs. filed revenue conflict. 2 blocking conflicts.',
    expected_output: 'IC screen: Request Financials. Conflict report included.',
    company: 'BuyerDeck Target Ltd.',
    website: 'https://buyerdeck-target.example.com',
    buyer: 'UK Mid-Market PE Acquirer',
    jurisdictionCode: 'uk',
    modeCode: 'doc-assisted',
    analysis_stages: DOC_ASSISTED_STAGES,
    analysis_summary: {
      recommendation: 'Request Financials',
      recommendationLevel: 'amber',
      ic_readiness: 'Partial',
      valuation_readiness: 'Blocked pending revenue conflict resolution',
      ai_replica_risk: 'Medium',
      ai_moat: 'Unproven',
      strategic_fit: 'Adjacent / medium confidence',
      next_action: 'Resolve CIM vs. filed revenue conflict. Request management accounts and ARR waterfall.',
    },
    evidence_cards: [
      { field: 'Revenue (filed)',        value: '£38.2m (example)', status: 'caveat', source: 'Example · Companies House' },
      { field: 'ARR (CIM claim)',       value: '£24m claimed', status: 'claim',    source: 'CIM — management pack' },
      { field: 'Revenue conflict',      value: '£14.2m gap',   status: 'blocking', source: 'CIM vs. Companies House' },
      { field: 'Adjusted EBITDA',       value: 'Not reconciled', status: 'blocking', source: 'EBITDA bridge required' },
      { field: 'AI positioning claim',  value: 'AI-native (unverified)', status: 'claim', source: 'CIM only' },
    ],
    diligence_questions: [
      'Reconcile the CIM ARR of £24m with filed revenue of £38.2m.',
      'Provide an EBITDA bridge from reported to adjusted EBITDA.',
      'Confirm the ARR definition and provide the ARR waterfall.',
      'What AI features are live, monetised and customer-facing?',
      'Provide customer concentration — top 5 and top 10 by revenue.',
    ],
  },
  {
    id: 'sell-side',
    name: 'Sell-side preparation',
    jurisdiction: 'UK',
    mode: 'Document-assisted',
    buyer_thesis: 'Sell-side Q&A prep — surface buyer questions before process launch',
    main_risk: 'AI roadmap narrative gaps. Management continuity questions.',
    expected_output: 'Sell-side pack: Ready. Buyer Q&A list generated.',
    company: 'ClientCo Software Ltd.',
    website: 'https://clientco.example.com',
    buyer: 'Sell-side preparation (no buyer)',
    jurisdictionCode: 'uk',
    modeCode: 'doc-assisted',
    analysis_stages: SELLSIDE_STAGES,
    analysis_summary: {
      recommendation: 'Pursue',
      recommendationLevel: 'green',
      ic_readiness: 'Ready',
      valuation_readiness: 'Caveated — AI roadmap needs supporting evidence',
      ai_replica_risk: 'Low-medium',
      ai_moat: 'Partial evidence',
      strategic_fit: 'Core / high confidence',
      next_action: 'Prepare customer reference list and AI roadmap evidence pack before process launch.',
    },
    evidence_cards: [
      { field: 'Revenue',              value: '£31.8m (example)', status: 'caveat', source: 'Example · Companies House' },
      { field: 'ARR',                  value: '£28.5m',       status: 'verified', source: 'Management accounts' },
      { field: 'NRR',                  value: '109%',         status: 'caveat',   source: 'Management estimate' },
      { field: 'AI roadmap evidence',  value: 'Partial',      status: 'caveat',   source: 'Internal documentation' },
      { field: 'Management continuity', value: 'Unknown',     status: 'blocking', source: 'Not disclosed to buyers' },
    ],
    diligence_questions: [
      'Prepare a management continuity and retention plan for the process.',
      'Compile AI roadmap evidence with customer validation.',
      'Prepare customer reference list with NPS or case study data.',
      'Prepare an ARR waterfall and churn analysis for the last 3 years.',
      'Compile a buyer Q&A response pack from the evidence register.',
    ],
  },
];

// Default scenario (pre-filled on first load)
export const DEFAULT_SCENARIO = DEMO_SCENARIOS[0];

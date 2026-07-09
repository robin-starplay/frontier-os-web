/**
 * Frontier OS — lightweight browser-local run history store
 *
 * Persists URL analysis and compare results to localStorage so the Deal
 * Cockpit can show real user runs without requiring a backend account.
 *
 * Key: 'fos_run_history'
 */

import type { AnalysisResult, CompareResult } from './frontierApi';

/** Structured summary saved when a document review is stored in the Cockpit.
 *  Does NOT include raw file content — only extracted structured data. */
export interface DocumentReviewSummary {
  document_name:        string;
  document_type?:       string;
  confidentiality_flag: boolean;
  claims_count:         number;
  metrics_count:        number;
  top_financial_claims?: string[];
  key_unknowns?:        string[];
  blocker_count?:       number;
  evidence_confidence?: string;
  next_action:          string;
}

export interface RunEntry {
  id: string;
  type: 'url' | 'compare' | 'document' | 'origination';
  timestamp: string;           // ISO 8601
  company: string;
  website: string;
  recommendation: string;
  recommendation_level: 'green' | 'amber' | 'red' | 'blue' | 'grey';
  ic_readiness: string;
  valuation_readiness: string;
  strategic_fit_label: string;
  evidence_confidence: string;
  ai_replica_risk: string;
  blockers: string[];
  next_action: string;
  // Full result payload — available for URL runs, null for compare/document entries
  result: AnalysisResult | null;
  compareResult?: CompareResult;
  /** Structured summary for document review runs — never contains raw file content. */
  documentSummary?: DocumentReviewSummary;
}

const STORAGE_KEY = 'fos_run_history';
const COCKPIT_TARGETS_KEY = 'frontier_cockpit_targets';
const MAX_ENTRIES = 30;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') {
    const rec = asRecord(value);
    return textValue(rec.title ?? rec.blocker ?? rec.field ?? rec.claim_text ?? rec.summary ?? rec.value ?? rec.next_action, fallback);
  }
  const text = String(value).trim();
  return text || fallback;
}

function isGenericFinancialAction(value: string): boolean {
  const normalised = value.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalised === 'request latest accounts, management accounts and arr bridge.'
    || normalised === 'request latest accounts, management accounts and arr bridge';
}

function blockerText(item: unknown): string {
  const rec = asRecord(item);
  return textValue(rec.title ?? rec.blocker ?? rec.field ?? rec.claim_text ?? item);
}

function resultBlockers(result: AnalysisResult): string[] {
  const rawResult = result as unknown as Record<string, unknown>;
  const structured = [
    ...asArray(rawResult.actionable_diligence_blockers),
    ...asArray(result.diligence_blockers),
  ];
  const fromStructured = structured.map(blockerText).filter(Boolean);
  const fromCards = result.evidence_cards
    ?.filter((c) => c.status === 'blocking')
    .map((c) => c.field)
    .filter(Boolean) ?? [];
  return Array.from(new Set([...fromStructured, ...fromCards]));
}

function keyEvidenceHighlight(result: AnalysisResult): string {
  const verified = asArray(result.verified_facts);
  const claims = asArray(result.claims);
  const item = verified[0] ?? claims[0];
  const rec = asRecord(item);
  return textValue(rec.title ?? rec.field ?? rec.claim_type ?? rec.claim_text ?? rec.summary ?? rec.value ?? item);
}

function targetSpecificNextAction(result: AnalysisResult): string {
  if (result.next_action && !isGenericFinancialAction(result.next_action)) return result.next_action;
  const blockers = resultBlockers(result);
  const highlight = keyEvidenceHighlight(result);
  const company = result.company || result.company_name || 'Target';
  if (highlight && /revenue|turnover/i.test(highlight)) {
    return `${company}: ${highlight}; request ARR bridge, retention, churn and customer concentration.`;
  }
  if (blockers.length > 0) {
    return `${company}: ${blockers[0]}; request the source documents needed to verify before IC.`;
  }
  return `${company}: Review evidence gaps before IC use.`;
}

function generateId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Normalize a raw storage object into a valid RunEntry with safe defaults. */
function normalizeEntry(raw: unknown): RunEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== 'string' || typeof e.company !== 'string') return null;
  const validLevels = new Set(['green', 'amber', 'red', 'blue', 'grey']);
  return {
    id:                   String(e.id),
    type:                 e.type === 'compare' ? 'compare' : e.type === 'document' ? 'document' : e.type === 'origination' ? 'origination' : 'url',
    timestamp:            typeof e.timestamp === 'string' ? e.timestamp : new Date().toISOString(),
    company:              String(e.company),
    website:              typeof e.website === 'string' ? e.website : '',
    recommendation:       typeof e.recommendation === 'string' ? e.recommendation : '',
    recommendation_level: validLevels.has(String(e.recommendation_level))
                            ? (e.recommendation_level as RunEntry['recommendation_level'])
                            : 'grey',
    ic_readiness:         typeof e.ic_readiness === 'string' ? e.ic_readiness : '',
    valuation_readiness:  typeof e.valuation_readiness === 'string' ? e.valuation_readiness : '',
    strategic_fit_label:  typeof e.strategic_fit_label === 'string' ? e.strategic_fit_label : '',
    evidence_confidence:  typeof e.evidence_confidence === 'string' ? e.evidence_confidence : '',
    ai_replica_risk:      typeof e.ai_replica_risk === 'string' ? e.ai_replica_risk : '',
    blockers:             Array.isArray(e.blockers)
                            ? (e.blockers as unknown[]).filter(b => typeof b === 'string') as string[]
                            : [],
    next_action:          typeof e.next_action === 'string' ? e.next_action : '',
    result:               (e.result && typeof e.result === 'object') ? (e.result as RunEntry['result']) : null,
    compareResult:        e.compareResult as RunEntry['compareResult'] | undefined,
    documentSummary:      e.documentSummary as RunEntry['documentSummary'] | undefined,
  };
}

export function getRuns(): RunEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((e): e is RunEntry => e !== null);
  } catch {
    return [];
  }
}

function persistRuns(entries: RunEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage not available (private browsing quota, etc.) — silently skip
  }
}

function normalizeWebsite(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function cockpitTargetKey(target: { company_name: string; website: string; jurisdiction: string }): string {
  const website = normalizeWebsite(target.website).toLowerCase();
  if (website) return `website:${website}`;
  return `name:${target.company_name.trim().toLowerCase()}|${target.jurisdiction.trim().toLowerCase()}`;
}

function readCockpitTargets(): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COCKPIT_TARGETS_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
      : [];
  } catch {
    return [];
  }
}

function persistCockpitTarget(entry: RunEntry, workflowState?: unknown): void {
  if (!entry.website || entry.type === 'origination' || entry.type === 'compare') return;
  const target = {
    company_name: entry.company,
    website: normalizeWebsite(entry.website),
    jurisdiction: 'UK',
    source: 'cockpit',
    source_label: 'Saved Cockpit target',
    screening_status: 'screened',
    compare_ready: true,
    saved_at: entry.timestamp,
    run_id: entry.id,
    recommendation: entry.recommendation,
    evidence_confidence: entry.evidence_confidence,
    workflow_state: workflowState ?? {
      stage: 'cockpit_target',
      recommended_next_step: 'compare',
      screening_status: 'screened',
      compare_readiness: 'ready',
      cockpit_readiness: 'ready',
    },
  };
  try {
    const key = cockpitTargetKey(target);
    const existing = readCockpitTargets().filter(item => {
      const itemKey = cockpitTargetKey({
        company_name: textValue(item.company_name),
        website: textValue(item.website),
        jurisdiction: textValue(item.jurisdiction, 'UK'),
      });
      return itemKey !== key;
    });
    localStorage.setItem(COCKPIT_TARGETS_KEY, JSON.stringify([target, ...existing].slice(0, MAX_ENTRIES)));
  } catch {
    // Keep existing run-history save working even when this compatibility cache fails.
  }
}

/** Save a URL analysis result. De-dupes by company name (most recent wins). */
export function saveUrlRun(result: AnalysisResult, website: string): RunEntry {
  const blockers = resultBlockers(result);

  const entry: RunEntry = {
    id: generateId(),
    type: 'url',
    timestamp: new Date().toISOString(),
    company: result.company,
    website,
    recommendation: result.recommendation,
    recommendation_level: result.recommendation_level,
    ic_readiness: result.ic_readiness,
    valuation_readiness: result.valuation_readiness,
    strategic_fit_label: result.strategic_fit_label,
    evidence_confidence: result.evidence_confidence,
    ai_replica_risk: result.ai_replica_risk,
    blockers,
    next_action: targetSpecificNextAction(result),
    result,
  };

  // Most-recent run for the same company replaces the old one
  const existing = getRuns().filter(
    (e) => !(e.type === 'url' && e.company === result.company),
  );
  persistRuns([entry, ...existing]);
  persistCockpitTarget(entry, (result as unknown as Record<string, unknown>).workflow_state);
  return entry;
}

/** Save compare results — one RunEntry per target company. */
export function saveCompareRun(compareResult: CompareResult): RunEntry[] {
  const timestamp = new Date().toISOString();

  const entries: RunEntry[] = compareResult.targets.map((t) => ({
    id: generateId(),
    type: 'compare' as const,
    timestamp,
    company: t.company,
    website: t.url ?? '',
    recommendation: t.recommendation,
    recommendation_level: t.recommendation_level,
    ic_readiness:
      t.recommendation_level === 'green'
        ? 'Ready'
        : t.recommendation_level === 'red'
          ? 'Not ready'
          : 'Partial',
    valuation_readiness: '',
    strategic_fit_label: t.strategic_fit,
    evidence_confidence: t.evidence_confidence,
    ai_replica_risk: t.ai_replica_risk,
    blockers: t.blockers ?? [],
    next_action: t.next_action,
    result: null,
    compareResult,
  }));

  const comparedNames = new Set(compareResult.targets.map((t) => t.company));
  const existing = getRuns().filter((e) => !comparedNames.has(e.company));
  persistRuns([...entries, ...existing]);
  return entries;
}

/** Save a document review summary. De-dupes by company name (most recent wins).
 *  Never stores raw file content — only structured extraction results. */
export function saveDocumentRun(params: {
  documentName:        string;
  companyName:         string;
  website?:            string;
  documentType?:       string;
  confidentiality_flag: boolean;
  claims_count:        number;
  metrics_count:       number;
  topFinancialClaims?: string[];
  keyUnknowns?:        string[];
  blockers?:           string[];
  evidenceConfidence?: string;
  next_action:         string;
}): RunEntry {
  const {
    documentName, companyName, website = '', documentType, confidentiality_flag,
    claims_count, metrics_count, topFinancialClaims = [], keyUnknowns = [], blockers = [],
    evidenceConfidence = 'Claim, not verified', next_action,
  } = params;

  const entry: RunEntry = {
    id:                   generateId(),
    type:                 'document',
    timestamp:            new Date().toISOString(),
    company:              companyName,
    website,
    recommendation:       next_action,
    recommendation_level: confidentiality_flag ? 'amber' : 'grey',
    ic_readiness:         `${claims_count} claims · ${metrics_count} metrics`,
    valuation_readiness:  '',
    strategic_fit_label:  '',
    evidence_confidence:  evidenceConfidence,
    ai_replica_risk:      '',
    blockers,
    next_action,
    result:               null,
    documentSummary: {
      document_name:        documentName,
      document_type:        documentType,
      confidentiality_flag,
      claims_count,
      metrics_count,
      top_financial_claims: topFinancialClaims,
      key_unknowns:         keyUnknowns,
      blocker_count:        blockers.length,
      evidence_confidence:  evidenceConfidence,
      next_action,
    },
  };

  const existing = getRuns().filter(
    (e) => !(e.type === 'document' && e.company === companyName),
  );
  persistRuns([entry, ...existing]);
  persistCockpitTarget(entry, {
    stage: 'cockpit_target',
    recommended_next_step: 'compare',
    screening_status: 'screened',
    compare_readiness: website ? 'ready' : 'missing_website',
    cockpit_readiness: 'ready',
  });
  return entry;
}

/** Save a reference-universe origination candidate. This is a signal-only entry,
 *  not a verified URL analysis result. */
export function saveOriginationTarget(params: {
  companyName: string;
  website?: string;
  sector?: string;
  country?: string;
  fitScore?: string;
  evidenceConfidence?: string;
  aiRisk?: string;
  whyItFits?: string;
  missingEvidence?: string[];
  nextAction?: string;
}): RunEntry {
  const {
    companyName,
    website = '',
    sector = '',
    country = '',
    fitScore = '',
    evidenceConfidence = 'Low',
    aiRisk = 'Unknown',
    whyItFits = '',
    missingEvidence = [],
    nextAction = 'Run URL screen before outreach or IC use.',
  } = params;

  const entry: RunEntry = {
    id:                   generateId(),
    type:                 'origination',
    timestamp:            new Date().toISOString(),
    company:              companyName,
    website,
    recommendation:       fitScore ? `Reference fit ${fitScore}/10` : 'Reference target candidate',
    recommendation_level: 'blue',
    ic_readiness:         'Signal only',
    valuation_readiness:  '',
    strategic_fit_label:  [sector, country].filter(Boolean).join(' · '),
    evidence_confidence:  evidenceConfidence,
    ai_replica_risk:      aiRisk,
    blockers:             missingEvidence,
    next_action:          nextAction || whyItFits || 'Run URL screen before outreach or IC use.',
    result:               null,
  };

  const existing = getRuns().filter(
    (e) => !(e.type === 'origination' && e.company === companyName),
  );
  persistRuns([entry, ...existing]);
  return entry;
}

export function clearRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COCKPIT_TARGETS_KEY);
  } catch {
    // silently skip
  }
}

export function removeRun(runId: string): RunEntry[] {
  const removed = getRuns().find((entry) => entry.id === runId);
  const updated = getRuns().filter((entry) => entry.id !== runId);
  persistRuns(updated);
  if (removed) {
    try {
      const removedKey = cockpitTargetKey({
        company_name: removed.company,
        website: removed.website,
        jurisdiction: 'UK',
      });
      const targets = readCockpitTargets().filter(item => {
        const runMatches = textValue(item.run_id) === runId;
        const keyMatches = cockpitTargetKey({
          company_name: textValue(item.company_name),
          website: textValue(item.website),
          jurisdiction: textValue(item.jurisdiction, 'UK'),
        }) === removedKey;
        return !runMatches && !keyMatches;
      });
      localStorage.setItem(COCKPIT_TARGETS_KEY, JSON.stringify(targets));
    } catch {
      // Best-effort compatibility cache cleanup.
    }
  }
  return updated;
}

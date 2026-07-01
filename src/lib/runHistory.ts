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
  confidentiality_flag: boolean;
  claims_count:         number;
  metrics_count:        number;
  next_action:          string;
}

export interface RunEntry {
  id: string;
  type: 'url' | 'compare' | 'document';
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
    type:                 e.type === 'compare' ? 'compare' : e.type === 'document' ? 'document' : 'url',
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
  confidentiality_flag: boolean;
  claims_count:        number;
  metrics_count:       number;
  next_action:         string;
}): RunEntry {
  const {
    documentName, companyName, confidentiality_flag,
    claims_count, metrics_count, next_action,
  } = params;

  const entry: RunEntry = {
    id:                   generateId(),
    type:                 'document',
    timestamp:            new Date().toISOString(),
    company:              companyName,
    website:              '',
    recommendation:       next_action,
    recommendation_level: confidentiality_flag ? 'amber' : 'grey',
    ic_readiness:         `${claims_count} claims · ${metrics_count} metrics`,
    valuation_readiness:  '',
    strategic_fit_label:  '',
    evidence_confidence:  'Claim, not verified',
    ai_replica_risk:      '',
    blockers:             [],
    next_action,
    result:               null,
    documentSummary: {
      document_name:        documentName,
      confidentiality_flag,
      claims_count,
      metrics_count,
      next_action,
    },
  };

  const existing = getRuns().filter(
    (e) => !(e.type === 'document' && e.company === companyName),
  );
  persistRuns([entry, ...existing]);
  return entry;
}

export function clearRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently skip
  }
}

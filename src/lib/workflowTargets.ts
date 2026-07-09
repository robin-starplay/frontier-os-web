import { normalizeWebsiteUrl } from '@/lib/urlUtils';

export const LAST_ORIGINATION_RESULT_KEY = 'frontier_last_origination_result';
export const SELECTED_CANDIDATES_KEY = 'frontier_selected_candidates';
export const SAVED_LEADS_KEY = 'frontier_saved_leads';
export const COMPARE_CANDIDATES_KEY = 'frontier_compare_candidates';
export const COCKPIT_TARGETS_KEY = 'frontier_cockpit_targets';
export const COCKPIT_COMPARE_SELECTION_KEY = 'frontier_cockpit_compare_selection';

export interface WorkflowTarget {
  id: string;
  company_name: string;
  website: string;
  jurisdiction: string;
  sector: string;
  source: string;
  source_label: string;
  source_url: string;
  candidate_quality: string;
  website_status: string;
  run_ready: boolean;
  compare_ready: boolean;
  screening_status: string;
  saved_at: string;
  run_id: string;
  recommendation: string;
  evidence_confidence: string;
  candidate_type?: string;
  source_page_title?: string;
  compare_note?: string;
  fit_score_100?: number | null;
  raw?: Record<string, unknown>;
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readArray(key: string): Record<string, unknown>[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item === 'object').map(item => item as Record<string, unknown>)
      : [];
  } catch {
    return [];
  }
}

function writeArray(key: string, items: WorkflowTarget[]): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function readRecord(key: string): Record<string, unknown> {
  if (!storageAvailable()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    const rendered = value.map(item => textValue(item)).filter(Boolean).join(', ');
    return rendered || fallback;
  }
  if (typeof value === 'object') {
    const rec = asRecord(value);
    return textValue(rec.company_name ?? rec.company ?? rec.name ?? rec.title ?? rec.value ?? rec.summary, fallback);
  }
  const text = String(value).trim();
  return text || fallback;
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(textValue(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function workflowTargetKey(target: Pick<WorkflowTarget, 'company_name' | 'website' | 'jurisdiction'>): string {
  const website = normalizeWebsiteUrl(target.website || '').trim().toLowerCase();
  if (website) return `website:${website}`;
  return `name:${target.company_name.trim().toLowerCase()}|${target.jurisdiction.trim().toLowerCase()}`;
}

export function normalizeWorkflowTarget(raw: unknown): WorkflowTarget | null {
  const item = asRecord(raw);
  const result = asRecord(item.result);
  const workflowState = asRecord(item.workflow_state ?? result.workflow_state);
  const companyName = textValue(item.company_name ?? item.company ?? item.name ?? result.company_name ?? result.company, '');
  const website = normalizeWebsiteUrl(textValue(item.website ?? item.url ?? item.company_url ?? result.website ?? result.url, ''));
  const jurisdiction = textValue(item.jurisdiction ?? item.country ?? item.geo, 'unknown');
  const source = textValue(item.source ?? item.type, 'saved');
  const sourceUrl = textValue(item.source_url ?? item.source_page_url, '');
  if (!companyName && !website && !sourceUrl) return null;

  const screeningStatus = textValue(item.screening_status ?? workflowState.screening_status, source === 'cockpit' || source === 'run' ? 'screened' : 'not_screened');
  const candidateType = textValue(item.candidate_type, '');
  const hasEvidence = Boolean(
    item.saved_to_cockpit === true
    || result.saved_to_cockpit === true
    || asArray(item.verified_facts).length
    || asArray(item.claims).length
    || asArray(item.unknowns).length
    || asArray(item.blockers).length
    || asArray(result.verified_facts).length
    || asArray(result.claims).length
    || asArray(result.unknowns).length
    || asArray(result.diligence_blockers).length
  );
  const isScreened = screeningStatus === 'screened' || source === 'cockpit' || source === 'run' || hasEvidence;
  const runReady = item.run_ready === true || (Boolean(website) && item.run_ready !== false);
  const compareReady = item.compare_ready === true || (Boolean(companyName && website) && isScreened && item.compare_ready !== false);
  const target: WorkflowTarget = {
    id: textValue(item.id ?? item.cockpit_target_id ?? item.run_id, ''),
    company_name: companyName || textValue(item.source_page_title ?? item.title, 'Saved lead'),
    website,
    jurisdiction,
    sector: textValue(item.sector ?? item.vertical, ''),
    source,
    source_label: textValue(item.source_label, source === 'cockpit' ? 'Saved Cockpit target' : source === 'origination' ? 'Origination' : 'Saved target'),
    source_url: sourceUrl,
    candidate_quality: textValue(item.candidate_quality, ''),
    website_status: website ? textValue(item.website_status, 'known') : textValue(item.website_status, 'missing'),
    run_ready: runReady,
    compare_ready: compareReady,
    screening_status: isScreened ? 'screened' : screeningStatus,
    saved_at: textValue(item.saved_at ?? item.created_at ?? item.timestamp, ''),
    run_id: textValue(item.run_id ?? item.id, ''),
    recommendation: textValue(item.recommendation ?? result.recommendation, ''),
    evidence_confidence: textValue(item.evidence_confidence ?? item.evidence_status ?? result.evidence_confidence, ''),
    candidate_type: candidateType || undefined,
    source_page_title: textValue(item.source_page_title ?? item.source_title, '') || undefined,
    compare_note: textValue(item.compare_note, '') || undefined,
    fit_score_100: numericOrNull(item.fit_score_100 ?? item.fit_score ?? item.score),
    raw: item,
  };
  if (!target.id) target.id = workflowTargetKey(target);
  return target;
}

export function dedupeTargets(targets: Array<WorkflowTarget | null | undefined>): WorkflowTarget[] {
  const byKey = new Map<string, WorkflowTarget>();
  targets.filter(Boolean).forEach(target => {
    const item = target as WorkflowTarget;
    const key = workflowTargetKey(item);
    const existing = byKey.get(key);
    if (!existing || (!existing.compare_ready && item.compare_ready) || (!existing.screening_status.includes('screened') && item.screening_status === 'screened')) {
      byKey.set(key, item);
    }
  });
  return Array.from(byKey.values());
}

function originationResultTargets(): WorkflowTarget[] {
  const result = readRecord(LAST_ORIGINATION_RESULT_KEY);
  const lists = [
    result.confirmed_company_candidates,
    result.targets,
    result.ranked_targets,
    result.candidates,
    result.needs_website_confirmation,
    result.possible_leads_needing_website,
  ].filter(Array.isArray) as unknown[][];
  return lists
    .flat()
    .map(item => normalizeWorkflowTarget({ ...(asRecord(item)), source: 'origination' }))
    .filter((item): item is WorkflowTarget => item !== null);
}

export function getOriginationTargets(): WorkflowTarget[] {
  return dedupeTargets([
    ...originationResultTargets(),
    ...readArray(SELECTED_CANDIDATES_KEY).map(item => normalizeWorkflowTarget({ ...item, source: textValue(item.source, 'origination') })),
  ]);
}

export function getSavedLeads(): WorkflowTarget[] {
  return dedupeTargets(readArray(SAVED_LEADS_KEY).map(item => normalizeWorkflowTarget({ ...item, source: textValue(item.source, 'lead') })));
}

export function getCockpitTargets(): WorkflowTarget[] {
  return dedupeTargets([
    ...readArray(COCKPIT_TARGETS_KEY).map(item => normalizeWorkflowTarget({ ...item, source: textValue(item.source, 'cockpit') })),
    ...readArray(COCKPIT_COMPARE_SELECTION_KEY).map(item => normalizeWorkflowTarget({ ...item, source: textValue(item.source, 'cockpit') })),
  ]);
}

export function getCompareCandidates(): WorkflowTarget[] {
  return dedupeTargets(readArray(COMPARE_CANDIDATES_KEY).map(item => normalizeWorkflowTarget(item)));
}

export function saveLead(target: unknown): WorkflowTarget | null {
  const normalized = normalizeWorkflowTarget({ ...asRecord(target), source: textValue(asRecord(target).source, 'lead'), saved_at: new Date().toISOString() });
  if (!normalized) return null;
  normalized.compare_ready = false;
  normalized.screening_status = normalized.screening_status === 'screened' ? normalized.screening_status : 'not_screened';
  writeArray(SAVED_LEADS_KEY, dedupeTargets([normalized, ...getSavedLeads()]));
  return normalized;
}

export function saveCockpitTarget(target: unknown): WorkflowTarget | null {
  const normalized = normalizeWorkflowTarget({
    ...asRecord(target),
    source: textValue(asRecord(target).source, 'cockpit'),
    source_label: textValue(asRecord(target).source_label, 'Saved Cockpit target'),
    screening_status: 'screened',
    compare_ready: true,
    saved_at: textValue(asRecord(target).saved_at, new Date().toISOString()),
  });
  if (!normalized || !normalized.website) return null;
  writeArray(COCKPIT_TARGETS_KEY, dedupeTargets([normalized, ...getCockpitTargets()]));
  return normalized;
}

export function saveCompareCandidates(targets: unknown[]): WorkflowTarget[] {
  const normalized = dedupeTargets(targets.map(normalizeWorkflowTarget)).slice(0, 10);
  writeArray(COMPARE_CANDIDATES_KEY, normalized);
  return normalized;
}

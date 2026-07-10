import { normalizeWebsiteUrl } from '@/lib/urlUtils';

export const LAST_ORIGINATION_RESULT_KEY = 'frontier_last_origination_result';
export const SELECTED_CANDIDATES_KEY = 'frontier_selected_candidates';
export const SAVED_LEADS_KEY = 'frontier_saved_leads';
export const COMPARE_CANDIDATES_KEY = 'frontier_compare_candidates';
export const COCKPIT_TARGETS_KEY = 'frontier_cockpit_targets';
export const COCKPIT_COMPARE_SELECTION_KEY = 'frontier_cockpit_compare_selection';

export interface WorkflowTarget {
  [key: string]: unknown;
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
  user_supplied_evidence?: Record<string, unknown>;
  cockpit_target_id?: string;
  storage_source?: string;
  raw?: Record<string, unknown>;
}

export type WorkflowTargetMatcher =
  | string
  | {
      id?: string;
      cockpit_target_id?: string;
      run_id?: string;
      company_name?: string;
      website?: string;
      jurisdiction?: string;
    }
  | ((target: WorkflowTarget) => boolean);

export type WorkflowTargetPatch = Partial<Omit<WorkflowTarget, 'raw'>> & Record<string, unknown>;

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

function writeRecord(key: string, item: Record<string, unknown>): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(item));
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

function normaliseTextKey(value: unknown): string {
  return textValue(value).trim().toLowerCase();
}

function mergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  return { ...base, ...patch };
}

function normalizeWithRaw(raw: unknown): WorkflowTarget | null {
  const record = asRecord(raw);
  const normalized = normalizeWorkflowTarget(record);
  return normalized ? { ...record, ...normalized, raw: record } : null;
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
    user_supplied_evidence: asRecord(item.user_supplied_evidence),
    cockpit_target_id: textValue(item.cockpit_target_id, '') || undefined,
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

function targetMatches(target: WorkflowTarget, matcher: WorkflowTargetMatcher): boolean {
  if (typeof matcher === 'function') return matcher(target);

  if (typeof matcher === 'string') {
    const value = normaliseTextKey(matcher);
    const normalizedWebsite = normalizeWebsiteUrl(matcher).trim().toLowerCase();
    return [
      target.id,
      target.cockpit_target_id,
      target.run_id,
      workflowTargetKey(target),
      target.website,
    ].some(candidate => normaliseTextKey(candidate) === value)
      || Boolean(normalizedWebsite && normalizeWebsiteUrl(target.website).trim().toLowerCase() === normalizedWebsite);
  }

  const matcherWebsite = normalizeWebsiteUrl(textValue(matcher.website, '')).trim().toLowerCase();
  const targetWebsite = normalizeWebsiteUrl(target.website || '').trim().toLowerCase();
  if (matcherWebsite && targetWebsite && matcherWebsite === targetWebsite) return true;

  if (matcher.id && normaliseTextKey(target.id) === normaliseTextKey(matcher.id)) return true;
  if (matcher.cockpit_target_id && normaliseTextKey(target.cockpit_target_id) === normaliseTextKey(matcher.cockpit_target_id)) return true;
  if (matcher.run_id && normaliseTextKey(target.run_id) === normaliseTextKey(matcher.run_id)) return true;

  const matcherName = normaliseTextKey(matcher.company_name);
  const matcherJurisdiction = normaliseTextKey(matcher.jurisdiction || 'unknown');
  const targetName = normaliseTextKey(target.company_name);
  const targetJurisdiction = normaliseTextKey(target.jurisdiction || 'unknown');
  return Boolean(matcherName && targetName && matcherName === targetName && matcherJurisdiction === targetJurisdiction);
}

function patchTarget(raw: unknown, patch: WorkflowTargetPatch): Record<string, unknown> | null {
  const base = asRecord(raw);
  const normalized = normalizeWorkflowTarget(base);
  if (!normalized) return null;
  const merged = mergeRecords(base, patch);
  if (patch.website || patch.company_url) {
    merged.website = normalizeWebsiteUrl(textValue(patch.website ?? patch.company_url, ''));
    merged.website_status = merged.website ? 'known' : textValue(merged.website_status, 'missing');
    merged.run_ready = Boolean(merged.website);
  }
  return merged;
}

function updateArrayByMatcher(items: Record<string, unknown>[], matcher: WorkflowTargetMatcher, patch: WorkflowTargetPatch): {
  items: WorkflowTarget[];
  changed: boolean;
  updated: WorkflowTarget[];
} {
  const updated: WorkflowTarget[] = [];
  let changed = false;
  const next = items.map(item => {
    const normalized = normalizeWorkflowTarget(item);
    if (!normalized || !targetMatches(normalized, matcher)) return normalizeWorkflowTarget(item);
    const patchedRaw = patchTarget(item, patch);
    const patched = normalizeWithRaw(patchedRaw);
    if (patched) {
      changed = true;
      updated.push(patched);
      return patched;
    }
    return normalized;
  }).filter((item): item is WorkflowTarget => item !== null);

  return { items: dedupeTargets(next), changed, updated };
}

const ORIGINATION_TARGET_LIST_KEYS = [
  'confirmed_company_candidates',
  'targets',
  'ranked_targets',
  'candidates',
  'needs_website_confirmation',
  'possible_leads_needing_website',
];

function updateOriginationResultByMatcher(matcher: WorkflowTargetMatcher, patch: WorkflowTargetPatch): WorkflowTarget[] {
  const result = readRecord(LAST_ORIGINATION_RESULT_KEY);
  if (Object.keys(result).length === 0) return [];

  const updated: WorkflowTarget[] = [];
  let changed = false;
  const next = { ...result };

  ORIGINATION_TARGET_LIST_KEYS.forEach(key => {
    const list = asArray(result[key]).filter(item => item && typeof item === 'object') as Record<string, unknown>[];
    if (list.length === 0) return;
    const patched = updateArrayByMatcher(
      list.map(item => ({ ...item, source: textValue(item.source, 'origination') })),
      matcher,
      patch,
    );
    if (patched.changed) {
      changed = true;
      updated.push(...patched.updated);
      next[key] = patched.items;
    }
  });

  if (changed) writeRecord(LAST_ORIGINATION_RESULT_KEY, next);
  return dedupeTargets(updated);
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

export function getAllWorkflowTargets(): WorkflowTarget[] {
  return dedupeTargets([
    ...getOriginationTargets().map(target => ({ ...target, storage_source: LAST_ORIGINATION_RESULT_KEY })),
    ...getSavedLeads().map(target => ({ ...target, storage_source: SAVED_LEADS_KEY })),
    ...getCockpitTargets().map(target => ({ ...target, storage_source: COCKPIT_TARGETS_KEY })),
    ...getCompareCandidates().map(target => ({ ...target, storage_source: COMPARE_CANDIDATES_KEY })),
  ]);
}

export function saveWorkflowTargetsBySource(targets: unknown[]): WorkflowTarget[] {
  const normalized = dedupeTargets(targets.map(normalizeWithRaw));
  const savedLeads = normalized.filter(target => ['lead', 'saved', 'saved_lead'].includes(target.source));
  const cockpitTargets = normalized.filter(target => target.source === 'cockpit' || target.source === 'run' || target.screening_status === 'screened');
  const compareTargets = normalized.filter(target => target.source === 'compare' || target.compare_ready);
  const cockpitCompareTargets = normalized.filter(target => target.storage_source === COCKPIT_COMPARE_SELECTION_KEY);

  if (savedLeads.length > 0) writeArray(SAVED_LEADS_KEY, dedupeTargets([...savedLeads, ...getSavedLeads()]));
  if (cockpitTargets.length > 0) writeArray(COCKPIT_TARGETS_KEY, dedupeTargets([...cockpitTargets, ...getCockpitTargets()]));
  if (compareTargets.length > 0) writeArray(COMPARE_CANDIDATES_KEY, dedupeTargets([...compareTargets, ...getCompareCandidates()]).slice(0, 10));
  if (cockpitCompareTargets.length > 0 || (storageAvailable() && window.localStorage.getItem(COCKPIT_COMPARE_SELECTION_KEY))) {
    writeArray(COCKPIT_COMPARE_SELECTION_KEY, dedupeTargets([...cockpitCompareTargets, ...readArray(COCKPIT_COMPARE_SELECTION_KEY).map(normalizeWorkflowTarget)]));
  }

  return getAllWorkflowTargets();
}

export function updateWorkflowTarget(targetIdOrMatcher: WorkflowTargetMatcher, patch: WorkflowTargetPatch): WorkflowTarget[] {
  const updated: WorkflowTarget[] = [];

  ([
    SAVED_LEADS_KEY,
    COCKPIT_TARGETS_KEY,
    COMPARE_CANDIDATES_KEY,
    COCKPIT_COMPARE_SELECTION_KEY,
  ] as const).forEach(key => {
    const result = updateArrayByMatcher(readArray(key), targetIdOrMatcher, patch);
    if (result.changed) {
      writeArray(key, result.items);
      updated.push(...result.updated);
    }
  });

  updated.push(...updateOriginationResultByMatcher(targetIdOrMatcher, patch));
  return dedupeTargets(updated);
}

export function removeWorkflowTarget(targetIdOrMatcher: WorkflowTargetMatcher): void {
  ([
    SAVED_LEADS_KEY,
    COCKPIT_TARGETS_KEY,
    COMPARE_CANDIDATES_KEY,
    COCKPIT_COMPARE_SELECTION_KEY,
  ] as const).forEach(key => {
    const filtered = readArray(key)
      .map(normalizeWorkflowTarget)
      .filter((target): target is WorkflowTarget => target !== null)
      .filter(target => !targetMatches(target, targetIdOrMatcher));
    writeArray(key, dedupeTargets(filtered));
  });

  const result = readRecord(LAST_ORIGINATION_RESULT_KEY);
  if (Object.keys(result).length === 0) return;
  const next = { ...result };
  let changed = false;
  ORIGINATION_TARGET_LIST_KEYS.forEach(key => {
    const list = asArray(result[key]).filter(item => item && typeof item === 'object') as Record<string, unknown>[];
    if (list.length === 0) return;
    const filtered = list
      .map(item => normalizeWithRaw({ ...item, source: textValue(item.source, 'origination') }))
      .filter((target): target is WorkflowTarget => target !== null)
      .filter(target => !targetMatches(target, targetIdOrMatcher));
    if (filtered.length !== list.length) {
      changed = true;
      next[key] = dedupeTargets(filtered);
    }
  });
  if (changed) writeRecord(LAST_ORIGINATION_RESULT_KEY, next);
}

export function addUserSuppliedEvidence(targetIdOrMatcher: WorkflowTargetMatcher, evidencePatch: Record<string, unknown>): WorkflowTarget[] {
  const current = getAllWorkflowTargets().find(target => targetMatches(target, targetIdOrMatcher));
  const existingEvidence = current?.user_supplied_evidence ?? asRecord(current?.raw?.user_supplied_evidence);
  return updateWorkflowTarget(targetIdOrMatcher, {
    user_supplied_evidence: {
      ...existingEvidence,
      ...evidencePatch,
      updated_at: new Date().toISOString(),
    },
    evidence_confidence: textValue(evidencePatch.evidence_confidence, current?.evidence_confidence || ''),
  });
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

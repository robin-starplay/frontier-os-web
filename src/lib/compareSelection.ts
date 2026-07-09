import {
  COMPARE_CANDIDATES_KEY,
  SELECTED_CANDIDATES_KEY,
  dedupeTargets,
  getCompareCandidates,
  normalizeWorkflowTarget,
  saveCompareCandidates,
  workflowTargetKey,
  type WorkflowTarget,
} from '@/lib/workflowTargets';

export { COMPARE_CANDIDATES_KEY, SELECTED_CANDIDATES_KEY };

export interface StoredCompareCandidate {
  company_name: string;
  website: string;
  jurisdiction: string;
  sector?: string;
  source: string;
  source_label: string;
  source_url?: string;
  candidate_type?: string;
  source_page_title?: string;
  evidence_status: string;
  fit_score_100: number | null;
  recommendation: string;
  candidate_quality?: string;
  website_status?: string;
  compare_ready?: boolean;
  run_ready?: boolean;
  compare_note?: string;
  screening_status?: string;
  cockpit_target_id?: string;
  run_id?: string;
  saved_at?: string;
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function safeString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

function candidateKey(candidate: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): string {
  return workflowTargetKey({
    company_name: safeString(candidate.company_name),
    website: safeString(candidate.website),
    jurisdiction: safeString(candidate.jurisdiction),
  });
}

function toStoredCompareCandidate(target: WorkflowTarget): StoredCompareCandidate {
  return {
    company_name: target.company_name,
    website: target.website,
    jurisdiction: target.jurisdiction,
    sector: target.sector || undefined,
    source: target.source || 'origination',
    source_label: target.source_label,
    source_url: target.source_url || undefined,
    candidate_type: target.candidate_type,
    source_page_title: target.source_page_title,
    evidence_status: target.evidence_confidence,
    fit_score_100: target.fit_score_100 ?? null,
    recommendation: target.recommendation,
    candidate_quality: target.candidate_quality || undefined,
    website_status: target.website_status || undefined,
    compare_ready: target.compare_ready,
    run_ready: target.run_ready,
    compare_note: target.compare_note,
    screening_status: target.screening_status || undefined,
    cockpit_target_id: safeString(target.raw?.cockpit_target_id) || undefined,
    run_id: target.run_id || undefined,
    saved_at: target.saved_at || undefined,
  };
}

function readCandidatesFromKey(key: string): StoredCompareCandidate[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return dedupeTargets(parsed.map(normalizeWorkflowTarget))
      .map(toStoredCompareCandidate)
      .filter(item => item.company_name || item.website);
  } catch {
    return [];
  }
}

export function readCompareCandidates(): StoredCompareCandidate[] {
  return getCompareCandidates().map(toStoredCompareCandidate);
}

export function writeCompareCandidates(candidates: StoredCompareCandidate[]): void {
  saveCompareCandidates(candidates);
}

export function addCompareCandidate(candidate: StoredCompareCandidate): { added: boolean; candidates: StoredCompareCandidate[] } {
  const existing = readCompareCandidates();
  const key = candidateKey(candidate);
  if (existing.some(item => candidateKey(item) === key)) {
    return { added: false, candidates: existing };
  }
  const candidates = [...existing, candidate];
  writeCompareCandidates(candidates);
  return { added: true, candidates };
}

export function removeCompareCandidate(candidate: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): StoredCompareCandidate[] {
  const key = candidateKey(candidate);
  const candidates = readCompareCandidates().filter(item => candidateKey(item) !== key);
  writeCompareCandidates(candidates);
  return candidates;
}

export function candidateStorageKey(candidate: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): string {
  return candidateKey(candidate);
}

export function readSelectedCandidates(): StoredCompareCandidate[] {
  return readCandidatesFromKey(SELECTED_CANDIDATES_KEY);
}

export function writeSelectedCandidates(candidates: StoredCompareCandidate[]): void {
  if (!storageAvailable()) return;
  const normalized = dedupeTargets(candidates.map(normalizeWorkflowTarget)).map(toStoredCompareCandidate);
  window.localStorage.setItem(SELECTED_CANDIDATES_KEY, JSON.stringify(normalized));
}

export function addSelectedCandidate(candidate: StoredCompareCandidate): { added: boolean; candidates: StoredCompareCandidate[] } {
  const existing = readSelectedCandidates();
  const key = candidateKey(candidate);
  if (existing.some(item => candidateKey(item) === key)) {
    return { added: false, candidates: existing };
  }
  const candidates = [...existing, candidate];
  writeSelectedCandidates(candidates);
  return { added: true, candidates };
}

export function removeSelectedCandidate(candidate: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): StoredCompareCandidate[] {
  const key = candidateKey(candidate);
  const candidates = readSelectedCandidates().filter(item => candidateKey(item) !== key);
  writeSelectedCandidates(candidates);
  return candidates;
}

export function clearSelectedCandidates(): void {
  writeSelectedCandidates([]);
}

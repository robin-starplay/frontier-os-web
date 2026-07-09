import { normalizeWebsiteUrl } from '@/lib/urlUtils';

export const COMPARE_CANDIDATES_KEY = 'frontier_compare_candidates';
export const SELECTED_CANDIDATES_KEY = 'frontier_selected_candidates';

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

function safeString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

function candidateKey(candidate: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): string {
  const website = safeString(candidate.website).trim();
  if (website) return `website:${normalizeWebsiteUrl(website).toLowerCase()}`;
  return `name:${safeString(candidate.company_name).trim().toLowerCase()}|${safeString(candidate.jurisdiction).trim().toLowerCase()}`;
}

export function readCompareCandidates(): StoredCompareCandidate[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPARE_CANDIDATES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => item as Record<string, unknown>)
      .map(item => ({
        company_name: safeString(item.company_name),
        website: safeString(item.website),
        jurisdiction: safeString(item.jurisdiction),
        sector: safeString(item.sector) || undefined,
        source: safeString(item.source) || 'origination',
        source_label: safeString(item.source_label),
        source_url: safeString(item.source_url) || undefined,
        candidate_type: safeString(item.candidate_type) || undefined,
        source_page_title: safeString(item.source_page_title) || undefined,
        evidence_status: safeString(item.evidence_status),
        fit_score_100: typeof item.fit_score_100 === 'number' ? item.fit_score_100 : null,
        recommendation: safeString(item.recommendation),
        candidate_quality: safeString(item.candidate_quality) || undefined,
        website_status: safeString(item.website_status) || undefined,
        compare_ready: typeof item.compare_ready === 'boolean' ? item.compare_ready : undefined,
        run_ready: typeof item.run_ready === 'boolean' ? item.run_ready : undefined,
        compare_note: safeString(item.compare_note) || undefined,
        screening_status: safeString(item.screening_status) || undefined,
        cockpit_target_id: safeString(item.cockpit_target_id) || undefined,
        run_id: safeString(item.run_id) || undefined,
        saved_at: safeString(item.saved_at) || undefined,
      }))
      .filter(item => item.company_name || item.website);
  } catch {
    return [];
  }
}

export function writeCompareCandidates(candidates: StoredCompareCandidate[]): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(COMPARE_CANDIDATES_KEY, JSON.stringify(candidates));
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
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SELECTED_CANDIDATES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => item as Record<string, unknown>)
      .map(item => ({
        company_name: safeString(item.company_name),
        website: safeString(item.website),
        jurisdiction: safeString(item.jurisdiction),
        sector: safeString(item.sector) || undefined,
        source: safeString(item.source) || 'origination',
        source_label: safeString(item.source_label),
        source_url: safeString(item.source_url) || undefined,
        candidate_type: safeString(item.candidate_type) || undefined,
        source_page_title: safeString(item.source_page_title) || undefined,
        evidence_status: safeString(item.evidence_status),
        fit_score_100: typeof item.fit_score_100 === 'number' ? item.fit_score_100 : null,
        recommendation: safeString(item.recommendation),
        candidate_quality: safeString(item.candidate_quality) || undefined,
        website_status: safeString(item.website_status) || undefined,
        compare_ready: typeof item.compare_ready === 'boolean' ? item.compare_ready : undefined,
        run_ready: typeof item.run_ready === 'boolean' ? item.run_ready : undefined,
        compare_note: safeString(item.compare_note) || undefined,
        screening_status: safeString(item.screening_status) || undefined,
        cockpit_target_id: safeString(item.cockpit_target_id) || undefined,
        run_id: safeString(item.run_id) || undefined,
        saved_at: safeString(item.saved_at) || undefined,
      }))
      .filter(item => item.company_name || item.website);
  } catch {
    return [];
  }
}

export function writeSelectedCandidates(candidates: StoredCompareCandidate[]): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(SELECTED_CANDIDATES_KEY, JSON.stringify(candidates));
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

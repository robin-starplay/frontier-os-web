import { normalizeWebsiteUrl } from '@/lib/urlUtils';

export const COMPARE_CANDIDATES_KEY = 'frontier_compare_candidates';

export interface StoredCompareCandidate {
  company_name: string;
  website: string;
  jurisdiction: string;
  source: string;
  source_label: string;
  evidence_status: string;
  fit_score_100: number | null;
  recommendation: string;
  website_status?: string;
  compare_ready?: boolean;
  compare_note?: string;
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
        source: safeString(item.source) || 'origination',
        source_label: safeString(item.source_label),
        evidence_status: safeString(item.evidence_status),
        fit_score_100: typeof item.fit_score_100 === 'number' ? item.fit_score_100 : null,
        recommendation: safeString(item.recommendation),
        website_status: safeString(item.website_status) || undefined,
        compare_ready: typeof item.compare_ready === 'boolean' ? item.compare_ready : undefined,
        compare_note: safeString(item.compare_note) || undefined,
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

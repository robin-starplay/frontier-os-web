/**
 * Frontier OS — shared evidence status utilities
 *
 * Defensive rendering rules (spec: trust fix — three-gate model):
 *
 * Gate 1 — Status mapping:
 *   Only the exact string 'verified' (case-insensitive) maps to EvidenceStatus 'verified'.
 *   All other raw strings (claim, unknown, not_verified, Verified, confirmed…) map to their
 *   canonical equivalents. Unknown strings fall back to 'unknown'.
 *
 * Gate 2 — Source quality:
 *   'verified' is downgraded to 'unknown' if source is missing, a dash, or a generic
 *   placeholder ('', '—', '-', 'n/a', 'none', 'not filed', 'not disclosed', 'unknown').
 *
 * Net result: green "Verified" only appears when both gates pass:
 *   status === 'verified' AND source is substantive.
 *
 * Strict boundary: frontend-only, no backend imports.
 */

import type { EvidenceStatus } from './frontierApi';

const CANONICAL: Record<string, EvidenceStatus> = {
  verified:        'verified',
  confirmed:       'claim',
  claim:           'claim',
  caveat:          'caveat',
  caveated:        'caveat',
  candidate:       'claim',
  blocking:        'blocking',
  blocked:         'blocking',
  'not ready':     'blocking',
  contradicted:    'blocking',
  unknown:         'unknown',
  missing:         'unknown',
  not_verified:    'unknown',
  'not verified':  'unknown',
  'not filed':     'unknown',
  unverified:      'unknown',
  diligence:       'unknown',
  'not disclosed': 'unknown',
  '':              'unknown',
};

/** Sources considered too weak to support a 'verified' claim (Gate 2). */
const WEAK_SOURCES = new Set([
  '', '—', '-', '--', 'n/a', 'none',
  'not filed', 'not disclosed', 'unknown',
  'not verified', 'not verified in this run',
  'public annual report/results source',
  'annual report/results source',
  'source',
  'url-only analysis',
  'source not retained in this run',
  'public financial source not retained',
]);

/**
 * Defensive evidence status normalisation — three-gate model.
 *
 * @param status   Raw status string from the backend (may be null/undefined).
 * @param source   Source attribution string (may be null/undefined).
 * @param confidence  Confidence level string, e.g. 'High', 'Medium', 'Low' (may be null/undefined).
 *
 * Returns the canonical EvidenceStatus, guaranteed never to be 'verified' unless
 * the backend status is exactly verified and the source attribution is concrete.
 */
export function safeEvidenceStatus(
  status: string | null | undefined,
  source?: string | null,
  _confidence?: string | null,
): EvidenceStatus {
  const raw = (status ?? '').toLowerCase().trim();
  let resolved: EvidenceStatus = CANONICAL[raw] ?? 'unknown';

  if (resolved === 'verified') {
    // Gate 2: source quality check
    const src = (source ?? '').trim().toLowerCase();
    if (WEAK_SOURCES.has(src)) return 'unknown';
  }

  return resolved;
}

/** Display label map for evidence status chips. */
export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  verified: 'Verified',
  caveat:   'Caveated',
  claim:    'Claim',
  blocking: 'Blocking',
  unknown:  'Not verified in this run',
};

/** Tailwind class map for evidence status chips. */
export const EVIDENCE_STATUS_CLASS: Record<EvidenceStatus, string> = {
  verified: 'bg-green-500/10 text-green-400 border-green-500/20',
  caveat:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  claim:    'bg-blue-500/10  text-blue-400  border-blue-500/20',
  blocking: 'bg-red-500/10   text-red-400   border-red-500/20',
  unknown:  'bg-muted/40     text-muted-foreground border-border',
};

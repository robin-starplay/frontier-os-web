export type SemanticStatusVariant =
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'unknown'
  | 'category';

const CATEGORY_LABELS = new Set([
  'financial',
  'financials',
  'financial claim',
  'financial claims',
  'pricing',
  'team',
  'ai',
  'ai claim',
  'ai claims',
  'product',
  'product claim',
  'product claims',
  'customer',
  'gtm',
  'registry',
  'document',
  'document claim',
  'document claims',
]);

const POSITIVE_LABELS = new Set([
  'verified',
  'verified public source',
  'public-source verified',
  'source verified',
  'completed',
  'complete',
  'saved',
  'saved to cockpit',
  'ready to screen',
  'ready',
  'screen-ready',
  'available now',
  'passed',
  'extracted',
  'enabled',
]);

const WARNING_LABELS = new Set([
  'company claim',
  'claim',
  'claim, not verified',
  'not independently verified',
  'needs review',
  'needs verification',
  'evidence needed',
  'evidence required',
  'diligence gap',
  'diligence gaps',
  'website required',
  'request evidence pack',
  'request financials',
  'partial',
  'medium',
  'medium-high',
  'mixed',
  'claimed',
  'validate before outreach',
  'registry leads',
  'document-assisted review',
]);

const DANGER_LABELS = new Set([
  'blocker',
  'blocked',
  'failed',
  'failure',
  'compare request failed',
  'confidential warning',
  'confidential material warning',
  'critical risk',
  'high ai risk',
  'ic blocked',
  'not allowed',
]);

const INFO_LABELS = new Set([
  'evidence-first',
  'source-backed',
  'source backed',
  'source-backed evidence',
  'private beta',
  'private-beta',
  'workflow current step',
  'current',
  'screen next',
  'screened',
  'already screened',
  'public-source preview',
  'known target universe',
  'private-beta reference universe',
  'extracted from source page',
  'info',
  'running',
  'in progress',
]);

const UNKNOWN_LABELS = new Set([
  'unknown',
  'not found',
  'not found in this run',
  'not assessed',
  'not assessed in this run',
  'not disclosed',
  'unavailable',
  'unproven',
  'not checked',
  'not source-backed',
  'no verified revenue/arr/ebitda/customer concentration',
]);

function normaliseLabel(label: unknown): string {
  if (label === null || label === undefined) return '';
  return String(label)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function statusVariantForLabel(label: unknown, fallback: SemanticStatusVariant = 'info'): SemanticStatusVariant {
  const value = normaliseLabel(label);
  if (!value) return fallback;

  // Colours represent semantic status, not data category.
  if (CATEGORY_LABELS.has(value)) return 'category';
  if (POSITIVE_LABELS.has(value)) return 'positive';
  if (WARNING_LABELS.has(value)) return 'warning';
  if (DANGER_LABELS.has(value)) return 'danger';
  if (INFO_LABELS.has(value)) return 'info';
  if (UNKNOWN_LABELS.has(value)) return 'unknown';

  if (value.includes('verified public')) return 'positive';
  if (value === 'source-backed' || value === 'source backed' || value.includes('source-backed evidence')) return 'info';
  if (value.includes('not independently verified') || value.includes('not verified') || value.includes('claim')) return 'warning';
  if (value.includes('website required') || value.includes('evidence required') || value.includes('needs review')) return 'warning';
  if (value.includes('blocker') || value.includes('failed') || value.includes('blocked')) return 'danger';
  if (value.includes('unknown') || value.includes('not found') || value.includes('unproven')) return 'unknown';

  return fallback;
}

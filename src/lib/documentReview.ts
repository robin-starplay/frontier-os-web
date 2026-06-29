/**
 * Frontier OS — document-assisted review API client
 *
 * Calls POST /api/documents/review (multipart/form-data).
 * Backend is responsible for extraction; this file is frontend-only.
 *
 * Strict boundary: do NOT add backend logic here.
 *
 * SAFETY NOTE: the normalizeDocumentReviewResult() function ensures that every
 * array field defaults to [] and every string field defaults to '' regardless
 * of what the backend returns. This prevents the UI from crashing on
 * null/undefined field access after a successful HTTP 200.
 */

import { getWorkspaceId, getUserId } from './trialAccount';
import { getBackendBaseUrl } from './frontierApi';

// ── Response types ────────────────────────────────────────────────────────────

export interface DocClaim {
  text: string;
  page?: number;
  confidence?: string;
}

export interface DocMetric {
  label: string;
  value: string;
  page?: number;
}

export interface DocUnknown {
  field: string;
  note?: string;
}

export interface DocQuestion {
  question: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface DocEvidenceCard {
  title: string;
  content: string;
  /** Always "Uploaded document" for doc-review items */
  source: string;
  /** Always "Claim, not verified" for doc-review items */
  status: string;
}

export interface DocumentReviewResult {
  document_summary: string;
  pages_processed: number;
  confidentiality_flag: boolean;
  /** Optional free-text warning string from backend (e.g. "Document contains confidentiality markings") */
  confidentiality_warning?: string;
  claims_extracted: number;
  metrics_extracted: number;
  recommended_next_action: string;
  /** Extracted or provided company name */
  company_name?: string;
  claims: DocClaim[];
  metrics: DocMetric[];
  unknowns: DocUnknown[];
  diligence_questions: DocQuestion[];
  evidence_cards: DocEvidenceCard[];
  limitations: string[];
  /** True when backend persisted a summary to the workspace cockpit */
  saved_to_cockpit?: boolean;
}

// ── Response normalisation ────────────────────────────────────────────────────
//
// The backend may return fields under alternative names, as null, or omit them
// entirely. This function converts whatever the backend returns into a fully
// populated DocumentReviewResult so the UI never crashes on .length / .map().

function asStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v != null) return String(v);
  return fallback;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function asArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asObj(v: unknown): Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function normalizeDocumentReviewResult(raw: unknown): DocumentReviewResult {
  const r = asObj(raw);

  // ── Claims ────────────────────────────────────────────────────────────────
  // Backend may use: claims | extracted_claims | claim_list
  const rawClaims = asArr<unknown>(r.claims ?? r.extracted_claims ?? r.claim_list);
  const claims: DocClaim[] = rawClaims.map(c => {
    const o = asObj(c);
    return {
      text: asStr(o.text ?? o.claim ?? o.content ?? (typeof c === 'string' ? c : '')),
      page: typeof o.page === 'number' ? o.page : undefined,
      confidence: typeof o.confidence === 'string' ? o.confidence : undefined,
    };
  }).filter(c => c.text.length > 0);

  // ── Metrics ───────────────────────────────────────────────────────────────
  // Backend may use: metrics | metric_list | key_metrics
  const rawMetrics = asArr<unknown>(r.metrics ?? r.metric_list ?? r.key_metrics);
  const metrics: DocMetric[] = rawMetrics.map(m => {
    const o = asObj(m);
    return {
      label: asStr(o.label ?? o.name ?? o.metric ?? o.key),
      value: asStr(o.value ?? o.amount ?? o.figure ?? ''),
      page: typeof o.page === 'number' ? o.page : undefined,
    };
  }).filter(m => m.label.length > 0 || m.value.length > 0);

  // ── Unknowns ──────────────────────────────────────────────────────────────
  // Backend may use: unknowns | unknown_list | gaps | evidence_gaps
  const rawUnknowns = asArr<unknown>(r.unknowns ?? r.unknown_list ?? r.gaps ?? r.evidence_gaps);
  const unknowns: DocUnknown[] = rawUnknowns.map(u => {
    const o = asObj(u);
    return {
      field: asStr(o.field ?? o.name ?? o.topic ?? o.gap ?? (typeof u === 'string' ? u : '')),
      note: typeof o.note === 'string' ? o.note
        : typeof o.description === 'string' ? o.description
        : undefined,
    };
  }).filter(u => u.field.length > 0);

  // ── Diligence questions ───────────────────────────────────────────────────
  // Backend may use: diligence_questions | questions | key_questions
  const rawQs = asArr<unknown>(r.diligence_questions ?? r.questions ?? r.key_questions);
  const diligence_questions: DocQuestion[] = rawQs.map(q => {
    const o = asObj(q);
    const questionText = asStr(o.question ?? o.text ?? o.q ?? (typeof q === 'string' ? q : ''));
    const p = o.priority;
    const priority: DocQuestion['priority'] =
      p === 'high' || p === 'medium' || p === 'low' ? p : undefined;
    return { question: questionText, priority };
  }).filter(q => q.question.length > 0);

  // ── Evidence cards ────────────────────────────────────────────────────────
  // Backend may use: evidence_cards | cards | evidence
  const rawCards = asArr<unknown>(r.evidence_cards ?? r.cards ?? r.evidence);
  const evidence_cards: DocEvidenceCard[] = rawCards.map(card => {
    const o = asObj(card);
    return {
      title:   asStr(o.title ?? o.name ?? o.heading ?? ''),
      content: asStr(o.content ?? o.text ?? o.summary ?? o.body ?? ''),
      source:  asStr(o.source ?? 'Uploaded document'),
      status:  asStr(o.status ?? 'Claim, not verified'),
    };
  }).filter(c => c.title.length > 0 || c.content.length > 0);

  // ── Limitations ───────────────────────────────────────────────────────────
  let limitations: string[] = [];
  const rawLims = r.limitations;
  if (Array.isArray(rawLims)) {
    limitations = rawLims.map(l => asStr(l)).filter(l => l.length > 0);
  } else if (typeof rawLims === 'string' && rawLims.trim()) {
    limitations = [rawLims.trim()];
  }

  // ── Confidentiality ───────────────────────────────────────────────────────
  // confidentiality_flag, confidentiality_warning, has_confidentiality_marking
  const confidentiality_warning =
    typeof r.confidentiality_warning === 'string' && r.confidentiality_warning.trim()
      ? r.confidentiality_warning.trim()
      : typeof r.warning === 'string' && r.warning.trim()
        ? r.warning.trim()
        : undefined;

  const confidentiality_flag =
    asBool(r.confidentiality_flag) ||
    asBool(r.has_confidentiality_marking) ||
    confidentiality_warning != null;

  return {
    document_summary: asStr(r.document_summary ?? r.summary ?? r.description),
    pages_processed:  asNum(r.pages_processed ?? r.pages ?? r.page_count),
    confidentiality_flag,
    confidentiality_warning,
    claims_extracted:        asNum(r.claims_extracted ?? r.claim_count ?? claims.length),
    metrics_extracted:       asNum(r.metrics_extracted ?? r.metric_count ?? metrics.length),
    recommended_next_action: asStr(r.recommended_next_action ?? r.next_action ?? r.recommendation),
    company_name: typeof r.company_name === 'string' ? r.company_name : undefined,
    claims,
    metrics,
    unknowns,
    diligence_questions,
    evidence_cards,
    limitations,
    saved_to_cockpit: asBool(r.saved_to_cockpit),
  };
}

// ── API call ──────────────────────────────────────────────────────────────────

export type DocumentReviewOutcome =
  | { ok: true;  data: DocumentReviewResult }
  | { ok: false; error: string; status?: number };

export async function reviewDocument(params: {
  file: File;
  companyName?: string;
  website?: string;
  documentContext?: string;
  saveToCockpit?: boolean;
}): Promise<DocumentReviewOutcome> {
  const { file, companyName, website, documentContext, saveToCockpit = false } = params;

  // ── Pre-flight validation (never crash — return error outcome) ────────────
  if (!file) {
    return { ok: false, error: 'No file selected.' };
  }
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return { ok: false, error: 'Document review currently supports PDF files only.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'PDF must be 10 MB or smaller for this prototype.' };
  }

  const workspaceId = getWorkspaceId();
  const userId      = getUserId();

  // ── Build FormData ────────────────────────────────────────────────────────
  // Do NOT set Content-Type — fetch sets it automatically for FormData (including boundary).
  const body = new FormData();
  body.append('file', file);
  // Use exact field names expected by backend spec
  if (companyName)     body.append('company_name',     companyName);
  if (website)         body.append('company_website',  website);   // spec: company_website
  if (documentContext) body.append('document_type',    documentContext); // spec: document_type
  body.append('save_to_cockpit', String(saveToCockpit));
  if (workspaceId) body.append('workspace_id', workspaceId);
  if (userId)      body.append('user_id',      userId);

  try {
    const base     = getBackendBaseUrl();
    const endpoint = base ? `${base}/api/documents/review` : '/api/documents/review';

    const res = await fetch(endpoint, { method: 'POST', body });

    if (!res.ok) {
      // Try to read body text for detail, but don't crash if it fails.
      const text = await res.text().catch(() => '');
      return {
        ok:     false,
        error:  text || `Server error ${res.status}`,
        status: res.status,
      };
    }

    // Parse JSON defensively — backend may return non-JSON on unexpected errors.
    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      return {
        ok:     false,
        error:  'Response was not valid JSON.',
        status: res.status,
      };
    }

    // Normalise to our typed interface — fills in [] / '' for every missing field.
    const data = normalizeDocumentReviewResult(raw);
    return { ok: true, data };

  } catch (err) {
    // Network-level failure (fetch threw).
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

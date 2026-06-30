/**
 * Frontier OS — frontend API adapter
 *
 * Responsibilities (frontend only):
 *   1. Collect user input and POST to the real backend.
 *   2. Return backend JSON to the caller unchanged.
 *   3. On URL-analysis failure / timeout: surface the error to the caller.
 *
 * This file MUST NOT contain:
 *   - investment recommendation logic
 *   - scoring or ranking algorithms
 *   - jurisdiction-keyed business rules
 *   - evidence-card construction
 *   - strategic fit computation
 *
 * Compare fallback data is static display scaffolding only.
 * Every analytical field shows "Unavailable in this preview".
 * If a backend field is absent in a live response, the rendering
 * layer should show "Unavailable in this preview" — not this adapter.
 */

const TIMEOUT_MS = 8_000;

// ─── Payload types ────────────────────────────────────────────────────────────

export interface UrlAnalysisPayload {
  company_name: string;
  website: string;
  buyer_name?: string;
  buyer_thesis: string;
  jurisdiction: string;
  // Cockpit persistence — included when backend workspace IDs are available
  workspace_id?: string;
  user_id?: string;
  save_to_cockpit?: boolean;
}

export interface CompareCompany {
  name: string;
  url: string;
  jurisdiction: string;
}

export interface ComparePayload {
  buyer: string;
  buyer_thesis: string;
  companies: CompareCompany[];
  // Cockpit persistence — included when backend workspace IDs are available
  workspace_id?: string;
  user_id?: string;
  save_to_cockpit?: boolean;
}

// ─── Result types (mirrors backend schema) ────────────────────────────────────

export type Level = 'green' | 'amber' | 'red' | 'blue' | 'grey';
export type EvidenceStatus = 'verified' | 'caveat' | 'claim' | 'blocking' | 'unknown';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface AnalysisEvidenceCard {
  field: string;
  value: string;
  status: EvidenceStatus;
  source: string;
  summary: string;
  confidence: Confidence;
}

export interface StrategicFitDetail {
  score: string;
  why_fits: string[];
  why_not: string[];
  assumptions: string[];
  risks: string[];
  diligence_questions: string[];
}

export interface AiDisruptionDetail {
  replica_risk: string;
  replica_risk_level: Level;
  moat_evidence: string;
  inference_economics: string;
  product_expansion: string;
  opex_improvement: string;
  diligence_questions: string[];
}

export interface AnalysisResult {
  status: 'ok' | 'partial';
  data_mode: string;
  limitation?: string;
  company: string;
  company_name?: string;
  website?: string;
  recommendation: string;
  recommendation_level: Level;
  ic_readiness: string;
  valuation_readiness: string;
  strategic_fit_label: string;
  evidence_confidence: string;
  ai_replica_risk: string;
  ai_moat: string;
  next_action: string;
  strategic_fit: StrategicFitDetail;
  evidence_cards: AnalysisEvidenceCard[];
  ai_disruption: AiDisruptionDetail;
  // Backend cockpit persistence confirmation — present when save_to_cockpit: true and backend saved it
  saved_to_cockpit?: boolean;
  saved_run_id?: string;
  __sample_fallback?: boolean;
  fallback_used?: boolean;
  verified_facts?: unknown[];
  claims?: unknown[];
  unknowns?: unknown[];
  diligence_blockers?: unknown[];
  evidence_confidence_score?: number;
  analysis_quality?: unknown;
  run_log?: unknown[];
  innovation_operating_signals?: unknown;
  main_blocker?: string;
}

export interface CompareTargetResult {
  rank: number;
  company: string;
  url: string;
  recommendation: string;
  recommendation_level: Level;
  strategic_fit: string;
  evidence_confidence: string;
  ai_replica_risk: string;
  blockers: string[];
  next_action: string;
  rank_reason: string;
}

export interface CompareResult {
  status: 'ok' | 'partial';
  data_mode: string;
  limitation?: string;
  targets: CompareTargetResult[];
  most_ic_ready: string;
  highest_ai_risk: string;
  most_evidence_gaps: string;
  best_next_action: string;
  // Backend cockpit persistence confirmation
  saved_to_cockpit?: boolean;
  comparison_id?: string;
  fallback_used?: boolean;
}

// ─── Static fallback display scaffolding ─────────────────────────────────────
//
// Shown only when the backend is unreachable or times out.
// Contains NO investment logic, NO scoring, NO jurisdiction rules.
// Every analytical value is a neutral placeholder.
// Company names / URLs from the user's input are used for display only.

const UNAVAILABLE = 'Unavailable in this preview' as const;

/** Five neutral evidence-card slots — no underwriting content. */
const FALLBACK_EVIDENCE_CARDS: AnalysisEvidenceCard[] = [
  { field: 'Revenue',               value: UNAVAILABLE, status: 'unknown', source: UNAVAILABLE, summary: UNAVAILABLE, confidence: 'Low' },
  { field: 'ARR',                   value: UNAVAILABLE, status: 'unknown', source: UNAVAILABLE, summary: UNAVAILABLE, confidence: 'Low' },
  { field: 'Adjusted EBITDA',       value: UNAVAILABLE, status: 'unknown', source: UNAVAILABLE, summary: UNAVAILABLE, confidence: 'Low' },
  { field: 'AI capability',         value: UNAVAILABLE, status: 'unknown', source: UNAVAILABLE, summary: UNAVAILABLE, confidence: 'Low' },
  { field: 'Customer concentration',value: UNAVAILABLE, status: 'unknown', source: UNAVAILABLE, summary: UNAVAILABLE, confidence: 'Low' },
];

function buildAnalysisFallback(company: string): AnalysisResult {
  return {
    status: 'partial',
    data_mode: 'Private beta · public-source screen',
    limitation: 'Backend unavailable. This is a private-beta public-source screen — not an analysis of this company.',
    company,
    recommendation:        UNAVAILABLE,
    recommendation_level:  'grey',
    ic_readiness:          UNAVAILABLE,
    valuation_readiness:   UNAVAILABLE,
    strategic_fit_label:   UNAVAILABLE,
    evidence_confidence:   UNAVAILABLE,
    ai_replica_risk:       UNAVAILABLE,
    ai_moat:               UNAVAILABLE,
    next_action:           UNAVAILABLE,
    strategic_fit: {
      score:                UNAVAILABLE,
      why_fits:             [UNAVAILABLE],
      why_not:              [UNAVAILABLE],
      assumptions:          [UNAVAILABLE],
      risks:                [UNAVAILABLE],
      diligence_questions:  [UNAVAILABLE],
    },
    evidence_cards: FALLBACK_EVIDENCE_CARDS,
    ai_disruption: {
      replica_risk:         UNAVAILABLE,
      replica_risk_level:   'grey',
      moat_evidence:        UNAVAILABLE,
      inference_economics:  UNAVAILABLE,
      product_expansion:    UNAVAILABLE,
      opex_improvement:     UNAVAILABLE,
      diligence_questions:  [UNAVAILABLE],
    },
  };
}

function buildCompareFallback(companies: CompareCompany[]): CompareResult {
  // Input order preserved (no ranking). All analytical fields are neutral placeholders.
  const targets: CompareTargetResult[] = companies.map((co, i) => ({
    rank:                  i + 1,
    company:               co.name?.trim() || `Company ${i + 1}`,
    url:                   co.url ?? '',
    recommendation:        UNAVAILABLE,
    recommendation_level:  'grey' as Level,
    strategic_fit:         UNAVAILABLE,
    evidence_confidence:   UNAVAILABLE,
    ai_replica_risk:       UNAVAILABLE,
    blockers:              [UNAVAILABLE],
    next_action:           UNAVAILABLE,
    rank_reason:           UNAVAILABLE,
  }));

  return {
    status:             'partial',
    data_mode:          'Private beta · public-source screen',
    limitation:         'Backend unavailable. This is a private-beta public-source screen — ranking and analysis require the backend.',
    targets,
    most_ic_ready:      UNAVAILABLE,
    highest_ai_risk:    UNAVAILABLE,
    most_evidence_gaps: UNAVAILABLE,
    best_next_action:   UNAVAILABLE,
    fallback_used:      true,
  };
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function apiUrl(path: string): string {
  return FRONTIER_API_BASE_URL ? `${FRONTIER_API_BASE_URL}${path}` : path;
}

function debugFrontendApi(message: string, data?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (data) console.debug(`[frontierApi] ${message}`, data);
  else console.debug(`[frontierApi] ${message}`);
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Backend returned malformed JSON');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/analyse/url
 * Returns backend JSON unchanged.
 * Real user-triggered runs never fall back to sample data.
 */
export async function runUrlAnalysis(payload: UrlAnalysisPayload): Promise<AnalysisResult> {
  const endpoint = apiUrl('/api/analyse/url');
  debugFrontendApi('runUrlAnalysis request', { endpoint, sampleFallbackUsed: false });

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    debugFrontendApi('runUrlAnalysis response', { endpoint, httpStatus: res.status, sampleFallbackUsed: false });
    const body = await readJsonResponse(res);
    if (!res.ok) {
      const err = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      throw new Error(String(err.message ?? err.detail ?? `Backend returned ${res.status}`));
    }
    debugFrontendApi('runUrlAnalysis payload keys', {
      endpoint,
      httpStatus: res.status,
      sampleFallbackUsed: false,
      keys: body && typeof body === 'object' ? Object.keys(body as Record<string, unknown>) : [],
    });
    return body as AnalysisResult;
  } catch (err) {
    debugFrontendApi('runUrlAnalysis failed', {
      endpoint,
      sampleFallbackUsed: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * POST /api/analyse/compare
 * Returns backend JSON unchanged.
 * Falls back to a static private-beta sample screen on failure.
 */
export async function compareCompanies(payload: ComparePayload): Promise<CompareResult> {
  try {
    const res = await fetchWithTimeout(apiUrl('/api/analyse/compare'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json() as CompareResult;
  } catch {
    console.log('[frontierApi] compareCompanies: backend unavailable — showing fallback comparison screen');
    return buildCompareFallback(payload.companies ?? []);
  }
}

// ─── Cockpit API ─────────────────────────────────────────────────────────────
//
// Backend-first cockpit loading. All functions fall back silently to null/[]
// so callers can layer localStorage as the fallback without extra try/catch.

/** Summary counts returned by GET /api/cockpit/summary */
export interface CockpitSummary {
  total_runs: number;
  financials_count: number;
  high_ai_risk_count: number;
  blockers_count: number;
  compared_count: number;
}

/** Single run entry from GET /api/cockpit/runs */
export interface CockpitRunRecord {
  run_id: string;
  company: string;
  website: string;
  recommendation: string;
  recommendation_level: Level;
  ic_readiness: string;
  valuation_readiness: string;
  strategic_fit_label: string;
  evidence_confidence: string;
  ai_replica_risk: string;
  blockers: string[];
  next_action: string;
  type: 'url' | 'compare';
  timestamp: string;
}

async function cockpitFetch(path: string): Promise<unknown> {
  const res = await fetchWithTimeout(apiUrl(path), { method: 'GET' });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/** GET /api/cockpit/summary?workspace_id=... — null on any failure. */
export async function getCockpitSummary(workspaceId: string): Promise<CockpitSummary | null> {
  try {
    const data = await cockpitFetch(`/api/cockpit/summary?workspace_id=${encodeURIComponent(workspaceId)}`);
    if (!data || typeof data !== 'object') return null;
    return data as CockpitSummary;
  } catch {
    return null;
  }
}

/** GET /api/cockpit/runs?workspace_id=... — empty array on any failure. */
export async function getCockpitRuns(workspaceId: string): Promise<CockpitRunRecord[]> {
  try {
    const data = await cockpitFetch(`/api/cockpit/runs?workspace_id=${encodeURIComponent(workspaceId)}`);
    if (!Array.isArray(data)) return [];
    return data as CockpitRunRecord[];
  } catch {
    return [];
  }
}

/** POST /api/cockpit/decision — fire-and-forget, silent on failure. */
export async function postCockpitDecision(
  workspaceId: string,
  targetId: string,
  note: string,
): Promise<void> {
  try {
    await fetchWithTimeout(apiUrl('/api/cockpit/decision'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, target_id: targetId, note }),
    });
  } catch {
    // Silent — not blocking
  }
}

// ─── External backend integration (Railway) ───────────────────────────────────
//
// Base URL: VITE_FRONTIER_API_BASE_URL (env var, VITE_ prefix required by Vite).
//
// Endpoints used:
//   GET  /health
//   POST /analysis                          → AnalysisStartResponse
//   GET  /analysis/{run_id}/status          → RunStatusResponse
//   GET  /analysis/{run_id}/result          → AnalysisResultResponse
//
// Schema source: https://web-production-0224c.up.railway.app/openapi.json

const FRONTIER_API_BASE_URL = (
  (import.meta.env.VITE_FRONTIER_API_BASE_URL as string | undefined) ?? ''
).trim().replace(/\/$/, '');

/** True when the external backend URL has been configured. */
export function isBackendConfigured(): boolean {
  return FRONTIER_API_BASE_URL.length > 0;
}

/** The configured backend base URL (empty string when unconfigured). */
export function getBackendBaseUrl(): string {
  return FRONTIER_API_BASE_URL;
}

// ── Schema types (mirrors live OpenAPI) ──────────────────────────────────────

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

/**
 * POST /analysis — request body (AnalysisRequest schema).
 * Only `company_name` and `website` are required.
 */
export interface AnalysisRequest {
  company_name: string;
  website: string;
  buyer_name?: string | null;
  buyer_website?: string | null;
  fit_mode?: 'auto' | 'core' | 'adjacent' | 'non_core';
  analysis_depth?: 'quick_screen' | 'ic_draft' | 'diligence';
  document_paths?: string[];
  demo_mode?: boolean;
  use_cache?: boolean;
}

/** Response from POST /analysis (AnalysisStartResponse). */
export interface AnalysisStartResponse {
  run_id: string;
  status: RunStatus;
  message: string;
  status_url: string;
  result_url: string;
}

/** Single progress event inside status/result (ProgressEvent). */
export interface ProgressEvent {
  event_id: string;
  stage: string;
  stage_label?: string | null;
  status: string;
  message: string;
  confidence?: string;
  severity?: string;
  details?: Record<string, unknown>;
  ui_hint?: string;
}

/** Response from GET /analysis/{run_id}/status (RunStatusResponse). */
export interface RunStatusResponse {
  run_id: string;
  status: RunStatus;
  current_stage?: string | null;
  progress_percent?: number;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  events?: ProgressEvent[];
  process_gates?: Record<string, unknown>[];
}

/** Response from GET /analysis/{run_id}/result (AnalysisResultResponse). */
export interface AnalysisResultResponse {
  run_id: string;
  status: RunStatus;
  company_name: string;
  website: string;
  buyer_name?: string | null;
  fit_mode?: string;
  analysis_mode?: string;
  demo_mode?: boolean;
  recommendation?: string;
  recommendation_reason?: string;
  ic_readiness?: string;
  valuation_readiness?: string;
  strategic_fit?: Record<string, unknown>;
  evidence_cards?: Record<string, unknown>[];
  events?: ProgressEvent[];
  process_gates?: Record<string, unknown>[];
  warnings?: string[];
  disclaimer?: string;
  [key: string]: unknown;
}

/** Response from GET /health. */
export interface HealthResponse {
  status: string;
  service?: string;
  environment?: string;
  preview_mode_default?: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const PARSE_FAILED = Symbol('PARSE_FAILED');

async function safeJson(res: Response): Promise<unknown> {
  return res.json().catch(() => PARSE_FAILED);
}

function extractError(body: unknown, httpStatus: number): string {
  if (body === PARSE_FAILED || body === null || typeof body !== 'object') {
    return `Backend returned HTTP ${httpStatus}`;
  }
  const b = body as Record<string, unknown>;
  // FastAPI validation error
  if (typeof b.detail === 'string') return b.detail;
  // Custom error envelope  { error: { code, message } }
  if (b.error && typeof b.error === 'object') {
    const e = b.error as Record<string, unknown>;
    return String(e.message ?? e.code ?? 'Unknown error');
  }
  if (typeof b.error === 'string') return b.error;
  if (typeof b.message === 'string') return b.message;
  return `Backend returned HTTP ${httpStatus}`;
}

function networkError(err: unknown): string {
  if (err instanceof Error) {
    return err.name === 'AbortError' ? 'Request timed out (8 s)' : err.message;
  }
  return 'Network request failed';
}

function isObject(v: unknown): v is Record<string, unknown> {
  // Check PARSE_FAILED before typeof so TypeScript doesn't narrow to 'object'
  // before the symbol comparison (which would be flagged as always false).
  return v !== PARSE_FAILED && v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ── Outcome types ─────────────────────────────────────────────────────────────

export type StartAnalysisOutcome =
  | { ok: true;  data: AnalysisStartResponse }
  | { ok: false; unconfigured: true }
  | { ok: false; unconfigured?: never; error: string };

export type PollStatusOutcome =
  | { ok: true;  data: RunStatusResponse }
  | { ok: false; error: string };

export type FetchResultOutcome =
  | { ok: true;  data: AnalysisResultResponse }
  | { ok: false; error: string };

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /health
 * Non-throwing. Used to verify the backend is reachable on mount.
 */
export async function checkHealth(): Promise<{ ok: boolean; data?: HealthResponse; error?: string }> {
  if (!isBackendConfigured()) return { ok: false, error: 'not configured' };
  try {
    const res = await fetchWithTimeout(`${FRONTIER_API_BASE_URL}/health`, { method: 'GET' });
    const body = await safeJson(res);
    if (!res.ok || !isObject(body)) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, data: body as unknown as HealthResponse };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

/**
 * POST /analysis
 * Starts an async analysis run. Returns run_id for subsequent polling.
 * Never invents data — returns error descriptor on any failure.
 */
export async function startAnalysis(req: AnalysisRequest): Promise<StartAnalysisOutcome> {
  if (!isBackendConfigured()) return { ok: false, unconfigured: true };
  try {
    const res = await fetchWithTimeout(`${FRONTIER_API_BASE_URL}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, error: extractError(body, res.status) };
    if (!isObject(body)) return { ok: false, error: 'Backend returned a non-JSON response' };
    return { ok: true, data: body as unknown as AnalysisStartResponse };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

/**
 * GET /analysis/{run_id}/status
 * Polls until status is 'completed' or 'failed'.
 * Caller is responsible for the polling interval.
 */
export async function pollStatus(runId: string): Promise<PollStatusOutcome> {
  try {
    const res = await fetchWithTimeout(
      `${FRONTIER_API_BASE_URL}/analysis/${encodeURIComponent(runId)}/status`,
      { method: 'GET' },
    );
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, error: extractError(body, res.status) };
    if (!isObject(body)) return { ok: false, error: 'Status endpoint returned a non-JSON response' };
    return { ok: true, data: body as unknown as RunStatusResponse };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

/**
 * GET /analysis/{run_id}/result
 * Fetches the completed analysis result.
 * Call only after status === 'completed'.
 */
export async function fetchResult(runId: string): Promise<FetchResultOutcome> {
  try {
    const res = await fetchWithTimeout(
      `${FRONTIER_API_BASE_URL}/analysis/${encodeURIComponent(runId)}/result`,
      { method: 'GET' },
    );
    const body = await safeJson(res);
    if (!res.ok) return { ok: false, error: extractError(body, res.status) };
    if (!isObject(body)) return { ok: false, error: 'Result endpoint returned a non-JSON response' };
    return { ok: true, data: body as unknown as AnalysisResultResponse };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

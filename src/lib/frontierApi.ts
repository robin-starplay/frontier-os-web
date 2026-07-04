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
const URL_ANALYSIS_TIMEOUT_MS = 120_000;

// ─── Payload types ────────────────────────────────────────────────────────────

export interface UrlAnalysisPayload {
  company_name: string;
  website: string;
  buyer_name?: string;
  buyer_thesis: string;
  jurisdiction: string;
  /** Optional private-pilot path only. Default runs must omit this. */
  analysis_mode?: 'quality_first';
  // Cockpit persistence — included when backend workspace IDs are available
  workspace_id?: string;
  user_id?: string;
  save_to_cockpit?: boolean;
}

export interface DocumentAssistedPayload {
  company_name?: string;
  company_url?: string;
  buyer_thesis?: string;
  document_type?: string;
  confidentiality_acknowledged: boolean;
  file: File;
  workspace_id?: string;
  user_id?: string;
  save_to_cockpit?: boolean;
}

export interface DocumentAssistedResult {
  status: 'ok' | 'unavailable' | 'error';
  analysis_mode: 'document_assisted_preview';
  reason?: string;
  message?: string;
  company_name?: string;
  website?: string;
  document_type?: string;
  document_summary?: unknown;
  extracted_claims?: unknown[];
  claims?: unknown[];
  financial_claims?: unknown[];
  metric_claims?: unknown[];
  customer_claims?: unknown[];
  product_claims?: unknown[];
  ai_claims?: unknown[];
  verified_facts?: unknown[];
  public_source_checks?: unknown;
  public_source_check_records?: unknown[];
  unknowns?: unknown[];
  diligence_blockers?: unknown[];
  next_questions?: unknown[];
  recommended_documents?: unknown[];
  acquisition_readiness_summary?: unknown;
  source_references?: unknown[];
  limitations?: unknown[];
  evidence_confidence?: string;
  recommendation?: string;
  recommendation_level?: Level;
  ic_readiness?: string;
  valuation_readiness?: string;
  main_blocker?: string;
  next_action?: string;
  saved_to_cockpit?: boolean;
  saved_run_id?: string;
  target_id?: string;
  error_code?: string;
  confidentiality_note?: string;
  [key: string]: unknown;
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
  source_url?: string;
  source_label?: string;
  source_metadata?: unknown;
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
  company_snapshot?: unknown;
  public_positioning?: unknown;
  public_signals?: unknown[];
  financial_signals?: unknown;
  structured_unknowns?: unknown[];
  next_questions?: unknown[];
  recommended_documents?: unknown[];
  acquisition_readiness_summary?: unknown;
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

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function apiUrl(path: string): string {
  return FRONTIER_API_BASE_URL ? `${FRONTIER_API_BASE_URL}${path}` : path;
}

function apiRequestUrl(path: string): { requestUrl: string; targetUrl: string; apiBaseUrl: string; usesDevProxy: boolean } {
  const apiBaseUrl = FRONTIER_API_BASE_URL;
  const targetUrl = apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  return {
    requestUrl: targetUrl,
    targetUrl,
    apiBaseUrl,
    usesDevProxy: false,
  };
}

function debugFrontendApi(message: string, data?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (data) console.debug(`[frontierApi] ${message}`, data);
  else console.debug(`[frontierApi] ${message}`);
}

type ApiFailureType = 'network_or_cors' | 'backend_response';

class UrlAnalysisRequestError extends Error {
  httpStatus?: number;
  backendStatus?: string;
  backendReason?: string;
  backendAnalysisMode?: string;
  backendBody?: unknown;

  constructor(message: string, httpStatus?: number, backendBody?: unknown) {
    super(message);
    this.name = 'UrlAnalysisRequestError';
    this.httpStatus = httpStatus;
    this.backendBody = backendBody;
    if (backendBody && typeof backendBody === 'object') {
      const b = backendBody as Record<string, unknown>;
      this.backendStatus = typeof b.status === 'string' ? b.status : undefined;
      this.backendReason = typeof b.reason === 'string' ? b.reason : undefined;
      this.backendAnalysisMode = typeof b.analysis_mode === 'string' ? b.analysis_mode : undefined;
    }
  }
}

export class ApiConnectionError extends Error {
  error_type: ApiFailureType;
  resolved_api_base: string;
  endpoint_url: string;
  request_url: string;
  browser_message: string;

  constructor(endpoint: ReturnType<typeof apiRequestUrl>, browserMessage: string) {
    super([
      'Analysis request failed before a backend response was received. Check API connection.',
      ...requestDiagnostics(endpoint, 'network_or_cors', { browser_message: browserMessage }),
    ].join('\n'));
    this.name = 'ApiConnectionError';
    this.error_type = 'network_or_cors';
    this.resolved_api_base = endpoint.apiBaseUrl || '(not configured)';
    this.endpoint_url = endpoint.targetUrl;
    this.request_url = endpoint.requestUrl;
    this.browser_message = browserMessage;
  }
}

function parseJsonText(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new UrlAnalysisRequestError('Backend returned malformed JSON');
  }
}

function backendErrorMessage(body: unknown, httpStatus: number): string {
  if (!body || typeof body !== 'object') return `Backend returned status ${httpStatus}.`;
  const b = body as Record<string, unknown>;
  const detail = typeof b.detail === 'string' ? b.detail : undefined;
  const message = typeof b.message === 'string' ? b.message : undefined;
  const reason = typeof b.reason === 'string' ? b.reason : undefined;
  const status = typeof b.status === 'string' ? b.status : undefined;
  const analysisMode = typeof b.analysis_mode === 'string' ? b.analysis_mode : undefined;
  const parts = [message || detail, reason && `Reason: ${reason}`, status && `Status: ${status}`, analysisMode && `Mode: ${analysisMode}`].filter(Boolean);
  return parts.length > 0 ? `Backend returned status ${httpStatus}. ${parts.join(' ')}` : `Backend returned status ${httpStatus}.`;
}

function hasNonEmptyResultField(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

export function hasUsableAnalysisPayload(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  const status = String(record.status || '').toLowerCase();
  if (status === 'error' || status === 'unavailable') return false;
  const resultKeys = [
    'verified_facts',
    'claims',
    'unknowns',
    'diligence_blockers',
    'acquisition_readiness_summary',
    'evidence_cards',
    'financial_signals',
    'company_snapshot',
    'public_source_check_records',
  ];
  return resultKeys.some((key) => hasNonEmptyResultField(record[key]));
}

export function isDocumentUnavailablePayload(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return String(record.status || '').toLowerCase() === 'unavailable'
    || String(record.reason || '').toLowerCase() === 'document_uploads_disabled'
    || String(record.error_code || '').toLowerCase() === 'document_uploads_disabled';
}

export function hasUsableDocumentAssistedPayload(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  if (isDocumentUnavailablePayload(body)) return false;
  const record = body as Record<string, unknown>;
  if (String(record.status || '').toLowerCase() === 'error') return false;
  const resultKeys = [
    'document_summary',
    'extracted_claims',
    'financial_claims',
    'customer_claims',
    'product_claims',
    'ai_claims',
    'diligence_blockers',
    'acquisition_readiness_summary',
  ];
  return resultKeys.some((key) => hasNonEmptyResultField(record[key]));
}

function requestDiagnostics(endpoint: ReturnType<typeof apiRequestUrl>, failureType: string, extras: Record<string, unknown> = {}): string[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown origin';
  return [
    `error_type: ${failureType}`,
    `resolved_api_base: ${endpoint.apiBaseUrl || '(not configured)'}`,
    `endpoint_url: ${endpoint.targetUrl}`,
    `request_url: ${endpoint.requestUrl}`,
    `browser_origin: ${origin}`,
    ...Object.entries(extras)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`),
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/analyse/url
 * Returns backend JSON unchanged.
 * Real user-triggered runs never fall back to sample data.
 */
export async function runUrlAnalysis(payload: UrlAnalysisPayload): Promise<AnalysisResult> {
  const endpoint = apiRequestUrl('/api/analyse/url');
  debugFrontendApi('runUrlAnalysis request', {
    resolvedApiBase: endpoint.apiBaseUrl || '(not configured)',
    endpointUrl: endpoint.targetUrl,
    requestUrl: endpoint.requestUrl,
    analysisMode: payload.analysis_mode ?? 'public_source_preview',
    payloadKeys: Object.keys(payload),
    sampleFallbackUsed: false,
  });

  try {
    const res = await fetchWithTimeout(endpoint.requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, URL_ANALYSIS_TIMEOUT_MS);
    const responseText = await res.text();
    debugFrontendApi('runUrlAnalysis response', {
      apiBaseUrl: endpoint.apiBaseUrl || '(not configured)',
      requestUrl: endpoint.requestUrl,
      targetUrl: endpoint.targetUrl,
      usesDevProxy: endpoint.usesDevProxy,
      httpStatus: res.status,
      payloadAnalysisMode: payload.analysis_mode,
      sampleFallbackUsed: false,
      responseText: res.ok ? undefined : responseText.slice(0, 1000),
    });
    const body = parseJsonText(responseText);
    if (!res.ok) {
      if (hasUsableAnalysisPayload(body)) {
        return body as AnalysisResult;
      }
      throw new UrlAnalysisRequestError(
        [
          backendErrorMessage(body, res.status),
          ...requestDiagnostics(endpoint, 'backend_response', { 'HTTP status': res.status }),
        ].join('\n'),
        res.status,
        body,
      );
    }
    debugFrontendApi('runUrlAnalysis payload keys', {
      apiBaseUrl: endpoint.apiBaseUrl || '(not configured)',
      requestUrl: endpoint.requestUrl,
      targetUrl: endpoint.targetUrl,
      usesDevProxy: endpoint.usesDevProxy,
      httpStatus: res.status,
      payloadAnalysisMode: payload.analysis_mode,
      sampleFallbackUsed: false,
      keys: body && typeof body === 'object' ? Object.keys(body as Record<string, unknown>) : [],
    });
    return body as AnalysisResult;
  } catch (err) {
    debugFrontendApi('runUrlAnalysis failed', {
      apiBaseUrl: endpoint.apiBaseUrl || '(not configured)',
      requestUrl: endpoint.requestUrl,
      targetUrl: endpoint.targetUrl,
      usesDevProxy: endpoint.usesDevProxy,
      payloadAnalysisMode: payload.analysis_mode,
      sampleFallbackUsed: false,
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
      httpStatus: err instanceof UrlAnalysisRequestError ? err.httpStatus : undefined,
    });
    if (err instanceof UrlAnalysisRequestError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiConnectionError(endpoint, message);
  }
}

export async function runDocumentAssistedAnalysis(payload: DocumentAssistedPayload): Promise<DocumentAssistedResult> {
  const endpoint = apiRequestUrl('/api/analyse/document-assisted');
  const body = new FormData();
  body.append('file', payload.file);
  if (payload.company_name) body.append('company_name', payload.company_name);
  if (payload.company_url) body.append('company_url', payload.company_url);
  if (payload.buyer_thesis) body.append('buyer_thesis', payload.buyer_thesis);
  if (payload.document_type) body.append('document_type', payload.document_type);
  body.append('confidentiality_acknowledged', String(payload.confidentiality_acknowledged));
  body.append('save_to_cockpit', String(payload.save_to_cockpit ?? false));
  if (payload.workspace_id) body.append('workspace_id', payload.workspace_id);
  if (payload.user_id) body.append('user_id', payload.user_id);

  debugFrontendApi('runDocumentAssistedAnalysis request', {
    resolvedApiBase: endpoint.apiBaseUrl || '(not configured)',
    endpointUrl: endpoint.targetUrl,
    requestUrl: endpoint.requestUrl,
    analysisMode: 'document_assisted_preview',
    payloadKeys: [
      'file',
      ...(payload.company_name ? ['company_name'] : []),
      ...(payload.company_url ? ['company_url'] : []),
      ...(payload.buyer_thesis ? ['buyer_thesis'] : []),
      ...(payload.document_type ? ['document_type'] : []),
      'confidentiality_acknowledged',
      'save_to_cockpit',
      ...(payload.workspace_id ? ['workspace_id'] : []),
      ...(payload.user_id ? ['user_id'] : []),
    ],
    documentType: payload.document_type,
    fileName: payload.file.name,
    fileSize: payload.file.size,
  });

  try {
    const res = await fetchWithTimeout(endpoint.requestUrl, { method: 'POST', body }, URL_ANALYSIS_TIMEOUT_MS);
    const responseText = await res.text();
    const parsed = parseJsonText(responseText);
    if (!res.ok) {
      throw new UrlAnalysisRequestError(
        [
          backendErrorMessage(parsed, res.status),
          ...requestDiagnostics(endpoint, 'backend_response', { 'HTTP status': res.status }),
        ].join('\n'),
        res.status,
        parsed,
      );
    }
    return parsed as DocumentAssistedResult;
  } catch (err) {
    if (err instanceof UrlAnalysisRequestError && err.backendBody && typeof err.backendBody === 'object') {
      return err.backendBody as DocumentAssistedResult;
    }
    if (err instanceof UrlAnalysisRequestError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiConnectionError(endpoint, message);
  }
}

/**
 * POST /api/analyse/compare
 * Returns backend JSON unchanged.
 * Real compare runs do not fall back to sample data.
 */
export async function compareCompanies(payload: ComparePayload): Promise<CompareResult> {
  const res = await fetchWithTimeout(apiUrl('/api/analyse/compare'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return await res.json() as CompareResult;
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
  company?: string;
  company_name?: string;
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
  type?: 'url' | 'compare';
  run_type?: string;
  timestamp?: string;
  created_at?: string;
  result_payload?: unknown;
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

const DEFAULT_FRONTIER_API_BASE_URL = 'https://web-production-0224c.up.railway.app';

const FRONTIER_API_BASE_URL = (
  (import.meta.env.VITE_FRONTIER_API_BASE_URL as string | undefined) ?? DEFAULT_FRONTIER_API_BASE_URL
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

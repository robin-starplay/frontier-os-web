import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, ChevronRight,
  Loader2, AlertCircle, Info,
} from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';
import { getBackendBaseUrl } from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { saveOriginationTarget } from '@/lib/runHistory';
import { SemanticBadge } from '@/components/SemanticBadge';
import { normalizeWebsiteUrl, isValidWebsiteUrl, WEBSITE_URL_VALIDATION_MESSAGE } from '@/lib/urlUtils';
import {
  addCompareCandidate,
  addSelectedCandidate,
  candidateStorageKey,
  clearSelectedCandidates,
  readCompareCandidates,
  readSelectedCandidates,
  removeCompareCandidate,
  removeSelectedCandidate,
  type StoredCompareCandidate,
} from '@/lib/compareSelection';
import {
  LAST_ORIGINATION_RESULT_KEY,
  SAVED_LEADS_KEY,
  getSavedLeads,
  saveLead,
  type WorkflowTarget,
} from '@/lib/workflowTargets';
import { OriginationQuotaNotice, useUsage } from '@/contexts/UsageContext';
import { createBackendAccount, getUserId, getWorkspaceId } from '@/lib/trialAccount';

// ─── Origination API call ─────────────────────────────────────────────────────

interface OriginationRequest {
  run_id?: string;
  origination_mode?: 'candidate_discovery' | 'thesis_research' | 'target_universe_ranking';
  buyer_type?: 'pe_platform' | 'corporate_development' | 'independent_sponsor' | 'strategic_acquirer' | 'operating_partner' | 'search_fund';
  buyer_thesis: string;
  sector: string;
  sector_or_vertical?: string;
  geography: string;
  optional_keywords?: string;
  size_criteria: string;
  strategic_rationale: string;
  targets?: KnownTarget[];
  workspace_id?: string;
  user_id?: string;
  save_to_cockpit?: boolean;
}

interface WorkspacePersistenceResult {
  record: Record<string, unknown>;
  idempotent_replay?: boolean;
}

type OriginationResult = Record<string, unknown>;

const ORIGINATION_REQUEST_TIMEOUT_MS = 45_000;

interface OriginationRequestDiagnostics {
  endpoint: string;
  status?: number;
  response_body?: OriginationResult | string | null;
  response_headers?: Record<string, string>;
  quota_type?: string;
  error_code?: string;
  message?: string;
  raw_json?: string;
  response_format?: 'json' | 'html' | 'text' | 'empty';
  timeout_ms?: number;
  elapsed_ms?: number;
}

interface OriginationProgressStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'warning' | 'failed';
  item_count?: number;
  explanation?: string;
}

function interpretedThesis(form: OriginationFormValues) {
  const target = [form.geo, form.sector || form.buyerThesis].filter(Boolean).join(' ') || 'Acquisition targets matching the written thesis';
  const mustMatch = [
    form.sector && `${form.sector} relevance`,
    form.geo && `${form.geo} relevance`,
    form.optionalKeywords && `Keywords: ${form.optionalKeywords}`,
    form.sizeCriteria && `Size: ${form.sizeCriteria}`,
  ].filter(Boolean) as string[];
  const preferred = [form.rationale, form.buyerMandate === 'operating_partner' ? 'Portfolio add-on fit' : 'Acquisition mandate fit'].filter(Boolean);
  const exclusionMatch = form.buyerThesis.match(/(?:exclude|excluding|not\s+)([^.;]+)/i);
  const excluded = exclusionMatch ? exclusionMatch[1].split(/,|\band\b/i).map(item => item.trim()).filter(Boolean) : [];
  const specialistTerms = ['fintech', 'healthcare', 'utilities', 'public safety', 'cyber', 'industrial', 'govtech'];
  const excludedText = excluded.join(' ').toLowerCase();
  const thesisTerms = specialistTerms.filter(term => form.buyerThesis.toLowerCase().includes(term) && !excludedText.includes(term));
  const refinements = `${form.sector} ${form.optionalKeywords}`.toLowerCase();
  const unreflected = thesisTerms.filter(term => !refinements.includes(term));
  const conflicts = unreflected.length && form.sector
    ? [`Your written thesis includes ${unreflected.join(', ')}, while the sector field is “${form.sector}”. The written terms will remain required criteria.`]
    : [];
  return { target, mustMatch, preferred, excluded, conflicts };
}

function backendProgressStages(data: OriginationResult): OriginationProgressStage[] {
  const raw = data.progress_stages ?? data.pipeline_stages ?? data.stages;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const stage = item as Record<string, unknown>;
    const rawStatus = safeStr(stage.status).toLowerCase();
    const status = rawStatus === 'running' ? 'active' : rawStatus === 'completed' ? 'complete' : rawStatus;
    if (!['pending', 'active', 'complete', 'warning', 'failed'].includes(status)) return [];
    return [{
      id: safeStr(stage.id ?? stage.stage, `stage-${index}`),
      label: humanLabel(safeStr(stage.label ?? stage.name ?? stage.stage, `Stage ${index + 1}`)),
      status: status as OriginationProgressStage['status'],
      item_count: numericOrNull(stage.item_count ?? stage.count) ?? undefined,
      explanation: safeStr(stage.explanation ?? stage.message),
    }];
  });
}

const LAST_ORIGINATION_FORM_KEY = 'frontier_last_origination_form';
const ORIGINATION_RUNS_KEY = 'frontier_origination_runs';

const FIND_COMPANY_EXAMPLES = [
  { label: 'Software utility / UK', sector: 'Software utility', geo: 'UK', optionalKeywords: '' },
  { label: 'Energy operations software / UK', sector: 'Energy operations software', geo: 'UK', optionalKeywords: '' },
  { label: 'Public safety software / UK', sector: 'Public safety software', geo: 'UK', optionalKeywords: '' },
  { label: 'Healthcare workflow software / UK', sector: 'Healthcare workflow software', geo: 'UK', optionalKeywords: '' },
  { label: 'Field service software / UK', sector: 'Field service software', geo: 'UK', optionalKeywords: '' },
];

type OriginationMode = 'candidate_discovery' | 'thesis_research';
type BuyerMandate = NonNullable<OriginationRequest['buyer_type']>;

interface OriginationFormValues {
  mode: OriginationMode;
  buyerMandate: BuyerMandate;
  sector: string;
  geo: string;
  optionalKeywords: string;
  sizeCriteria: string;
  rationale: string;
  buyerThesis: string;
  targetUniverse: string;
}

function isQuotaExceededResponse(body: OriginationResult | null | undefined): boolean {
  if (!body || typeof body !== 'object') return false;
  return body.error === 'quota_exceeded' || body.status === 'quota_exceeded';
}

function originationErrorMessage(body: OriginationResult | null | undefined, status: number): string {
  if (isQuotaExceededResponse(body)) {
    return safeStr(body?.message || body?.error, 'Origination quota has been reached.');
  }
  if (typeof body?.message === 'string' && body.message.trim() && body.status === 'error') {
    return body.message;
  }
  return `Backend returned status ${status}.`;
}

function nestedRecord(value: unknown): OriginationResult | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as OriginationResult : null;
}

function backendField(body: OriginationResult | null, field: string): string {
  const detail = nestedRecord(body?.detail);
  const error = nestedRecord(body?.error);
  if (field === 'message') {
    return safeStr(body?.message ?? detail?.message ?? error?.message ?? body?.detail);
  }
  return safeStr(body?.[field] ?? detail?.[field] ?? error?.[field]);
}

class OriginationApiError extends Error {
  backendBody: OriginationResult | null;
  diagnostics: OriginationRequestDiagnostics;

  constructor(message: string, backendBody: OriginationResult | null, diagnostics: OriginationRequestDiagnostics) {
    super(message);
    this.name = 'OriginationApiError';
    this.backendBody = backendBody;
    this.diagnostics = diagnostics;
  }
}

interface StoredOriginationRun {
  id: string;
  run_id: string;
  workspace_id: string;
  run_type: 'origination';
  created_at: string;
  completed_at: string;
  status: string;
  quality_state: string;
  discovery_quality: string;
  execution_mode: string;
  source_count: number;
  candidate_count: number;
  confirmed_company_count: number;
  possible_lead_count: number;
  research_source_count: number;
  top_candidates: string[];
  candidate_identities: Array<{ company_name: string; website: string }>;
  source_links: string[];
  diagnostics_summary: Record<string, unknown>;
  schema_version: '1.0';
  sync_state: 'synced' | 'pending';
  thesis: string;
  sector: string;
  geography: string;
  size_criteria: string;
  strategic_rationale: string;
  result_summary: string;
  result: OriginationResult;
  form: OriginationFormValues;
}

interface KnownTarget {
  company_name: string;
  website: string;
  jurisdiction: string;
  sector: string;
  source_label: 'User supplied target universe';
}

class OriginationTimeoutError extends Error {
  diagnostics: OriginationRequestDiagnostics;

  constructor(diagnostics: OriginationRequestDiagnostics) {
    super('Origination discovery took too long. Try a narrower thesis or provide known targets.');
    this.name = 'OriginationTimeoutError';
    this.diagnostics = diagnostics;
  }
}

async function runOrigination(
  req: OriginationRequest,
  onProgress?: (job: OriginationResult) => void,
): Promise<OriginationResult> {
  const base = getBackendBaseUrl();
  const jobsUrl = base ? `${base}/api/origination/jobs` : '/api/origination/jobs';
  const controller = new AbortController();
  const startedAt = Date.now();
  let endpoint = jobsUrl;
  let timeout: number | undefined;
  const requestInit: RequestInit = {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
    signal:  controller.signal,
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = window.setTimeout(() => {
      controller.abort();
      reject(new OriginationTimeoutError({
        endpoint,
        timeout_ms: ORIGINATION_REQUEST_TIMEOUT_MS,
        elapsed_ms: Date.now() - startedAt,
      }));
    }, ORIGINATION_REQUEST_TIMEOUT_MS);
  });

  const requestPromise = (async () => {
    let startResponse = await fetch(endpoint, requestInit);
    if (startResponse.status === 404) {
      endpoint = base ? `${base}/api/origination/run` : '/api/origination/run';
      startResponse = await fetch(endpoint, requestInit);
    }
    const rawBody = await startResponse.text();
    const contentType = startResponse.headers.get('content-type') || '';
    const looksLikeHtml = /text\/html/i.test(contentType) || /^\s*<!doctype html|^\s*<html/i.test(rawBody);
    let body: OriginationResult | null = null;
    let responseFormat: NonNullable<OriginationRequestDiagnostics['response_format']> = rawBody ? 'text' : 'empty';
    if (rawBody && !looksLikeHtml) {
      try {
        const parsed = JSON.parse(rawBody);
        body = nestedRecord(parsed);
        responseFormat = 'json';
      } catch {
        responseFormat = 'text';
      }
    } else if (looksLikeHtml) {
      responseFormat = 'html';
    }
    const backendMessage = backendField(body, 'message') || originationErrorMessage(body, startResponse.status);
    const diagnostics: OriginationRequestDiagnostics = {
      endpoint,
      status: startResponse.status,
      response_body: body ?? (rawBody || null),
      response_headers: Object.fromEntries(startResponse.headers.entries()),
      quota_type: backendField(body, 'quota_type'),
      error_code: backendField(body, 'error_code') || backendField(body, 'code') || (typeof body?.error === 'string' ? body.error : ''),
      message: backendMessage,
      raw_json: responseFormat === 'json' ? rawBody : '',
      response_format: responseFormat,
    };
    if (responseFormat === 'html') {
      console.error('[origination] backend returned HTML instead of JSON', { endpoint, status: startResponse.status, response_body: rawBody });
    }
    if (!startResponse.ok || isQuotaExceededResponse(body) || responseFormat !== 'json') {
      console.error('[origination] backend request failed', diagnostics);
      throw new OriginationApiError(backendMessage, body, diagnostics);
    }
    if (!backendField(body, 'job_id')) {
      return body ?? {};
    }
    const jobId = backendField(body, 'job_id');
    if (!jobId) throw new OriginationApiError('Backend did not return an Origination job ID.', body, { ...diagnostics, error_code: 'ORIGINATION_JOB_ID_MISSING' });
    endpoint = `${jobsUrl}/${encodeURIComponent(jobId)}`;
    while (true) {
      const statusResponse = await fetch(endpoint, { signal: controller.signal });
      const job = nestedRecord(await statusResponse.json());
      if (!statusResponse.ok || !job) {
        const errorCode = backendField(job, 'error_code') || backendField(job, 'code') || 'ORIGINATION_JOB_STATUS_FAILED';
        throw new OriginationApiError(backendField(job, 'message') || `Backend returned status ${statusResponse.status}.`, job, {
          endpoint, status: statusResponse.status, response_body: job, error_code: errorCode,
        });
      }
      onProgress?.(job);
      if (job.status === 'failed') {
        const failure = nestedRecord(job.error);
        throw new OriginationApiError(backendField(failure, 'message') || 'Origination job failed.', job, {
          endpoint, status: statusResponse.status, response_body: job,
          error_code: backendField(failure, 'error_code') || 'ORIGINATION_JOB_FAILED',
        });
      }
      if (job.status === 'completed') {
        const result = nestedRecord(job.result) || {};
        if (import.meta.env.DEV && req.save_to_cockpit) {
          console.info('[origination] persistence response', {
            request_url: jobsUrl, method: 'POST', workspace_id: req.workspace_id,
            run_id: safeStr(result.origination_id), http_status: statusResponse.status,
            parsed_response: result, save_duration_ms: Date.now() - startedAt,
            error_code: '', error_message: '',
          });
        }
        return result;
      }
      await new Promise<void>(resolve => window.setTimeout(resolve, 150));
    }
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError')
      || (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError')
    ) {
      throw new OriginationTimeoutError({
        endpoint,
        timeout_ms: ORIGINATION_REQUEST_TIMEOUT_MS,
        elapsed_ms: Date.now() - startedAt,
      });
    }
    throw err;
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

async function workspaceRequest(path: string, init?: RequestInit): Promise<OriginationResult> {
  const base = getBackendBaseUrl();
  const endpoint = base ? `${base}${path}` : path;
  const response = await fetch(endpoint, init);
  const body = nestedRecord(await response.json().catch(() => null));
  if (!response.ok || !body) {
    const errorCode = backendField(body, 'error_code') || backendField(body, 'code') || 'WORKSPACE_REQUEST_FAILED';
    const diagnostics = { endpoint, status: response.status, response_body: body, error_code: errorCode, message: backendField(body, 'message') };
    if (import.meta.env.DEV) console.error('[origination] workspace contract failed', diagnostics);
    throw new OriginationApiError(diagnostics.message || `Workspace request failed (${errorCode}).`, body, diagnostics);
  }
  return body;
}

async function persistOriginationRun(
  workspaceId: string,
  userId: string,
  runId: string,
  result: OriginationResult,
  retry = false,
): Promise<WorkspacePersistenceResult> {
  const path = retry
    ? `/api/workspace/origination-runs/${encodeURIComponent(runId)}/retry`
    : '/api/workspace/origination-runs';
  const body = await workspaceRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, user_id: userId, run_id: runId, result: { ...result, run_id: runId } }),
  });
  return { record: asRecord(body.record), idempotent_replay: body.idempotent_replay === true };
}

async function retrieveOriginationRuns(workspaceId: string): Promise<Record<string, unknown>[]> {
  const body = await workspaceRequest(`/api/workspace/origination-runs?workspace_id=${encodeURIComponent(workspaceId)}`);
  return Array.isArray(body.records) ? body.records.filter(item => item && typeof item === 'object') as Record<string, unknown>[] : [];
}

function safeStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(item => safeStr(item)).filter(Boolean).join(', ');
  return fallback;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return safeStr(value) ? [safeStr(value)] : [];
  return value.map(item => safeStr(item)).filter(Boolean);
}

function showDeveloperDiagnostics(): boolean {
  return import.meta.env.DEV;
}

function humanLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function parseKnownTargetUniverse(value: string): KnownTarget[] {
  const targets: KnownTarget[] = [];
  for (const line of value.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const [company, website, jurisdiction, ...sectorParts] = line.split(',').map(part => part.trim());
    const normalizedWebsite = normalizeWebsiteUrl(website || '');
    if (normalizedWebsite && !isValidWebsiteUrl(normalizedWebsite)) {
      throw new Error(WEBSITE_URL_VALIDATION_MESSAGE);
    }
    if (company && normalizedWebsite) {
      targets.push({
        company_name: company || '',
        website: normalizedWebsite,
        jurisdiction: jurisdiction || '',
        sector: sectorParts.join(', ').trim(),
        source_label: 'User supplied target universe' as const,
      });
    }
  }
  return targets;
}

function titleCaseWords(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatBuyerType(value: string): string {
  const buyerTypes: Record<string, string> = {
    search_fund: 'Search Fund',
    operating_partner: 'Operating Partner',
    corporate_development: 'Corporate Development',
    private_equity: 'Private Equity',
  };
  return buyerTypes[value] || titleCaseWords(value);
}

function polishOriginationPreviewSummary(summary: string): string {
  const match = summary.match(
    /^No source-backed targets available for ([a-z_]+) thesis in (.+?) \/ (.+?) in hosted preview\.$/i,
  );
  if (!match) return summary;
  const [, buyerType, geography, sector] = match;
  return `No evidenced targets are available for this ${formatBuyerType(buyerType)} thesis in ${geography} ${sector} within the hosted preview.`;
}

function isSyntheticReferenceCandidate(candidate: Record<string, unknown>): boolean {
  return candidate.synthetic_reference_target === true
    || safeStr(candidate.source_mode) === 'synthetic_reference_examples'
    || safeStr(candidate.source_note).toLowerCase().includes('synthetic example');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hasKnownTargetUniverse(value: string): boolean {
  return value.split(/\r?\n/).some(line => line.trim().length > 0);
}

function hasRegistryCandidates(data: OriginationResult): boolean {
  const sourceMode = safeStr(data.source_mode || data.universe_mode).toLowerCase();
  const provider = safeStr(data.target_discovery_provider).toLowerCase();
  const candidates = [
    ...((data.targets as unknown[] | undefined) ?? []),
    ...((data.ranked_targets as unknown[] | undefined) ?? []),
    ...((data.candidates as unknown[] | undefined) ?? []),
  ].filter(item => item && typeof item === 'object') as Record<string, unknown>[];
  return sourceMode.includes('companies_house')
    || provider.includes('companies_house')
    || candidates.some(candidate => (
      safeStr(candidate.source_mode).toLowerCase().includes('companies_house')
      || safeStr(candidate.source_label).toLowerCase().includes('companies house')
      || safeStr(candidate.classification).toLowerCase().includes('registry')
      || safeStr(candidate.verification_status).toLowerCase().includes('registry')
    ));
}

function discoveryStatusCopy(
  targetUniverse: string,
  response?: OriginationResult,
): string {
  if (hasKnownTargetUniverse(targetUniverse)) {
    return 'Frontier will rank the supplied targets. It will not invent companies.';
  }

  if (!response) {
    return 'Live discovery returns evidenced leads. Where coverage is unavailable, Frontier interprets the thesis and identifies research angles without inventing companies.';
  }

  if (response) {
    const responseSourceMode = safeStr(response.source_mode || response.universe_mode).toLowerCase();
    const responseCandidates = [
      ...((response.targets as unknown[] | undefined) ?? []),
      ...((response.ranked_targets as unknown[] | undefined) ?? []),
      ...((response.candidates as unknown[] | undefined) ?? []),
    ].filter(item => item && typeof item === 'object') as Record<string, unknown>[];
    if (
      responseSourceMode.includes('user_supplied_target_universe')
      || responseCandidates.some(candidate => safeStr(candidate.source_label).toLowerCase().includes('user supplied target universe'))
    ) {
      return 'Frontier will rank the supplied targets. It will not invent companies.';
    }
    if (hasRegistryCandidates(response)) {
      return 'Registry discovery returned Companies House leads. Product websites still need verification before screening.';
    }
    if (responseSourceMode.includes('web_search')) {
      return 'Web discovery returned evidenced candidates. Review each company before outreach.';
    }
    if (response.source_backed_target_universe_available === false) {
      return 'No evidenced target universe was available. No companies were invented.';
    }
  }

  return 'Live discovery returns evidenced leads. Where coverage is unavailable, Frontier interprets the thesis and identifies research angles without inventing companies.';
}

function sourceUrls(candidate: Record<string, unknown>): string[] {
  const urls = Array.isArray(candidate.source_urls)
    ? candidate.source_urls.map(item => safeStr(item)).filter(Boolean)
    : [];
  const sourceUrl = safeStr(candidate.source_url);
  const sourcePageUrl = safeStr(candidate.source_page_url);
  if (sourceUrl && !urls.includes(sourceUrl)) urls.unshift(sourceUrl);
  if (sourcePageUrl && !urls.includes(sourcePageUrl)) urls.unshift(sourcePageUrl);
  return urls;
}

function candidateType(candidate: Record<string, unknown>): string {
  return safeStr(candidate.candidate_type) || safeStr(candidate.company_type) || (
    safeStr(candidate.display_mode) === 'source_page_row'
      ? 'source_page'
      : safeStr(candidate.classification) === 'user_supplied_claim'
      ? 'company_candidate'
      : 'company_candidate'
  );
}

function looksLikeResearchSourceTitle(value: unknown): boolean {
  const text = safeStr(value).trim().toLowerCase();
  if (!text) return false;
  return /^(top|best|how\b|r\/)/i.test(text)
    || /\b(guide|list|market|article|reddit|medium|cio|directory|report|startup|startups|companies)\b/i.test(text);
}

function isResearchSourceCandidate(candidate: Record<string, unknown>): boolean {
  const type = candidateType(candidate);
  return ['source_page', 'directory_or_listicle', 'news_article', 'research_article', 'forum_thread', 'market_report', 'search_result'].includes(type)
    || safeStr(candidate.display_mode) === 'source_page_row'
    || safeStr(candidate.candidate_quality) === 'research_source'
    || looksLikeResearchSourceTitle(candidate.title ?? candidate.source_page_title ?? candidate.source_title ?? candidate.company_name);
}

function isUserSuppliedCandidate(candidate: Record<string, unknown>): boolean {
  const classification = safeStr(candidate.classification);
  const sourceMode = safeStr(candidate.source_mode);
  return classification === 'user_supplied_claim' || sourceMode === 'user_supplied_target_universe';
}

function isCompanyCandidate(candidate: Record<string, unknown>): boolean {
  const type = candidateType(candidate);
  return type === 'company' || type === 'company_candidate' || type === 'extracted_company_candidate' || isUserSuppliedCandidate(candidate);
}

function officialWebsiteConfidence(candidate: Record<string, unknown>): string {
  return safeStr(candidate.official_website_confidence, 'unknown');
}

function isConfirmedCompanyCandidate(candidate: Record<string, unknown>): boolean {
  const website = safeStr(candidate.official_website ?? candidate.website);
  const confidence = officialWebsiteConfidence(candidate);
  const websiteStatus = safeStr(candidate.website_status);
  return isCompanyCandidate(candidate)
    && !isResearchSourceCandidate(candidate)
    && Boolean(website)
    && (
      websiteStatus === 'confirmed_official'
      || websiteStatus === 'likely_official'
      || ['high', 'medium'].includes(confidence)
      || isUserSuppliedCandidate(candidate)
    );
}

function productSignalLevel(candidate: Record<string, unknown>): string {
  const productSignal = candidate.product_signal;
  if (productSignal && typeof productSignal === 'object' && !Array.isArray(productSignal)) {
    const signal = productSignal as Record<string, unknown>;
    return safeStr(signal.summary ?? signal.level ?? signal.workflow_depth, 'unknown');
  }
  return safeStr(candidate.product_signal_level ?? candidate.product_signal, 'unknown');
}

function signalDetail(candidate: Record<string, unknown>, keys: string[], fallback = 'Not found in source snippet.'): string {
  for (const key of keys) {
    const value = candidate[key];
    if (!value) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const detail = safeStr(record.detail ?? record.summary ?? record.value ?? record.status);
      if (detail) return detail;
    }
    const text = safeStr(value);
    if (text) return text;
  }
  return fallback;
}

function sourceConfidence(candidate: Record<string, unknown>): string {
  return safeStr(candidate.source_confidence ?? candidate.extraction_confidence ?? candidate.official_website_confidence, 'unknown');
}

function candidateQuality(candidate: Record<string, unknown>): string {
  return safeStr(candidate.candidate_quality || (
    safeStr(candidate.display_mode) === 'compact_row'
      ? 'needs_website_confirmation'
      : safeStr(candidate.display_mode) === 'hidden_excluded'
      ? 'excluded'
      : 'screenable_now'
  ));
}

function candidateDisplayMode(candidate: Record<string, unknown>): string {
  if (isResearchSourceCandidate(candidate)) return 'source_page_row';
  if (!isCompanyCandidate(candidate)) return 'hidden_excluded';
  const explicit = safeStr(candidate.display_mode);
  if (explicit) return explicit;
  const quality = candidateQuality(candidate);
  if (quality === 'excluded') return 'hidden_excluded';
  if (quality === 'needs_website_confirmation' || quality === 'low_priority') return 'compact_row';
  return 'full_card';
}

function candidateGroups(candidates: Record<string, unknown>[]) {
  const companyCandidates = candidates.filter(c => isCompanyCandidate(c) && !isResearchSourceCandidate(c));
  return {
    confirmed: companyCandidates.filter(c => isConfirmedCompanyCandidate(c) && candidateQuality(c) !== 'excluded'),
    needsWebsite: companyCandidates.filter(c => !isConfirmedCompanyCandidate(c) && candidateQuality(c) !== 'excluded'),
    lowPriority: companyCandidates.filter(c => candidateQuality(c) === 'low_priority' && candidateDisplayMode(c) !== 'full_card'),
    researchSources: candidates.filter(c => isResearchSourceCandidate(c)),
    excluded: candidates.filter(c => (isCompanyCandidate(c) && candidateQuality(c) === 'excluded') || candidateDisplayMode(c) === 'hidden_excluded'),
  };
}

function displayValue(value: unknown, fallback = 'Unknown'): string {
  const text = safeStr(value);
  return text || fallback;
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStoredOriginationForm(): OriginationFormValues {
  const empty: OriginationFormValues = {
    mode: 'candidate_discovery',
    buyerMandate: 'pe_platform',
    sector: '',
    geo: '',
    optionalKeywords: '',
    sizeCriteria: '',
    rationale: '',
    buyerThesis: '',
    targetUniverse: '',
  };
  if (!storageAvailable()) return empty;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_ORIGINATION_FORM_KEY) || '{}') as Partial<OriginationFormValues>;
    return {
      mode: parsed.mode === 'thesis_research' ? 'thesis_research' : 'candidate_discovery',
      buyerMandate: parsed.buyerMandate || 'pe_platform',
      sector: safeStr(parsed.sector),
      geo: safeStr(parsed.geo),
      optionalKeywords: safeStr(parsed.optionalKeywords),
      sizeCriteria: safeStr(parsed.sizeCriteria),
      rationale: safeStr(parsed.rationale),
      buyerThesis: safeStr(parsed.buyerThesis),
      targetUniverse: safeStr(parsed.targetUniverse),
    };
  } catch {
    return empty;
  }
}

function readStoredOriginationResult(): OriginationResult | null {
  if (!storageAvailable()) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_ORIGINATION_RESULT_KEY) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as OriginationResult : null;
  } catch {
    return null;
  }
}

function storeOriginationRun(form: OriginationFormValues, result: OriginationResult): boolean {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(LAST_ORIGINATION_FORM_KEY, JSON.stringify(form));
    window.localStorage.setItem(LAST_ORIGINATION_RESULT_KEY, JSON.stringify(result));
    return window.localStorage.getItem(LAST_ORIGINATION_RESULT_KEY) !== null;
  } catch (error) {
    console.warn('[origination] result received but could not be persisted', {
      storage: 'localStorage',
      error_name: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : safeStr(error),
    });
    return false;
  }
}

function clearStoredOriginationRun(): void {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(LAST_ORIGINATION_FORM_KEY);
  window.localStorage.removeItem(LAST_ORIGINATION_RESULT_KEY);
}

function readOriginationRuns(): StoredOriginationRun[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORIGINATION_RUNS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const activeWorkspaceId = getWorkspaceId() || '';
    const migrationRequired = parsed.some(item => item && typeof item === 'object' && (
      item.schema_version !== '1.0' || !item.run_id || !item.workspace_id || !item.completed_at
    ));
    const normalized = parsed
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const legacy = item as Partial<StoredOriginationRun>;
        const createdAt = validIsoTimestamp(legacy.created_at) || new Date(0).toISOString();
        return {
          ...legacy,
          id: safeStr(legacy.id ?? legacy.run_id),
          run_id: safeStr(legacy.run_id ?? legacy.id),
          workspace_id: safeStr(legacy.workspace_id, activeWorkspaceId),
          run_type: 'origination' as const,
          created_at: createdAt,
          completed_at: validIsoTimestamp(legacy.completed_at) || createdAt,
          status: safeStr(legacy.status, 'completed'),
          quality_state: safeStr(legacy.quality_state, 'unknown'),
          discovery_quality: safeStr(legacy.discovery_quality ?? legacy.quality_state, 'unknown'),
          execution_mode: safeStr(legacy.execution_mode, 'legacy'),
          source_count: Number(legacy.source_count ?? 0),
          candidate_count: Number(legacy.candidate_count ?? candidateCount(legacy.result || {})),
          confirmed_company_count: Number(legacy.confirmed_company_count ?? 0),
          possible_lead_count: Number(legacy.possible_lead_count ?? 0),
          research_source_count: Number(legacy.research_source_count ?? 0),
          top_candidates: Array.isArray(legacy.top_candidates) ? legacy.top_candidates : [],
          candidate_identities: Array.isArray(legacy.candidate_identities) ? legacy.candidate_identities : [],
          source_links: Array.isArray(legacy.source_links) ? legacy.source_links : [],
          diagnostics_summary: legacy.diagnostics_summary || {},
          schema_version: '1.0' as const,
          sync_state: legacy.sync_state === 'synced' ? 'synced' as const : 'pending' as const,
        } as StoredOriginationRun;
      })
      .filter(item => item.id && item.result && typeof item.result === 'object');
    const reconciled = new Map<string, StoredOriginationRun>();
    normalized.forEach(item => {
      if (item.workspace_id && activeWorkspaceId && item.workspace_id !== activeWorkspaceId) return;
      const existing = reconciled.get(item.run_id);
      if (!existing
        || item.sync_state === 'synced' && existing.sync_state !== 'synced'
        || timestampValue(item.completed_at) > timestampValue(existing.completed_at)) {
        reconciled.set(item.run_id, item);
      }
    });
    const runs = Array.from(reconciled.values())
      .sort((a, b) => {
        const priority = (run: StoredOriginationRun) => ['completed', 'partial', 'partial_success'].includes(safeStr(run.status).toLowerCase()) ? 1 : 0;
        return priority(b) - priority(a) || timestampValue(b.completed_at) - timestampValue(a.completed_at);
      });
    if (migrationRequired) writeOriginationRuns(runs);
    return runs;
  } catch {
    return [];
  }
}

function writeOriginationRuns(runs: StoredOriginationRun[]): boolean {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(ORIGINATION_RUNS_KEY, JSON.stringify(runs.slice(0, 20)));
    const confirmed = JSON.parse(window.localStorage.getItem(ORIGINATION_RUNS_KEY) || '[]');
    return Array.isArray(confirmed) && confirmed.some(item => item?.run_id === runs[0]?.run_id || item?.id === runs[0]?.id);
  } catch (error) {
    console.warn('[origination] run history could not be persisted', {
      storage: 'localStorage',
      error_name: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : safeStr(error),
    });
    return false;
  }
}

function validIsoTimestamp(value: unknown): string {
  const text = safeStr(value);
  const parsed = Date.parse(text);
  return text && Number.isFinite(parsed) ? new Date(parsed).toISOString() : '';
}

function timestampValue(value: unknown): number {
  const parsed = Date.parse(safeStr(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function candidateCount(result: OriginationResult): number {
  const raw = (
    (result.targets as unknown[] | undefined) ??
    (result.ranked_targets as unknown[] | undefined) ??
    (result.candidates as unknown[] | undefined) ??
    []
  );
  return raw.filter(item => item && typeof item === 'object' && !isSyntheticReferenceCandidate(item as Record<string, unknown>)).length;
}

function saveOriginationRunToHistory(
  form: OriginationFormValues,
  result: OriginationResult,
  options: { workspaceId?: string; runId?: string; synced?: boolean } = {},
): { run: StoredOriginationRun; persisted: boolean } {
  const createdAt = new Date().toISOString();
  const groups = candidateGroups(((result.ranked_targets ?? result.targets ?? result.candidates) as Record<string, unknown>[] | undefined) || []);
  const summary = asRecord(result.candidate_summary);
  const backendRunId = safeStr(options.runId ?? result.origination_id ?? result.run_id);
  const runId = backendRunId || `orig_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;
  const run: StoredOriginationRun = {
    id: runId,
    run_id: runId,
    workspace_id: options.workspaceId ?? getWorkspaceId() ?? '',
    run_type: 'origination',
    created_at: createdAt,
    completed_at: validIsoTimestamp(result.completed_at) || createdAt,
    status: safeStr(result.status, 'completed'),
    quality_state: safeStr(summary.discovery_quality ?? result.quality_state, 'unknown'),
    discovery_quality: safeStr(summary.discovery_quality ?? result.quality_state, 'unknown'),
    execution_mode: safeStr(result.analysis_mode ?? result.normalized_mode ?? result.requested_mode, form.mode),
    source_count: Number(summary.research_sources_count ?? groups.researchSources.length),
    candidate_count: candidateCount(result),
    confirmed_company_count: Number(summary.confirmed_company_candidates ?? groups.confirmed.length),
    possible_lead_count: Number(summary.possible_leads_count ?? groups.needsWebsite.length),
    research_source_count: Number(summary.research_sources_count ?? groups.researchSources.length),
    top_candidates: groups.confirmed.slice(0, 5).map(candidate => safeStr(candidate.company_name ?? candidate.name)).filter(Boolean),
    candidate_identities: [...groups.confirmed, ...groups.needsWebsite].slice(0, 20).map(candidate => ({
      company_name: safeStr(candidate.company_name ?? candidate.name),
      website: safeStr(candidate.official_website ?? candidate.website),
    })).filter(candidate => candidate.company_name),
    source_links: groups.researchSources.flatMap(candidate => sourceUrls(candidate)).filter((url, index, urls) => urls.indexOf(url) === index).slice(0, 20),
    diagnostics_summary: asRecord(result.diagnostics_summary ?? result.execution_manifest),
    schema_version: '1.0',
    sync_state: (options.synced ?? result.saved_to_cockpit === true) && Boolean(backendRunId) ? 'synced' : 'pending',
    thesis: form.buyerThesis,
    sector: form.sector,
    geography: form.geo,
    size_criteria: form.sizeCriteria,
    strategic_rationale: form.rationale,
    result_summary: safeStr(result.summary ?? result.thesis_summary) || `${candidateCount(result)} candidates`,
    result,
    form,
  };
  const existing = readOriginationRuns();
  const reconciled = [run, ...existing.filter(item => item.run_id !== run.run_id)]
    .sort((a, b) => timestampValue(b.completed_at) - timestampValue(a.completed_at));
  return { run, persisted: writeOriginationRuns(reconciled) };
}

function deleteOriginationRun(id: string): StoredOriginationRun[] {
  const runs = readOriginationRuns().filter(run => run.id !== id);
  writeOriginationRuns(runs);
  return runs;
}

function storedCandidateFromWorkflowTarget(target: WorkflowTarget): StoredCompareCandidate {
  return {
    company_name: target.company_name,
    website: target.website,
    jurisdiction: target.jurisdiction,
    sector: target.sector || undefined,
    source: target.source,
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
    screening_status: target.screening_status,
    run_id: target.run_id || undefined,
    saved_at: target.saved_at || undefined,
  };
}

function readSavedLeads(): StoredCompareCandidate[] {
  return getSavedLeads().map(storedCandidateFromWorkflowTarget);
}

function addSavedLead(lead: StoredCompareCandidate): { added: boolean; leads: StoredCompareCandidate[] } {
  const existing = readSavedLeads();
  const key = candidateStorageKey(lead);
  if (existing.some(item => candidateStorageKey(item) === key)) {
    return { added: false, leads: existing };
  }
  saveLead(lead);
  const leads = readSavedLeads();
  return { added: true, leads };
}

function removeSavedLead(lead: Pick<StoredCompareCandidate, 'company_name' | 'website' | 'jurisdiction'>): StoredCompareCandidate[] {
  const key = candidateStorageKey(lead);
  const leads = readSavedLeads().filter(item => candidateStorageKey(item) !== key);
  if (storageAvailable()) {
    window.localStorage.setItem(SAVED_LEADS_KEY, JSON.stringify(leads));
  }
  return leads;
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(safeStr(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function storedCandidateFromOrigination(candidate: Record<string, unknown>): StoredCompareCandidate {
  const name = safeStr(candidate.company_name ?? candidate.company ?? candidate.name) || 'Unnamed candidate';
  const website = safeStr(candidate.official_website ?? candidate.website);
  const type = candidateType(candidate);
  const sourceUrl = sourceUrls(candidate)[0] || '';
  const canUseAsCompany = isConfirmedCompanyCandidate({ ...candidate, website });
  const compareReady = candidate.compare_ready === true || (canUseAsCompany && Boolean(website.trim()) && candidate.compare_ready !== false);
  const runReady = candidate.run_ready === true || (canUseAsCompany && Boolean(website.trim()) && candidate.run_ready !== false);
  return {
    company_name: name,
    website,
    jurisdiction: safeStr(candidate.jurisdiction ?? candidate.country),
    sector: safeStr(candidate.sector ?? candidate.vertical),
    source: 'origination',
    source_label: safeStr(candidate.source_label),
    source_url: sourceUrl,
    candidate_type: type,
    source_page_title: safeStr(candidate.source_page_title ?? candidate.source_title),
    evidence_status: safeStr(candidate.evidence_status ?? candidate.verification_status),
    fit_score_100: numericOrNull(candidate.fit_score_100 ?? candidate.fit_score ?? candidate.score),
    recommendation: safeStr(candidate.recommendation ?? candidate.verdict),
    candidate_quality: safeStr(candidate.candidate_quality),
    website_status: website.trim() ? safeStr(candidate.website_status, 'likely_official') : 'missing',
    compare_ready: compareReady,
    run_ready: runReady,
    ...(compareReady ? {} : { compare_note: 'Website/company target required before comparison.' }),
  };
}

// ─── Result renderer ──────────────────────────────────────────────────────────

function OriginationResultView({
  data,
  onReset,
  onPasteKnownTargets,
  onWorkspaceChange,
}: {
  data: OriginationResult;
  onReset: () => void;
  onPasteKnownTargets: () => void;
  onWorkspaceChange: () => void;
}) {
  const [showRejected, setShowRejected] = useState(false);
  const [savedCandidates, setSavedCandidates] = useState<Set<string>>(() => new Set(readSavedLeads().map(candidateStorageKey)));
  const [compareMessages, setCompareMessages] = useState<Record<string, string>>({});
  const [selectedCandidates, setSelectedCandidates] = useState<StoredCompareCandidate[]>(() => readSelectedCandidates());

  // Normalise candidate list — backend may call this field anything
  const rawCandidates = [
    ...((data.confirmed_company_candidates as unknown[] | undefined) ?? []),
    ...((data.ranked_targets as unknown[] | undefined) ?? []),
    ...((data.targets as unknown[] | undefined) ?? []),
    ...((data.candidates as unknown[] | undefined) ?? []),
  ].filter(item => item && typeof item === 'object') as Record<string, unknown>[];
  const candidates = rawCandidates
    .filter(candidate => !isSyntheticReferenceCandidate(candidate))
    .filter((candidate, index, all) => {
      const stored = storedCandidateFromOrigination(candidate);
      const key = candidateStorageKey(stored) || safeStr(candidate.source_url ?? candidate.source_page_url ?? candidate.company_name ?? index).toLowerCase();
      return all.findIndex(item => {
        const itemStored = storedCandidateFromOrigination(item);
        const itemKey = candidateStorageKey(itemStored) || safeStr(item.source_url ?? item.source_page_url ?? item.company_name).toLowerCase();
        return itemKey === key;
      }) === index;
    });
  const groupedCandidates = candidateGroups(candidates);
  const backendNeedsWebsite = (
    [
      ...((data.needs_website_confirmation as unknown[] | undefined) ?? []),
      ...((data.possible_leads_needing_website_confirmation as unknown[] | undefined) ?? []),
      ...((data.possible_leads_needing_website as unknown[] | undefined) ?? []),
    ].filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  );
  const backendRejectedExtractions = (
    Array.isArray(data.rejected_extractions)
      ? data.rejected_extractions.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
      : []
  );
  const backendResearchSources = (
    Array.isArray(data.research_sources)
      ? data.research_sources.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
      : []
  );
  const candidateSummary = asRecord(data.candidate_summary);
  const extractedCandidateSummary = asRecord(data.extracted_candidate_summary);
  const researchSources = [...backendResearchSources, ...groupedCandidates.researchSources].filter((source, index, all) => {
    const key = safeStr(source.url ?? source.source_page_url ?? source.source_url ?? source.title ?? source.source_page_title).toLowerCase();
    return !key || all.findIndex(item => safeStr(item.url ?? item.source_page_url ?? item.source_url ?? item.title ?? item.source_page_title).toLowerCase() === key) === index;
  });
  const needsWebsiteCandidates = [...backendNeedsWebsite, ...groupedCandidates.needsWebsite]
    .filter(candidate => isCompanyCandidate(candidate) && !isResearchSourceCandidate(candidate))
    .filter((candidate, index, all) => {
    const key = candidateStorageKey(storedCandidateFromOrigination(candidate));
    return all.findIndex(item => candidateStorageKey(storedCandidateFromOrigination(item)) === key) === index;
  });
  const rejectedExtractionItems = [...backendRejectedExtractions, ...groupedCandidates.excluded].filter((candidate, index, all) => {
    const key = safeStr(candidate.company_name ?? candidate.name ?? candidate.source_title ?? candidate.source_url ?? index).toLowerCase();
    return all.findIndex(item => safeStr(item.company_name ?? item.name ?? item.source_title ?? item.source_url).toLowerCase() === key) === index;
  });
  const sourcePagesFound = extractedCandidateSummary.source_pages_found ?? candidateSummary.source_pages_found ?? researchSources.length;
  const companiesExtracted = extractedCandidateSummary.companies_extracted ?? candidateSummary.companies_extracted ?? '0';
  const candidatesNeedingWebsite = candidateSummary.possible_leads_needing_website_confirmation ?? candidateSummary.needs_website_confirmation_count ?? extractedCandidateSummary.needs_website_confirmation ?? needsWebsiteCandidates.length;
  const rejectedExtractions = candidateSummary.rejected_extractions_count ?? candidateSummary.rejected_extractions ?? extractedCandidateSummary.rejected_extractions ?? rejectedExtractionItems.length;
  const confirmedCandidates = groupedCandidates.confirmed;
  const hasConfirmedCandidates = confirmedCandidates.length > 0;
  const hasPossibleLeads = needsWebsiteCandidates.length > 0;
  const openPossibleLeadsByDefault = !hasConfirmedCandidates && hasPossibleLeads;

  const isUnavailable = data.status === 'unavailable';
  const isReferenceUniverse = data.universe_mode === 'private_beta_reference_universe';
  const sourceMode = safeStr(data.source_mode || data.universe_mode);
  const hasSourceBackedUniverse = data.source_backed_target_universe_available === true
    || candidates.length > 0
    || researchSources.length > 0
    || needsWebsiteCandidates.length > 0
    || rejectedExtractionItems.length > 0;
  const summary    = (data.summary ?? data.thesis_summary) as string | undefined;
  const rationale  = (data.match_rationale ?? data.buyer_thesis) as string | undefined;
  const nextActArr = (data.recommended_next_actions ?? data.next_actions) as unknown[] | undefined;
  const evidGaps   = (data.common_evidence_gaps ?? data.evidence_gaps) as unknown[] | undefined;
  const limitations= (Array.isArray(data.limitations) ? data.limitations : data.limitations ? [data.limitations] : []) as unknown[];
  const warnings   = (Array.isArray(data.warnings) ? data.warnings : data.warnings ? [data.warnings] : []) as unknown[];
  const rejected   = (
    (data.excluded_targets as Record<string, unknown>[] | undefined) ??
    (data.rejected_targets as Record<string, unknown>[] | undefined) ??
    []
  );
  const showDiagnostics = showDeveloperDiagnostics();
  const responseDiscoveryCopy = discoveryStatusCopy('', data);
  const diagnostics = [
    ['openai_used', data.openai_used],
    ['ranking_mode', data.ranking_mode],
    ['model_used', data.model_used],
    ['fallback_reason', data.fallback_reason],
    ['source_mode', data.source_mode],
  ].filter(([, value]) => safeStr(value) !== '');

  if (isUnavailable) {
    return <OriginationUnavailable onReset={onReset} message={safeStr(data.message)} discoveryCopy={responseDiscoveryCopy} />;
  }

  if ((candidates.length === 0 && researchSources.length === 0 && needsWebsiteCandidates.length === 0 && rejectedExtractionItems.length === 0) || !hasSourceBackedUniverse) {
    return (
      <OriginationLimitedPreview
        onReset={onReset}
        warnings={warnings}
        limitations={limitations}
        summary={summary}
        discoveryCopy={responseDiscoveryCopy}
      />
    );
  }

  function handleSaveCandidate(candidate: Record<string, unknown>) {
    const stored = storedCandidateFromOrigination(candidate);
    saveOriginationTarget({
      companyName: stored.company_name,
      website: stored.website,
      sector: stored.sector || '',
      country: stored.jurisdiction,
      fitScore: safeStr(candidate.fit_score),
      evidenceConfidence: safeStr(candidate.evidence_confidence, 'Low'),
      aiRisk: safeStr(candidate.ai_risk ?? candidate.ai_risk_view, 'Unknown'),
      whyItFits: safeStr(candidate.why_it_fits ?? candidate.why_fits ?? candidate.rationale),
      missingEvidence: asList(candidate.missing_evidence ?? candidate.evidence_gaps),
      nextAction: safeStr(candidate.next_action, stored.run_ready ? 'Screen company URL before outreach or IC use.' : 'Find and verify operating website.'),
    });
    addSavedLead(stored);
    setSavedCandidates(prev => new Set(prev).add(candidateStorageKey(stored)));
    onWorkspaceChange();
  }

  function compareCandidateKey(candidate: Record<string, unknown>): string {
    return candidateStorageKey(storedCandidateFromOrigination(candidate));
  }

  function selectedCandidateKeys(): Set<string> {
    return new Set(selectedCandidates.map(candidateStorageKey));
  }

  function compareCandidateKeys(): Set<string> {
    return new Set(readCompareCandidates().map(candidateStorageKey));
  }

  function handleToggleSelected(candidate: Record<string, unknown>) {
    const stored = storedCandidateFromOrigination(candidate);
    const key = candidateStorageKey(stored);
    const selected = selectedCandidateKeys().has(key);
    const next = selected ? removeSelectedCandidate(stored) : addSelectedCandidate(stored).candidates;
    setSelectedCandidates(next);
    onWorkspaceChange();
  }

  function handleAddToCompare(candidate: Record<string, unknown>) {
    const stored = storedCandidateFromOrigination(candidate);
    if (stored.compare_ready === false) {
      const key = compareCandidateKey(candidate);
      setCompareMessages(prev => ({ ...prev, [key]: 'Website/company target required before comparison' }));
      return;
    }
    const { added } = addCompareCandidate(stored);
    const key = compareCandidateKey(candidate);
    setCompareMessages(prev => ({ ...prev, [key]: added ? 'Added to Compare' : 'In Compare' }));
    onWorkspaceChange();
  }

  function handleRunCandidate(candidate: Record<string, unknown>) {
    const stored = storedCandidateFromOrigination(candidate);
    if (!stored.website) {
      const key = candidateStorageKey(stored);
      setCompareMessages(prev => ({ ...prev, [key]: 'Website required before URL screen' }));
      return;
    }
    const params = new URLSearchParams({
      company_name: stored.company_name,
      company: stored.company_name,
      website: stored.website,
      jurisdiction: stored.jurisdiction,
      source: 'origination',
    });
    window.location.href = `/app/run?${params.toString()}`;
  }

  function handleEditLeadCandidate(candidate: Record<string, unknown>) {
    const stored = storedCandidateFromOrigination(candidate);
    addSavedLead(stored);
    setSavedCandidates(prev => new Set(prev).add(candidateStorageKey(stored)));
    onWorkspaceChange();
    const params = new URLSearchParams({
      company_name: stored.company_name,
      company: stored.company_name,
      jurisdiction: stored.jurisdiction,
      source: 'origination',
    });
    if (stored.website) params.set('website', stored.website);
    window.location.href = `/app/run?${params.toString()}`;
  }

  function handleCompareSelected() {
    const ready = selectedCandidates.filter(candidate => candidate.compare_ready !== false && candidate.website).slice(0, 5);
    ready.forEach(candidate => addCompareCandidate(candidate));
    onWorkspaceChange();
    if (ready.length > 0) window.location.href = '/app/compare';
  }

  function handleRunFirstSelected() {
    const first = selectedCandidates.find(candidate => candidate.run_ready !== false && candidate.website);
    if (!first) return;
    const params = new URLSearchParams({
      company_name: first.company_name,
      company: first.company_name,
      website: first.website,
      jurisdiction: first.jurisdiction,
      source: 'origination',
    });
    window.location.href = `/app/run?${params.toString()}`;
  }

  function handleSaveSelected() {
    selectedCandidates.forEach(candidate => {
      saveOriginationTarget({
        companyName: candidate.company_name,
        website: candidate.website,
        sector: candidate.sector || '',
        country: candidate.jurisdiction,
        fitScore: candidate.fit_score_100 == null ? '' : String(candidate.fit_score_100),
        evidenceConfidence: candidate.evidence_status || 'Unknown',
        aiRisk: 'Unknown',
        whyItFits: candidate.recommendation,
        missingEvidence: candidate.website ? [] : ['Website required before screening.'],
        nextAction: candidate.website ? 'Screen company URL before outreach or IC use.' : 'Find and verify operating website.',
      });
      addSavedLead(candidate);
    });
    setSavedCandidates(prev => {
      const next = new Set(prev);
      selectedCandidates.forEach(candidate => next.add(candidateStorageKey(candidate)));
      return next;
    });
    onWorkspaceChange();
  }

  function handleClearSelection() {
    clearSelectedCandidates();
    setSelectedCandidates([]);
    onWorkspaceChange();
  }

  function renderSelectionTray() {
    if (selectedCandidates.length === 0) return null;
    const compareReady = selectedCandidates.filter(candidate => candidate.compare_ready !== false && candidate.website).length;
    const runReady = selectedCandidates.filter(candidate => candidate.run_ready !== false && candidate.website).length;
    const missingWebsite = selectedCandidates.filter(candidate => !candidate.website).length;
    return (
      <div className="sticky bottom-4 z-20 rounded-lg border border-border bg-card shadow-lg px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedCandidates.length} selected</p>
            <p className="text-xs text-muted-foreground">{runReady} ready to screen · {compareReady} compare-ready · {missingWebsite} missing website</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={runReady === 0}
              onClick={handleRunFirstSelected}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-8 px-3 rounded-md transition-colors"
              title={runReady === 0 ? 'Website required before URL screen.' : undefined}
            >
              Screen first selected
            </button>
            <button
              type="button"
              onClick={handleSaveSelected}
              className="inline-flex items-center gap-1 text-xs font-medium border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed h-8 px-3 rounded-md transition-colors"
            >
              Save selected leads
            </button>
            <button
              type="button"
              disabled={compareReady === 0}
              onClick={handleCompareSelected}
              className="inline-flex items-center gap-1 text-xs font-medium border border-border bg-background text-foreground hover:bg-accent h-8 px-3 rounded-md transition-colors"
              title={compareReady === 0 ? 'Screen companies before comparing them.' : undefined}
            >
              Compare screened only
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-2 transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
        {compareReady === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">Screen companies before comparing them.</p>
        )}
      </div>
    );
  }

  function renderEvidenceCards(candidate: Record<string, unknown>) {
    const cards = Array.isArray(candidate.evidence_cards)
      ? candidate.evidence_cards.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
      : [];
    if (cards.length === 0) return null;
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {cards.slice(0, 6).map((card, idx) => {
          const type = safeStr(card.type, 'signal');
          const tone = type === 'verified_fact'
            ? 'verified'
            : type === 'warning'
            ? 'blocker'
            : type === 'unknown'
            ? 'unknown'
            : type === 'hypothesis'
            ? 'partial'
            : 'info';
          const url = safeStr(card.source_url);
          return (
            <div key={idx} className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <SemanticBadge tone={tone} className="text-[10px] px-2 py-1">
                  {humanLabel(type)}
                </SemanticBadge>
                {safeStr(card.evidence_status) && (
                  <span className="text-[10px] text-muted-foreground/60">{humanLabel(safeStr(card.evidence_status))}</span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground">{safeStr(card.label, 'Evidence')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{safeStr(card.detail)}</p>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[10px] text-primary hover:underline">
                  {safeStr(card.source_label, 'Source')}
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderFullCandidateCard(c: Record<string, unknown>, i: number) {
    const name = safeStr(c.company_name ?? c.company ?? c.name) || 'Unnamed candidate';
    const productName = safeStr(c.product_name ?? c.product_or_category_name);
    const website = safeStr(c.official_website ?? c.website ?? '');
    const type = candidateType(c);
    const productSignal = productSignalLevel(c);
    const hqSignal = signalDetail(c, ['hq_location_signal', 'location_signal', 'jurisdiction_signal'], safeStr(c.jurisdiction, 'Unknown'));
    const aiSignal = signalDetail(c, ['ai_signal', 'ai_adoption_signal'], 'Not found in source snippet.');
    const fundingSignal = signalDetail(c, ['funding_signal', 'financial_signal', 'funding_financial_signal'], 'Not found in source snippet.');
    const employeeSignal = signalDetail(c, ['employee_count_signal', 'team_size_signal', 'team_signal'], 'Not found in source snippet.');
    const confidence = sourceConfidence(c);
    const sourceLabel = safeStr(c.source_label) || 'Public-source candidate signal';
    const evidenceStatus = safeStr(c.evidence_status ?? c.verification_status ?? 'not_independently_verified');
    const verdict = safeStr(c.verdict ?? c.recommendation ?? '');
    const fit = numericOrNull(c.fit_score_100);
    const fits = safeStr(c.why_it_fits ?? c.why_fits ?? c.rationale ?? c.match_rationale ?? '');
    const mismatch = safeStr(c.key_mismatch ?? c.mismatch ?? c.why_wrong ?? c.negative_rationale ?? 'No material mismatch reported.');
    const action = safeStr(c.next_best_action ?? c.next_action ?? '');
    const description = safeStr(c.one_line_description ?? c.description ?? c.source_snippet ?? '');
    const risk = safeStr(c.ai_risk ?? c.ai_risk_view ?? c.ai_rebuild_risk_signal ?? '');
    const productDiagnostics = asRecord(c.product_ai_diagnostics);
    const aiDiagnostics = asRecord(productDiagnostics.ai_rebuild_risk);
    const aiRisk = safeStr(aiDiagnostics.level || risk);
    const rank = safeStr(c.rank, String(i + 1));
    const urls = sourceUrls(c);
    const compareKey = compareCandidateKey(c);
    const isSelected = selectedCandidateKeys().has(compareKey);
    const inCompare = compareCandidateKeys().has(compareKey);
    const stored = storedCandidateFromOrigination(c);
    const canSaveCandidate = Boolean(name);

    return (
      <div key={`${name}-${rank}`} className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleToggleSelected(c)}
            className={`inline-flex items-center justify-center h-6 px-2 rounded border text-[11px] font-medium transition-colors ${isSelected ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
          <span className="text-[11px] font-medium text-muted-foreground/50">#{rank}</span>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {fit !== null && <SemanticBadge tone="info">Fit {Math.max(0, Math.min(100, Math.round(fit)))}/100</SemanticBadge>}
          {type === 'extracted_company_candidate' && (
            <SemanticBadge tone="info">Company mention found</SemanticBadge>
          )}
          {verdict && <SemanticBadge tone="info">{verdict}</SemanticBadge>}
          <SemanticBadge tone={productSignal === 'strong' ? 'verified' : productSignal === 'plausible' ? 'info' : productSignal === 'weak' ? 'partial' : 'unknown'}>
            Product signal: {humanLabel(productSignal)}
          </SemanticBadge>
        </div>
        {productName && productName.toLowerCase() !== name.toLowerCase() && (
          <p className="mb-2 text-xs text-muted-foreground">Product evidence: {productName}</p>
        )}
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md bg-muted/25 px-3 py-2"><p className="font-semibold text-foreground">Key thesis match</p><p className="mt-0.5 text-muted-foreground">{shortText(fits || description, 'No supported match rationale returned.', 180)}</p></div>
          <div className="rounded-md bg-muted/25 px-3 py-2"><p className="font-semibold text-foreground">Key mismatch</p><p className="mt-0.5 text-muted-foreground">{shortText(mismatch, 'No material mismatch reported.', 180)}</p></div>
        </div>
        <details className="mt-3 rounded-md border border-border bg-background/40">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View evidence and score breakdown</summary>
          <div className="border-t border-border p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Official website</p>
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">
                {website}
              </a>
            ) : (
              <p className="font-medium text-muted-foreground">Unknown</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">HQ/location signal</p>
            <p className="font-medium text-muted-foreground">{hqSignal}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Product signal</p>
            <p className="font-medium text-muted-foreground">{humanLabel(productSignal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">AI signal</p>
            <p className="font-medium text-muted-foreground">{aiSignal}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Funding/financial signal</p>
            <p className="font-medium text-muted-foreground">{fundingSignal}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Employee/team signal</p>
            <p className="font-medium text-muted-foreground">{employeeSignal}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Source confidence</p>
            <p className="font-medium text-muted-foreground">{humanLabel(confidence)}</p>
          </div>
          {fit !== null && (
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Fit score</p>
              <p className="font-semibold text-foreground">{Math.max(0, Math.min(100, Math.round(fit)))}/100</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Evidence status</p>
            <p className="font-medium text-muted-foreground">{humanLabel(evidenceStatus)}</p>
          </div>
          {aiRisk && (
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">AI/product risk</p>
              <p className="font-medium text-muted-foreground">{humanLabel(aiRisk)}</p>
            </div>
          )}
        </div>
        {fits && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Why it fits</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{fits}</p>
          </div>
        )}
        {renderEvidenceCards(c)}
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => handleRunCandidate(c)}
            disabled={stored.run_ready === false || !website}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stored.run_ready === false || !website ? 'Add website' : 'Screen company'}
          </button>
          {canSaveCandidate && (
            <button
              type="button"
              onClick={() => handleSaveCandidate(c)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              {savedCandidates.has(candidateStorageKey(stored)) ? 'Saved lead' : 'Save lead'}
            </button>
          )}
          {stored.compare_ready !== false && website && (
            <button
              type="button"
              onClick={() => handleAddToCompare(c)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
            >
              {inCompare ? 'In Compare' : compareMessages[compareKey] || 'Add to Compare later'}
            </button>
          )}
          {!website && <span className="text-[11px] text-[var(--semantic-claim-text)]">Official website required before screening</span>}
          {action && <span className="text-[11px] text-muted-foreground/60">{action}</span>}
        </div>
        <p className="text-[10px] font-medium text-muted-foreground/40 mt-2">
          Source: {humanLabel(sourceLabel)}
        </p>
        {urls.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {urls.slice(0, 3).map(url => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                {url}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderCompactCandidateRow(c: Record<string, unknown>, i: number) {
    const name = safeStr(c.company_name ?? c.company ?? c.name) || 'Unnamed candidate';
    const productName = safeStr(c.product_name ?? c.product_or_category_name);
    const type = candidateType(c);
    const stored = storedCandidateFromOrigination(c);
    const sourceUrl = sourceUrls(c)[0] || '';
    const whyFound = safeStr(c.reason_found ?? c.why_this_candidate_matters ?? c.why_it_fits, 'Company-like name found in source-backed research.');
    const extractedContext = safeStr(c.source_context ?? c.extracted_context ?? c.source_snippet ?? c.description, 'Official website not confirmed.');
    const nextAction = safeStr(c.next_best_action ?? c.next_action, 'Find official company website');
    return (
      <div key={`${name}-${i}`} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1.3fr_1.5fr_1fr] gap-2 px-4 py-3 text-xs items-start">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          {productName && productName.toLowerCase() !== name.toLowerCase() && <p className="mt-1 text-[11px] text-muted-foreground">Product evidence: {productName}</p>}
          {type === 'extracted_company_candidate' && (
            <SemanticBadge tone="info" className="mt-1 text-[10px] px-2 py-1">Company mention found</SemanticBadge>
          )}
          <p className="mt-1 text-[11px] text-[var(--semantic-claim-text)]">Website status: needs confirmation</p>
        </div>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
            {displayValue(c.source_label, 'Source')}
          </a>
        ) : (
          <p className="text-muted-foreground">{displayValue(c.source_label, 'Source-backed mention')}</p>
        )}
        <p className="text-muted-foreground leading-relaxed">{whyFound}</p>
        <p className="text-muted-foreground leading-relaxed">{extractedContext}</p>
        <div>
          <button
            type="button"
            onClick={() => handleEditLeadCandidate(c)}
            className="inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
          >
            {savedCandidates.has(candidateStorageKey(stored)) ? 'Saved lead' : 'Save lead'}
          </button>
          {stored.website && (
            <button
              type="button"
              onClick={() => handleRunCandidate(c)}
              className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Use for screen
            </button>
          )}
          {!stored.website && (
            <button
              type="button"
              onClick={() => handleEditLeadCandidate(c)}
              className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] hover:bg-accent transition-colors whitespace-nowrap"
            >
              Add website
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSaveCandidate(c)}
            className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
          >
            Edit
          </button>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              Review source
            </a>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">{nextAction}</p>
        </div>
      </div>
    );
  }

  function renderResearchSourceRow(c: Record<string, unknown>, i: number) {
    const title = safeStr(c.title ?? c.source_page_title ?? c.source_title ?? c.company_name, 'Research source');
    const sourceUrl = safeStr(c.url ?? c.source_page_url ?? c.source_url);
    const sourceType = safeStr(c.source_type ?? c.candidate_type, 'research_source');
    const extractedCount = safeStr(c.extracted_candidate_count, '0');
    const extractionStatus = safeStr(c.extraction_status, 'no_candidates_found');
    const summary = safeStr(c.summary ?? c.source_snippet ?? c.description, 'Research source only. Extract actual company targets before screening.');
    return (
      <div key={`${title}-${i}`} className="px-4 py-3 border-t border-border/50">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <SemanticBadge tone="unknown">{humanLabel(sourceType)}</SemanticBadge>
              <SemanticBadge tone="unknown">Source page, not a company target</SemanticBadge>
              <SemanticBadge tone={extractionStatus === 'extracted' ? 'info' : 'partial'}>
                {extractionStatus === 'extracted' ? 'Company mentions found' : 'No confirmed target'}
              </SemanticBadge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Company mentions found: <span className="font-semibold text-foreground">{extractedCount}</span>
            </p>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-xs text-primary hover:underline">
                {sourceUrl}
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
              >
                Review source
              </a>
            )}
              <span className="inline-flex items-center text-[11px] text-muted-foreground px-1">Source page, not a company target</span>
          </div>
        </div>
      </div>
    );
  }

  function renderExcludedCandidate(c: Record<string, unknown>, i: number) {
    const name = safeStr(c.company_name ?? c.company ?? c.name) || 'Excluded candidate';
    return (
      <details key={`${name}-${i}`} className="border-t border-border/50">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground">
          {name}
        </summary>
        <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
          {safeStr(c.decision_rationale ?? c.exclusion_risk ?? c.why_it_may_be_wrong, 'Excluded or hidden by backend triage.')}
        </div>
      </details>
    );
  }

  function renderCandidateGroup(
    title: string,
    items: Record<string, unknown>[],
    mode: 'full' | 'compact' | 'excluded' | 'source',
    options: { collapsed?: boolean; defaultOpen?: boolean; description?: string; id?: string; intro?: string; note?: string } = {},
  ) {
    if (items.length === 0) return null;
    const body = (
      <>
        {options.intro && (
          <div className="px-4 py-3 border-b border-border bg-card/30">
            <p className="text-xs text-muted-foreground leading-relaxed">{options.intro}</p>
          </div>
        )}
        {mode === 'compact' && (
          <div className="hidden md:grid grid-cols-[1.1fr_1fr_1.3fr_1.5fr_1fr] gap-2 px-4 py-2 text-[10px] font-semibold text-muted-foreground border-b border-border bg-muted/20">
            <span>Company</span>
            <span>Source page</span>
            <span>Reason found</span>
            <span>Extracted context</span>
            <span>Actions</span>
          </div>
        )}
        <div className={mode === 'full' ? 'divide-y divide-border' : ''}>
          {items.map((item, index) => (
            mode === 'full'
              ? renderFullCandidateCard(item, index)
              : mode === 'compact'
              ? renderCompactCandidateRow(item, index)
              : mode === 'source'
              ? renderResearchSourceRow(item, index)
            : renderExcludedCandidate(item, index)
          ))}
        </div>
      </>
    );
    if (options.collapsed) {
      return (
        <details id={options.id} open={options.defaultOpen} className="group rounded-lg border border-border overflow-hidden bg-card/20">
          <summary className="px-4 py-3 cursor-pointer list-none border-b border-border bg-card/50 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-primary">{title}</p>
              {options.description && <p className="text-xs text-muted-foreground mt-1">{options.description}</p>}
              {options.note && <p className="text-[11px] font-medium text-primary mt-1">{options.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground/60">{items.length}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 transition-transform group-open:rotate-90" />
            </div>
          </summary>
          {body}
        </details>
      );
    }
    return (
      <div id={options.id} className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-primary">{title}</p>
            {options.description && <p className="text-xs text-muted-foreground mt-1">{options.description}</p>}
            {options.note && <p className="text-[11px] font-medium text-primary mt-1">{options.note}</p>}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground/60">{items.length}</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {(isReferenceUniverse || sourceMode.includes('private_beta_reference_universe')) && (
            <SemanticBadge tone="info">Private-beta reference universe</SemanticBadge>
          )}
          {sourceMode.includes('user_supplied_target_universe') && (
            <SemanticBadge tone="info">Known target universe</SemanticBadge>
          )}
          {hasRegistryCandidates(data) && (
            <SemanticBadge tone="partial">Registry leads</SemanticBadge>
          )}
          <SemanticBadge tone="partial">Validate before outreach</SemanticBadge>
          <SemanticBadge tone="unknown">No verified revenue/ARR/EBITDA/customer concentration</SemanticBadge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{responseDiscoveryCopy}</p>
      </div>

      {warnings.length > 0 && (
        <details className="group rounded-lg border border-border bg-card/30 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Screen notes</p>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-border px-4 py-3">
          <ul className="space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{safeStr(warning)}</li>
            ))}
          </ul>
          </div>
        </details>
      )}

      {showDiagnostics && diagnostics.length > 0 && (
        <details className="group rounded-lg border border-border bg-card/40 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Developer diagnostics</p>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 transition-transform group-open:rotate-90" />
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-border px-4 py-3">
            {diagnostics.map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-0.5">
                  {String(label)}
                </p>
                <p className="text-xs text-foreground break-words">{safeStr(value)}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Thesis summary */}
      {summary && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Thesis summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Candidate summary */}
      {(candidates.length > 0 || researchSources.length > 0 || needsWebsiteCandidates.length > 0) && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-semibold tracking-normal text-primary">
              Candidate summary
            </p>
            {safeStr(candidateSummary.discovery_quality) && (
              <SemanticBadge tone={safeStr(candidateSummary.discovery_quality) === 'low' ? 'partial' : safeStr(candidateSummary.discovery_quality) === 'high' ? 'verified' : 'info'}>
                Discovery quality: {humanLabel(safeStr(candidateSummary.discovery_quality))}
              </SemanticBadge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Confirmed companies', groupedCandidates.confirmed.length],
              ['Possible company leads', needsWebsiteCandidates.length],
              ['Research sources', researchSources.length],
              ['Rejected/low quality extractions', rejectedExtractions],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">{String(label)}</p>
                <p className="text-sm font-semibold text-foreground">{safeStr(value, '0')}</p>
              </div>
            ))}
          </div>
          {safeStr(companiesExtracted) && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              Company mentions found in research sources: <span className="font-semibold text-foreground">{safeStr(companiesExtracted, '0')}</span>
            </p>
          )}
          {safeStr(candidateSummary.top_next_action) && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              <span className="font-semibold text-foreground">Top next action:</span> {safeStr(candidateSummary.top_next_action)}
            </p>
          )}
          {safeStr(candidateSummary.why_quality) && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{safeStr(candidateSummary.why_quality)}</p>
          )}
        </div>
      )}

      {safeStr(candidateSummary.discovery_quality) === 'low' && (
        <div className="rounded-lg border border-amber-500/25 bg-[var(--semantic-claim-bg)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--semantic-claim-text)]">
            Some sources mention companies, but official websites must be confirmed before screening.
          </p>
        </div>
      )}

      {!hasConfirmedCandidates && hasPossibleLeads && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Company candidates</p>
          <p className="text-sm font-semibold text-foreground">Company mentions found. Confirm websites to screen them.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Frontier OS found company-like leads in research sources, but no official company websites were confirmed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Try narrower vertical
            </button>
            <a
              href="#origination-possible-leads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
            >
              Review possible leads
            </a>
            <button
              type="button"
              onClick={onPasteKnownTargets}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Paste known targets
            </button>
            <Link
              href="/app/run"
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Screen company URL
            </Link>
          </div>
        </div>
      )}

      {!hasConfirmedCandidates && !hasPossibleLeads && (
        <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Company candidates</p>
          <p className="text-sm font-semibold text-foreground">No company candidates found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Frontier OS found research sources, but no official company websites were confirmed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Try narrower vertical
            </button>
            <button
              type="button"
              onClick={onPasteKnownTargets}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Paste known targets
            </button>
            <a
              href="#origination-research-sources"
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Review research sources
            </a>
            <Link
              href="/app/run"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
            >
              Screen company URL
            </Link>
          </div>
        </div>
      )}

      {renderCandidateGroup('Company candidates', confirmedCandidates, 'full')}
      {renderCandidateGroup(
        'Possible company leads',
        needsWebsiteCandidates,
        'compact',
        {
          collapsed: needsWebsiteCandidates.length > 3 || openPossibleLeadsByDefault,
          defaultOpen: openPossibleLeadsByDefault,
          id: 'origination-possible-leads',
          description: 'Company mentions that need an official website before screening or comparison.',
          intro: 'Frontier OS found company mentions, but official websites must be confirmed before screening.',
          note: openPossibleLeadsByDefault ? 'Opened because no confirmed candidates were found.' : undefined,
        },
      )}
      {renderCandidateGroup(
        'Research sources used',
        researchSources,
        'source',
        {
          collapsed: true,
          defaultOpen: false,
          id: 'origination-research-sources',
          description: 'Articles, directories and search results used to find potential company mentions.',
        },
      )}
      {showDiagnostics && renderCandidateGroup(
        'Rejected extractions',
        rejectedExtractionItems,
        'excluded',
        {
          collapsed: true,
          description: 'Generic, invalid or low-quality extracted phrases hidden from candidate output.',
        },
      )}

      {/* Match rationale */}
      {rationale && (
        <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Match rationale</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{rationale}</p>
        </div>
      )}

      {/* Evidence gaps */}
      {evidGaps && evidGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-amber-700/70 mb-2">Evidence gaps</p>
          <ul className="space-y-1">
            {evidGaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/40 shrink-0" />
                {safeStr(g)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended next actions */}
      {nextActArr && nextActArr.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Recommended next actions</p>
          <ol className="space-y-1.5">
            {nextActArr.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-[10px] font-medium text-muted-foreground/50 shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {safeStr(a)}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Rejected targets — collapsible */}
      {rejected.length > 0 && (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRejected(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card/40 text-left hover:bg-card/60 transition-colors"
          >
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60">
              Excluded or adjacent results ({rejected.length})
            </p>
            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform ${showRejected ? 'rotate-90' : ''}`} />
          </button>
          {showRejected && (
            <div className="divide-y divide-border/40">
              {rejected.map((r, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground/60 mb-0.5">
                    {safeStr(r.company_name ?? r.company ?? r.name) || 'Excluded candidate'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-snug">
                    <span className="font-semibold">Key mismatch: </span>
                    {safeStr(r.key_mismatch ?? r.reason ?? r.exclusion_reason, 'Excluded by a required thesis criterion.')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Limitations */}
      {limitations.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Limitations</p>
          <ul className="space-y-1">
            {limitations.map((limitation, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{safeStr(limitation)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Always-present caveat footer */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-muted/20 border border-border/60 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
        <span>
          Results require manual review before outreach or IC use.
        </span>
      </div>

      {/* Reset */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          Start another Origination run
        </button>
        <Link
          href="/app/run"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Screen company URL
        </Link>
        <Link
          href="/app/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Deal Cockpit
        </Link>
      </div>
      {renderSelectionTray()}
    </div>
  );
}

function OriginationLimitedPreview({
  onReset,
  warnings,
  limitations,
  summary,
  discoveryCopy,
}: {
  onReset: () => void;
  warnings?: unknown[];
  limitations?: unknown[];
  summary?: string;
  discoveryCopy?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{discoveryCopy || discoveryStatusCopy('')}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Frontier OS will not invent acquisition targets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/app/run"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
              >
                Screen known company URL <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/request-pilot"
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
              >
                Request private beta access
              </Link>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
              >
                Edit thesis
              </button>
            </div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Workflow preview</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{polishOriginationPreviewSummary(summary)}</p>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Warnings</p>
          <ul className="space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{safeStr(warning)}</li>
            ))}
          </ul>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Limitations</p>
          <ul className="space-y-1">
            {limitations.map((limitation, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{safeStr(limitation)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OriginationUnavailable({
  onReset,
  message,
  discoveryCopy,
}: {
  onReset: () => void;
  message?: string;
  discoveryCopy?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{discoveryCopy || discoveryStatusCopy('')}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {message || 'Frontier will rank only supplied targets. It will not invent companies.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/run"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
            >
              Screen company URL <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/request-pilot"
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Request private beta access
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              Edit thesis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatStoredTime(value: string): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortText(value: string, fallback: string, limit = 88): string {
  const text = value.trim() || fallback;
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}

function displayDomain(value: string): string {
  if (!value.trim()) return 'Website not confirmed';
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0] || value;
  }
}

function savedLeadStatus(lead: StoredCompareCandidate): string {
  if (!lead.website || lead.run_ready === false) return 'Website required before screening';
  if (lead.compare_ready === false) return 'Ready to screen · website confirmation needed for comparison';
  return 'Ready to screen and compare';
}

function OriginationWorkspacePanel({
  runs,
  savedLeads,
  compareCandidates,
  currentRunId,
  onRestoreRun,
  onDeleteRun,
  onRunLead,
  onAddLeadToCompare,
  onRemoveLead,
  onRemoveCompare,
  onClearCompare,
}: {
  runs: StoredOriginationRun[];
  savedLeads: StoredCompareCandidate[];
  compareCandidates: StoredCompareCandidate[];
  currentRunId?: string;
  onRestoreRun: (run: StoredOriginationRun) => void;
  onDeleteRun: (id: string) => void;
  onRunLead: (lead: StoredCompareCandidate) => void;
  onAddLeadToCompare: (lead: StoredCompareCandidate) => void;
  onRemoveLead: (lead: StoredCompareCandidate) => void;
  onRemoveCompare: (lead: StoredCompareCandidate) => void;
  onClearCompare: () => void;
}) {
  const [historyFilter, setHistoryFilter] = useState<'active' | 'all' | 'completed' | 'partial' | 'failed'>('active');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const compareReady = compareCandidates.filter(candidate => candidate.compare_ready !== false && candidate.website);
  const comparePending = compareCandidates.filter(candidate => candidate.compare_ready === false || !candidate.website);
  const researchSources = savedLeads.filter(lead => ['source_page', 'directory_or_listicle', 'news_article', 'research_article', 'forum_thread', 'market_report', 'search_result'].includes(lead.candidate_type || ''));
  const runStatus = (run: StoredOriginationRun) => safeStr(run.status, 'completed').toLowerCase();
  const filteredRuns = runs.filter(run => {
    const status = runStatus(run);
    if (historyFilter === 'all') return true;
    if (historyFilter === 'active') return status === 'completed' || status === 'partial' || status === 'partial_success';
    if (historyFilter === 'partial') return status === 'partial' || status === 'partial_success';
    return status === historyFilter;
  });
  const visibleRuns = filteredRuns.slice(0, showAllHistory ? 20 : 5);

  return (
    <div data-origination-workspace className="surface-raised overflow-hidden rounded-xl">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-base font-semibold text-foreground">Workspace</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage discovery, screening and comparison across acquisition targets.</p>
        </div>
        <Link
          href="/app/compare"
          aria-disabled={compareReady.length < 2}
          className={`inline-flex h-8 w-fit items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors ${compareReady.length >= 2 ? 'border-border bg-background text-foreground hover:bg-accent/60' : 'border-border bg-background text-muted-foreground pointer-events-none opacity-60'}`}
        >
          Go to Compare
        </Link>
      </div>

      <div aria-label="Workspace summary" className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        {[
          ['Origination runs', runs.length],
          ['Saved leads', savedLeads.length],
          ['Compare selection', compareCandidates.length],
          ['Research sources', researchSources.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-background px-4 py-3 lg:px-6">
            <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div data-workspace-grid className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2 lg:p-6">
        <section data-workspace-section="history" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Origination history</p>
            <span className="text-xs text-muted-foreground">{runs.length}</span>
          </div>
          <div aria-label="Filter origination history" className="flex flex-wrap gap-1">
            {([
              ['active', 'Completed + Partial'],
              ['all', 'All'],
              ['completed', 'Completed'],
              ['partial', 'Partial'],
              ['failed', 'Failed'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={historyFilter === value}
                onClick={() => { setHistoryFilter(value); setShowAllHistory(false); }}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${historyFilter === value ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved origination runs yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleRuns.map(run => {
                const summary = asRecord(run.result.candidate_summary);
                return (
                  <div key={run.id} className={`rounded-lg px-3 py-2.5 ${run.id === currentRunId ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/25'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{formatStoredTime(run.completed_at)}</p>
                      {run.id === currentRunId && <SemanticBadge tone="info" className="text-[10px] px-2 py-1">Current</SemanticBadge>}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold leading-5 text-foreground" title={run.thesis}>
                      {shortText(run.thesis, `${run.geography || 'Any'} / ${run.sector || 'Any'}`)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {candidateCount(run.result)} candidates
                      {safeStr(summary.discovery_quality) ? ` · ${humanLabel(safeStr(summary.discovery_quality))} quality` : ''}
                      {` · ${humanLabel(runStatus(run))}`}
                      {run.sync_state === 'pending' ? ' · Pending sync' : ' · Saved'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button type="button" onClick={() => onRestoreRun(run)} className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        Open
                      </button>
                      <button type="button" onClick={() => onRestoreRun(run)} className="text-xs font-medium text-primary hover:underline">
                        Restore
                      </button>
                      <button type="button" aria-label={`Delete origination run ${run.thesis || run.id}`} onClick={() => onDeleteRun(run.id)} className="text-xs font-medium text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredRuns.length > 5 && (
                <button type="button" onClick={() => setShowAllHistory(value => !value)} className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {showAllHistory ? 'Show recent history' : 'View all history'}
                </button>
              )}
            </div>
          )}
        </section>

        <section data-workspace-section="saved-leads" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Saved leads</p>
            <span className="text-xs text-muted-foreground">{savedLeads.length}</span>
          </div>
          {savedLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Save candidates or sources from results to keep them here.</p>
          ) : (
            <div className="space-y-2">
              {savedLeads.slice(0, 5).map(lead => (
                <div key={candidateStorageKey(lead)} className="rounded-lg bg-muted/25 px-3.5 py-3">
                  <p className="truncate text-[15px] font-semibold leading-5 text-foreground" title={lead.company_name || lead.source_page_title || 'Saved lead'}>{lead.company_name || lead.source_page_title || 'Saved lead'}</p>
                  <p data-saved-lead-domain className="mt-0.5 max-w-full truncate text-xs text-muted-foreground" title={lead.website || lead.source_url || 'Website not confirmed'}>
                    {displayDomain(lead.website || lead.source_url || '')}
                  </p>
                  <p className="mt-2 text-[13px] font-medium leading-[1.4] text-foreground/80">{savedLeadStatus(lead)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lead.source_label || 'Origination'} · saved {formatStoredTime(lead.saved_at || '')}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
                    {lead.run_ready !== false && lead.website ? (
                      <button type="button" onClick={() => onRunLead(lead)} className="text-xs font-semibold text-primary hover:underline">Screen company</button>
                    ) : (
                      <span className="text-xs font-medium text-primary">Find website</span>
                    )}
                    {lead.compare_ready !== false && lead.website ? (
                      <button type="button" onClick={() => onAddLeadToCompare(lead)} className="text-xs font-medium text-primary hover:underline">Add to Compare</button>
                    ) : null}
                    <button type="button" onClick={() => onRemoveLead(lead)} className="text-xs font-medium text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section data-workspace-section="compare" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Compare selection</p>
            <span className="text-xs text-muted-foreground">{compareCandidates.length}</span>
          </div>
          <Link
            href="/app/compare"
            aria-disabled={compareReady.length < 2}
            className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold ${compareReady.length >= 2 ? 'border-border text-foreground hover:bg-accent' : 'pointer-events-none border-border text-muted-foreground opacity-60'}`}
          >
            Compare selected targets
          </Link>
          {compareReady.length < 2 && <p className="text-xs text-muted-foreground">Select at least two screened company targets to compare.</p>}
          <p className="text-xs text-muted-foreground">
            Compare selection: {compareReady.length}
            {comparePending.length > 0 ? ` · ${comparePending.length} pending` : ''}
          </p>
          {comparePending.length > 0 && (
            <p className="rounded-md border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-3 py-2 text-xs text-[var(--semantic-claim-text)]">
              Website/company target required before comparison.
            </p>
          )}
          {compareCandidates.length > 0 && (
            <div className="space-y-2">
              {compareCandidates.slice(0, 5).map(candidate => (
                <div key={candidateStorageKey(candidate)} className="flex items-center gap-3 rounded-lg bg-muted/25 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{candidate.company_name}</p>
                    <p className="truncate text-xs text-muted-foreground" title={candidate.website || candidate.source_url || 'Website missing'}>{displayDomain(candidate.website || candidate.source_url || '')}</p>
                  </div>
                  <button type="button" onClick={() => onRemoveCompare(candidate)} className="shrink-0 text-xs font-medium text-muted-foreground hover:text-destructive">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={onClearCompare} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
                Clear compare selection
              </button>
            </div>
          )}
        </section>

        <section data-workspace-section="research" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Research sources</p>
            <span className="text-xs text-muted-foreground">{researchSources.length}</span>
          </div>
          {researchSources.length === 0 ? (
            <div className="space-y-1 text-sm leading-[1.45] text-muted-foreground">
              <p>No saved research sources</p>
              <p className="text-xs">Source pages saved during discovery will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {researchSources.slice(0, 5).map(source => (
                <div key={candidateStorageKey(source)} className="rounded-lg bg-muted/25 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-foreground">{source.source_page_title || source.company_name}</p>
                  <p className="max-w-full truncate text-xs text-muted-foreground" title={source.source_url}>
                    {displayDomain(source.source_url || '')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {source.source_url && (
                      <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-primary hover:underline">
                        Review source
                      </a>
                    )}
                    <span className="text-[11px] text-muted-foreground">Extract companies later</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Origination form ─────────────────────────────────────────────────────────

type FormState =
  | { kind: 'idle' }
  | { kind: 'result'; data: OriginationResult; restored?: boolean; runId?: string }
  | { kind: 'error'; message: string; diagnostics?: OriginationRequestDiagnostics };

function ThesisInterpretation({ form, onEdit }: { form: OriginationFormValues; onEdit: () => void }) {
  const thesis = interpretedThesis(form);
  if (!form.buyerThesis.trim() && !form.sector.trim() && !form.geo.trim()) return null;
  return (
    <section aria-labelledby="interpreted-thesis-title" className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="interpreted-thesis-title" className="text-sm font-semibold text-foreground">Interpreted acquisition thesis</h3>
          <p className="mt-1 text-sm text-foreground">Target: {thesis.target}</p>
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit criteria</button>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div><p className="font-semibold text-foreground">Must match</p><ul className="mt-1 space-y-1 text-muted-foreground">{(thesis.mustMatch.length ? thesis.mustMatch : ['Written acquisition thesis']).map(item => <li key={item}>• {item}</li>)}</ul></div>
        <div><p className="font-semibold text-foreground">Preferred</p><ul className="mt-1 space-y-1 text-muted-foreground">{thesis.preferred.map(item => <li key={item}>• {item}</li>)}{thesis.preferred.length === 0 && <li>None specified</li>}</ul></div>
        <div><p className="font-semibold text-foreground">Excluded</p><ul className="mt-1 space-y-1 text-muted-foreground">{thesis.excluded.map(item => <li key={item}>• {item}</li>)}{thesis.excluded.length === 0 && <li>None specified</li>}</ul></div>
      </div>
      {thesis.conflicts.map(conflict => <p key={conflict} role="alert" className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground">Criteria conflict: {conflict}</p>)}
    </section>
  );
}

function OriginationProgressPanel({ loading, result }: { loading: boolean; result?: OriginationResult }) {
  const stages = result ? backendProgressStages(result) : [];
  if (!loading && stages.length === 0) return null;
  if (loading && stages.length === 0) {
    return (
      <section aria-label="Origination progress" aria-live="polite" className="rounded-lg border border-card-border bg-card px-4 py-3 shadow-xs">
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-primary" />
          <div><p className="text-xs font-semibold text-foreground">Origination request in progress</p><p className="mt-1 text-xs text-muted-foreground">Waiting for verified pipeline telemetry. Frontier OS will not simulate stage completion.</p></div>
        </div>
      </section>
    );
  }
  return (
    <details open={loading} className="rounded-lg border border-border bg-card/50">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{loading ? 'Origination progress' : 'Run details'}</summary>
      <ol className="space-y-2 border-t border-border p-4" aria-label="Backend-reported Origination stages">
        {stages.map(stage => <li key={stage.id} className="flex gap-3 text-xs"><span aria-hidden>{stage.status === 'complete' ? '✓' : stage.status === 'warning' ? '!' : stage.status === 'failed' ? '×' : stage.status === 'active' ? '●' : '○'}</span><div><p className="font-medium text-foreground">{stage.label}{stage.item_count !== undefined ? ` · ${stage.item_count}` : ''}</p>{stage.explanation && <p className="text-muted-foreground">{stage.explanation}</p>}<span className="sr-only">Status: {stage.status}</span></div></li>)}
      </ol>
    </details>
  );
}

function OriginationForm() {
  const usage = useUsage();
  const storedForm = readStoredOriginationForm();
  const [mode, setMode] = useState<OriginationMode>(storedForm.mode);
  const [buyerMandate, setBuyerMandate] = useState<BuyerMandate>(storedForm.buyerMandate);
  const [sector,    setSector   ] = useState(storedForm.sector);
  const [geo,       setGeo      ] = useState(storedForm.geo);
  const [optionalKeywords, setOptionalKeywords] = useState(storedForm.optionalKeywords);
  const [sizeCriteria, setSizeCriteria] = useState(storedForm.sizeCriteria);
  const [rationale, setRationale] = useState(storedForm.rationale);
  const [buyerThesis, setBuyerThesis] = useState(storedForm.buyerThesis);
  const [targetUniverse, setTargetUniverse] = useState(storedForm.targetUniverse);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveProgress, setLiveProgress] = useState<OriginationResult | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [pendingLocalSave, setPendingLocalSave] = useState<{ form: OriginationFormValues; result: OriginationResult; run: StoredOriginationRun } | null>(null);
  const [runs, setRuns] = useState<StoredOriginationRun[]>(() => readOriginationRuns());
  const [savedLeads, setSavedLeads] = useState<StoredCompareCandidate[]>(() => readSavedLeads());
  const [compareCandidates, setCompareCandidates] = useState<StoredCompareCandidate[]>(() => readCompareCandidates());
  const [state,     setState    ] = useState<FormState>(() => {
    const storedResult = readStoredOriginationResult();
    return storedResult ? { kind: 'result', data: storedResult, restored: true } : { kind: 'idle' };
  });
  const isFindCompaniesMode = mode === 'candidate_discovery';
  const statusCopy = isFindCompaniesMode
    ? 'Origination creates leads. Screen verifies evidence.'
    : 'Research thesis returns source pages and possible leads. Frontier OS will not invent acquisition targets.';
  const submitLabel = isFindCompaniesMode ? 'Find companies' : 'Research thesis';
  const loadingLabel = isFindCompaniesMode
    ? 'Finding source-backed company candidates...'
    : 'Researching source-backed thesis evidence...';

  function clearErrorState() {
    setState(current => current.kind === 'error' ? { kind: 'idle' } : current);
  }

  function refreshWorkspace() {
    setRuns(readOriginationRuns());
    setSavedLeads(readSavedLeads());
    setCompareCandidates(readCompareCandidates());
  }

  async function retryPendingSave() {
    if (!pendingLocalSave) return;
    const workspaceId = pendingLocalSave.run.workspace_id;
    const userId = getUserId() || '';
    try {
      if (!workspaceId || !userId) throw new Error('Stable Workspace identity is unavailable.');
      await persistOriginationRun(workspaceId, userId, pendingLocalSave.run.run_id, pendingLocalSave.result, true);
      const syncedResult = { ...pendingLocalSave.result, saved_to_cockpit: true, origination_id: pendingLocalSave.run.run_id };
      storeOriginationRun(pendingLocalSave.form, syncedResult);
      saveOriginationRunToHistory(pendingLocalSave.form, syncedResult, { workspaceId, runId: pendingLocalSave.run.run_id, synced: true });
      refreshWorkspace();
      setSaveNotice({ tone: 'success', message: 'Run saved to Workspace.' });
      setPendingLocalSave(null);
    } catch (error) {
      const code = error instanceof OriginationApiError ? error.diagnostics.error_code : 'WORKSPACE_RETRY_FAILED';
      if (import.meta.env.DEV) console.error('[origination] retry save failed', { error_code: code, workspace_id: workspaceId, run_id: pendingLocalSave.run.run_id });
      setSaveNotice({ tone: 'warning', message: 'Workspace save retry failed. The local copy remains available.' });
    }
  }

  useEffect(() => {
    refreshWorkspace();
    const workspaceId = getWorkspaceId();
    if (workspaceId) {
      void retrieveOriginationRuns(workspaceId).then(records => {
        records.forEach(record => {
          const result = asRecord(record.result_payload);
          const runId = safeStr(record.run_id ?? record.origination_id);
          if (!runId || !Object.keys(result).length) return;
          const form = readStoredOriginationForm();
          saveOriginationRunToHistory(form, { ...result, saved_to_cockpit: true, origination_id: runId }, { workspaceId, runId, synced: true });
        });
        refreshWorkspace();
      }).catch(error => {
        if (import.meta.env.DEV) console.error('[origination] workspace history retrieval failed', error);
      });
    }
    const refresh = () => refreshWorkspace();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  function navigateRunLead(lead: StoredCompareCandidate) {
    if (!lead.website || lead.run_ready === false) return;
    const params = new URLSearchParams({
      company_name: lead.company_name,
      company: lead.company_name,
      website: lead.website,
      jurisdiction: lead.jurisdiction,
      source: 'origination',
    });
    window.location.href = `/app/run?${params.toString()}`;
  }

  function addLeadToCompare(lead: StoredCompareCandidate) {
    if (!lead.website || lead.compare_ready === false) return;
    addCompareCandidate(lead);
    refreshWorkspace();
  }

  function restoreRun(run: StoredOriginationRun) {
    const form: OriginationFormValues = {
      mode: run.form?.mode === 'thesis_research' ? 'thesis_research' : 'candidate_discovery',
      buyerMandate: run.form?.buyerMandate || 'pe_platform',
      sector: run.form?.sector ?? run.sector ?? '',
      geo: run.form?.geo ?? run.geography ?? '',
      optionalKeywords: run.form?.optionalKeywords ?? '',
      sizeCriteria: run.form?.sizeCriteria ?? run.size_criteria ?? '',
      rationale: run.form?.rationale ?? run.strategic_rationale ?? '',
      buyerThesis: run.form?.buyerThesis ?? run.thesis ?? '',
      targetUniverse: run.form?.targetUniverse ?? '',
    };
    setMode(form.mode);
    setBuyerMandate(form.buyerMandate);
    setSector(form.sector);
    setGeo(form.geo);
    setOptionalKeywords(form.optionalKeywords);
    setSizeCriteria(form.sizeCriteria);
    setRationale(form.rationale);
    setBuyerThesis(form.buyerThesis);
    setTargetUniverse(form.targetUniverse);
    storeOriginationRun(form, run.result);
    setState({ kind: 'result', data: run.result, restored: true, runId: run.id });
  }

  function deleteRun(id: string) {
    const updated = deleteOriginationRun(id);
    setRuns(updated);
    if (state.kind === 'result' && state.runId === id) {
      clearStoredOriginationRun();
      setState({ kind: 'idle' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    usage.beginUsageRequest('origination');
    setIsSubmitting(true);
    setLiveProgress(null);
    setSaveNotice(null);
    setState({ kind: 'idle' });
    try {
      const targets = parseKnownTargetUniverse(targetUniverse);
      if (isFindCompaniesMode && !buyerThesis.trim()) {
        setState({ kind: 'error', message: 'Describe the companies you want to find.' });
        return;
      }
      const formValues: OriginationFormValues = {
        mode,
        buyerMandate,
        sector,
        geo,
        optionalKeywords,
        sizeCriteria,
        rationale,
        buyerThesis,
        targetUniverse,
      };
      const existingWorkspaceId = getWorkspaceId();
      const existingUserId = getUserId();
      const account = existingWorkspaceId && existingUserId
        ? { workspace_id: existingWorkspaceId, user_id: existingUserId }
        : await createBackendAccount(undefined, buyerThesis);
      if (!account?.workspace_id?.trim() || !account?.user_id?.trim()) {
        throw new OriginationApiError('A stable Workspace identity could not be established.', null, {
          endpoint: '/api/trial/create-account', error_code: 'WORKSPACE_ID_UNAVAILABLE',
          message: 'workspace_id and user_id are required before Origination can run.',
        });
      }
      const workspaceId = account.workspace_id.trim();
      const userId = account.user_id.trim();
      const stableRunId = `org_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
      const data = await runOrigination({
        run_id: stableRunId,
        origination_mode: targets.length > 0 ? 'target_universe_ranking' : mode,
        buyer_type: buyerMandate,
        buyer_thesis: buyerThesis,
        sector,
        sector_or_vertical: sector,
        geography: geo,
        optional_keywords: optionalKeywords,
        size_criteria: sizeCriteria,
        strategic_rationale: rationale,
        workspace_id: workspaceId,
        user_id: userId,
        save_to_cockpit: true,
        ...(targets.length > 0 ? { targets } : {}),
      }, job => setLiveProgress({ progress_stages: job.events }));
      await usage.reconcileUsageResponse(data);
      if (isQuotaExceededResponse(data)) {
        setState({ kind: 'idle' });
        return;
      }
      if (safeStr(data.status).toLowerCase() === 'ok') {
        setState({ kind: 'idle' });
      }
      let backendConfirmed = false;
      let backendSaveError: unknown = null;
      try {
        await persistOriginationRun(workspaceId, userId, stableRunId, data);
        backendConfirmed = true;
        data.saved_to_cockpit = true;
        data.origination_id = stableRunId;
      } catch (error) {
        backendSaveError = error;
      }
      const resultPersisted = storeOriginationRun(formValues, data);
      const { run: storedRun, persisted: historyPersisted } = saveOriginationRunToHistory(formValues, data, {
        workspaceId: workspaceId || '', runId: stableRunId, synced: backendConfirmed,
      });
      refreshWorkspace();
      if (backendConfirmed && resultPersisted && historyPersisted) {
        setSaveNotice({ tone: 'success', message: 'Run saved to Workspace.' });
        setPendingLocalSave(null);
      } else {
        setSaveNotice({ tone: 'warning', message: 'Results generated, but this run could not be fully saved to Workspace.' });
        setPendingLocalSave({ form: formValues, result: data, run: storedRun });
        if (import.meta.env.DEV) {
          console.warn('[origination] save incomplete', {
            endpoint: getBackendBaseUrl() ? `${getBackendBaseUrl()}/api/workspace/origination-runs` : '/api/workspace/origination-runs',
            method: 'POST',
            workspace_id: workspaceId,
            run_id: safeStr(data.origination_id, storedRun.run_id),
            http_status: 200,
            parsed_response: { saved_to_cockpit: data.saved_to_cockpit, origination_id: data.origination_id },
            local_result_persisted: resultPersisted,
            local_history_persisted: historyPersisted,
            error_code: backendSaveError instanceof OriginationApiError
              ? backendSaveError.diagnostics.error_code
              : backendConfirmed ? 'local_persistence_failed' : 'backend_save_not_confirmed',
          });
        }
      }
      setState({ kind: 'result', data, restored: false, runId: storedRun.id });
    } catch (err) {
      const backendBody = err && typeof err === 'object' && 'backendBody' in err
        ? (err as { backendBody?: OriginationResult | null }).backendBody
        : null;
      await usage.reconcileUsageResponse(backendBody);
      console.error('[origination] run failed', err);
      const diagnostics = err instanceof OriginationApiError || err instanceof OriginationTimeoutError
        ? err.diagnostics
        : undefined;
      const message = import.meta.env.DEV && diagnostics?.message
        ? diagnostics.message
        : err instanceof Error ? err.message : 'Unexpected error';
      setState({
        kind: 'error',
        message,
        ...(diagnostics ? { diagnostics } : {}),
      });
    } finally {
      setIsSubmitting(false);
      setLiveProgress(null);
    }
  }

  function handleReset() {
    setState({ kind: 'idle' });
  }

  function handleClearRestored() {
    clearStoredOriginationRun();
    setSector('');
    setGeo('');
    setOptionalKeywords('');
    setSizeCriteria('');
    setRationale('');
    setBuyerThesis('');
    setTargetUniverse('');
    setMode('candidate_discovery');
    setBuyerMandate('pe_platform');
    setState({ kind: 'idle' });
  }

  const workspacePanel = (
    <OriginationWorkspacePanel
      runs={runs}
      savedLeads={savedLeads}
      compareCandidates={compareCandidates}
      currentRunId={state.kind === 'result' ? state.runId : undefined}
      onRestoreRun={restoreRun}
      onDeleteRun={deleteRun}
      onRunLead={navigateRunLead}
      onAddLeadToCompare={addLeadToCompare}
      onRemoveLead={lead => {
        setSavedLeads(removeSavedLead(lead));
      }}
      onRemoveCompare={lead => {
        removeCompareCandidate(lead);
        refreshWorkspace();
      }}
      onClearCompare={() => {
        compareCandidates.forEach(candidate => removeCompareCandidate(candidate));
        refreshWorkspace();
      }}
    />
  );

  return (
    <div className="space-y-4">
      {saveNotice && (
        <div role="status" aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${saveNotice.tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground' : 'border-amber-500/40 bg-amber-500/10 text-foreground'}`}>
          {saveNotice.message}
          {saveNotice.tone === 'warning' && pendingLocalSave && (
            <button type="button" onClick={retryPendingSave} className="ml-3 font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Retry save
            </button>
          )}
        </div>
      )}
      {state.kind !== 'error' && <OriginationQuotaNotice />}
      <form onSubmit={handleSubmit} className="space-y-5 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Find acquisition targets</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Start with a plain-language acquisition thesis. Frontier OS structures the criteria and returns company candidates with attributable websites.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="company-search-thesis">
            Describe the companies you want to find
          </label>
          <textarea
            id="company-search-thesis"
            value={buyerThesis}
            onChange={event => {
              setBuyerThesis(event.target.value);
              clearErrorState();
            }}
            rows={3}
            required={isFindCompaniesMode}
            placeholder="e.g. Founder-led UK utility software with £3m to £15m revenue"
            className="w-full px-3 py-2.5 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-y"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Try: DACH public safety software, European field service SaaS, or mission-critical software for regulated industries.
          </p>
        </div>
        <details className="rounded-lg border border-border bg-background/60 overflow-hidden">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-foreground hover:bg-accent/40">
            Refine criteria
          </summary>
          <div className="space-y-4 border-t border-border p-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="buyer-mandate">
            Acquisition mandate
          </label>
          <select
            id="buyer-mandate"
            value={buyerMandate}
            onChange={event => {
              setBuyerMandate(event.target.value as BuyerMandate);
              clearErrorState();
            }}
            className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
          >
            <option value="pe_platform">PE platform / buy-and-build</option>
            <option value="operating_partner">Portfolio add-on</option>
            <option value="corporate_development">Corporate development</option>
            <option value="strategic_acquirer">Strategic acquirer</option>
            <option value="independent_sponsor">Independent sponsor</option>
            <option value="search_fund">Search fund</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Controls fit weighting, evidence requirements and screening priorities.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="origination-sector" className="block text-xs font-medium text-foreground mb-1.5">
              Sector / vertical
            </label>
            <input
              id="origination-sector"
              type="text"
              value={sector}
              onChange={e => {
                setSector(e.target.value);
                clearErrorState();
              }}
              placeholder="e.g. Software utility"
              className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
            />
          </div>
          <div>
            <label htmlFor="origination-geography" className="block text-xs font-medium text-foreground mb-1.5">
              Geography
            </label>
            <input
              id="origination-geography"
              type="text"
              value={geo}
              onChange={e => {
                setGeo(e.target.value);
                clearErrorState();
              }}
              placeholder="e.g. UK"
              className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.6fr)] gap-4">
          <div>
            <label htmlFor="origination-keywords" className="block text-xs font-medium text-foreground mb-1.5">Keywords <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input id="origination-keywords" type="text" value={optionalKeywords} onChange={e => { setOptionalKeywords(e.target.value); clearErrorState(); }} placeholder="e.g. metering, operations, workflow" className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors" />
          </div>
          <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Size criteria <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={sizeCriteria}
                onChange={e => {
                  setSizeCriteria(e.target.value);
                  clearErrorState();
                }}
                placeholder="e.g. early stage high growth"
                className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
              />
          </div>
        </div>
          </div>
        </details>

        <details className="rounded-lg border border-border bg-background/60 overflow-hidden">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            Rank known targets
          </summary>
          <div className="border-t border-border p-3">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Paste known target companies
            </label>
            <textarea
              value={targetUniverse}
              onChange={e => {
                setTargetUniverse(e.target.value);
                clearErrorState();
              }}
              rows={7}
              placeholder={`Company name, website, jurisdiction, brief description

Example format:
[Company name], [website URL], [jurisdiction], [brief description]`}
              className="w-full px-3 py-2 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none"
            />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-1.5">
              Company name, website, jurisdiction, brief description.
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-1">
              Only paste targets you are permitted to screen. Frontier OS will not invent or enrich targets without evidence.
            </p>
          </div>
        </details>

        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          {statusCopy}
        </p>

        <ThesisInterpretation
          form={{ mode, buyerMandate, sector, geo, optionalKeywords, sizeCriteria, rationale, buyerThesis, targetUniverse }}
          onEdit={() => document.getElementById('company-search-thesis')?.focus()}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {loadingLabel}</>
          ) : (
            <>{submitLabel} <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </button>

        <OriginationProgressPanel loading={isSubmitting && state.kind !== 'result'} result={liveProgress ?? (state.kind === 'result' ? state.data : undefined)} />
      </form>

      {state.kind === 'result' && state.restored && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span>Previous origination result available</span>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#origination-result" className="font-medium text-primary hover:text-primary/80">
              View result
            </a>
            <button
              type="button"
              onClick={handleClearRestored}
              className="font-medium text-primary hover:text-primary/80"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{state.message}</span>
          </div>
          {import.meta.env.DEV && state.diagnostics && (
            <details className="rounded-lg border border-border bg-card/40 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer list-none text-[10px] font-semibold tracking-normal text-muted-foreground">
                Developer diagnostics
              </summary>
              <div className="space-y-3 border-t border-border px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {[
                    ['endpoint', state.diagnostics.endpoint],
                    ['status', state.diagnostics.status],
                    ['quota_type', state.diagnostics.quota_type],
                    ['error_code', state.diagnostics.error_code],
                    ['message', state.diagnostics.message],
                    ['timeout_ms', state.diagnostics.timeout_ms],
                    ['elapsed_ms', state.diagnostics.elapsed_ms],
                  ].filter(([, value]) => value !== undefined).map(([label, value]) => (
                    <div key={String(label)} className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
                      <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-0.5">{String(label)}</p>
                      <p className="text-xs text-foreground break-words">{safeStr(value) || 'Not stated'}</p>
                    </div>
                  ))}
                </div>
                {state.diagnostics.raw_json && (
                  <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-1">raw JSON</p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">{state.diagnostics.raw_json}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Try again
            </button>
            <Link
              href="/app/run"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
            >
              Screen company URL <ArrowRight className="w-3 h-3" />
            </Link>
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            >
              Book intro
            </a>
          </div>
        </div>
      )}

      {state.kind === 'result' && (
        <div id="origination-result">
          <OriginationResultView
            data={state.data}
            onReset={handleReset}
            onPasteKnownTargets={() => {
              setMode('candidate_discovery');
              handleReset();
            }}
            onWorkspaceChange={refreshWorkspace}
          />
        </div>
      )}

      {workspacePanel}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AVAILABLE_NOW = [
  {
    href:  '/app/run',
    title: 'Screen company',
    desc:  'Screen a specific company from its website URL. 8-stage public-source check.',
  },
  {
    href:  '/compare',
    title: 'Compare targets',
    desc:  'Compare 2–5 known targets by recommendation, AI risk and evidence quality.',
  },
  {
    href:  '/origination',
    title: 'Find companies',
    desc:  'Build source-backed company leads from a narrow vertical and geography.',
  },
  {
    href:  '/cockpit',
    title: 'Deal Cockpit',
    desc:  'Track screened targets, record IC decisions and monitor next actions.',
  },
  {
    href:  '/evidence',
    title: 'Document-assisted review',
    desc:  'Upload one non-confidential PDF to extract claims, metrics and diligence questions.',
  },
];

export default function OriginationPage() {
  return (
    <div className="flex-1 flex flex-col w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/20">
        <div className="app-container py-7">
          <p className="mb-2 text-xs font-medium text-primary">Discover</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Discover opportunities
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Build and qualify a target universe against an investment thesis.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[95rem] flex-1 space-y-8 px-4 py-7 md:px-6 lg:px-10">
        <div className="space-y-8">
          {/* Live origination thesis form */}
          <div className="min-w-0">
            <div className="mb-4">
              <p className="text-xs font-semibold text-primary mb-1">Investment thesis</p>
              <p className="text-sm text-muted-foreground">
                Define mandatory, preferred and excluded characteristics before starting discovery.
              </p>
            </div>
            <OriginationForm />
          </div>

          {/* Available now in private beta */}
          <aside className="rounded-lg border border-border/70 bg-card/60 p-4 md:p-5">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Available now</p>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-5">
              {AVAILABLE_NOW.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-w-0 items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

      </div>

      <BetaCTA
        title="Ready to screen specific targets now?"
        body="Screen a URL-only target on any company website and get a recommendation in under 2 minutes."
        primaryLabel="Screen company"
        primaryHref="/app/run"
        secondaryLabel="Compare targets"
        secondaryHref="/compare"
        eventName="origination_bottom"
      />
    </div>
  );
}

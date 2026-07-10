import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, Search, Target, ChevronRight,
  Loader2, AlertCircle, Info,
} from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';
import { getBackendBaseUrl } from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { saveOriginationTarget } from '@/lib/runHistory';
import { SemanticBadge } from '@/components/SemanticBadge';
import { ScreeningWorkflowGuide } from '@/components/ScreeningWorkflowGuide';
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

// ─── Origination API call ─────────────────────────────────────────────────────

interface OriginationRequest {
  buyer_thesis: string;
  sector: string;
  geography: string;
  size_criteria: string;
  strategic_rationale: string;
  targets?: KnownTarget[];
}

type OriginationResult = Record<string, unknown>;

const ORIGINATION_REQUEST_TIMEOUT_MS = 45_000;

interface OriginationRequestDiagnostics {
  endpoint: string;
  timeout_ms: number;
  elapsed_ms: number;
}

const LAST_ORIGINATION_FORM_KEY = 'frontier_last_origination_form';
const ORIGINATION_RUNS_KEY = 'frontier_origination_runs';

type OriginationMode = 'rank_known_targets' | 'research_thesis';

interface OriginationFormValues {
  mode: OriginationMode;
  sector: string;
  geo: string;
  sizeCriteria: string;
  rationale: string;
  buyerThesis: string;
  targetUniverse: string;
}

interface StoredOriginationRun {
  id: string;
  created_at: string;
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

async function runOrigination(req: OriginationRequest): Promise<OriginationResult> {
  const base = getBackendBaseUrl();
  const thesisUrl = base ? `${base}/api/origination/thesis` : '/api/origination/thesis';
  const runUrl = base ? `${base}/api/origination/run` : '/api/origination/run';
  const controller = new AbortController();
  const startedAt = Date.now();
  let endpoint = req.targets && req.targets.length > 0 ? runUrl : thesisUrl;
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
    let res = await fetch(endpoint, requestInit);
    if (res.status === 404) {
      endpoint = runUrl;
      res = await fetch(runUrl, requestInit);
    }
    const body = await res.json().catch(() => null) as OriginationResult | null;
    if (!res.ok) {
      const message = typeof body?.message === 'string'
        ? body.message
        : `Backend returned status ${res.status}.`;
      throw new Error(message);
    }
    return body ?? {};
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
  return import.meta.env.DEV
    || (typeof window !== 'undefined' && window.localStorage.getItem('frontier_debug_diagnostics') === '1');
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
  return `No source-backed targets are available for this ${formatBuyerType(buyerType)} thesis in ${geography} ${sector} in the hosted preview.`;
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
    return 'Frontier OS will rank the supplied/source-backed targets and will not invent acquisition targets.';
  }

  if (!response) {
    return 'If live discovery is available, Frontier OS will return source-backed leads. If not, it will interpret the thesis and suggest search angles without inventing targets.';
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
      return 'Frontier OS will rank the supplied/source-backed targets and will not invent acquisition targets.';
    }
    if (hasRegistryCandidates(response)) {
      return 'Registry discovery returned Companies House leads. Product websites still need verification before screening.';
    }
    if (responseSourceMode.includes('web_search')) {
      return 'Web discovery returned source-backed candidates. Screen company URLs before outreach.';
    }
    if (response.source_backed_target_universe_available === false) {
      return 'No source-backed target universe was available. Frontier OS did not invent targets.';
    }
  }

  return 'If live discovery is available, Frontier OS will return source-backed leads. If not, it will interpret the thesis and suggest search angles without inventing targets.';
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
    return safeStr((productSignal as Record<string, unknown>).workflow_depth, 'unknown');
  }
  return safeStr(candidate.product_signal_level ?? candidate.product_signal, 'unknown');
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
    mode: 'rank_known_targets',
    sector: '',
    geo: '',
    sizeCriteria: '',
    rationale: '',
    buyerThesis: '',
    targetUniverse: '',
  };
  if (!storageAvailable()) return empty;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_ORIGINATION_FORM_KEY) || '{}') as Partial<OriginationFormValues>;
    return {
      mode: parsed.mode === 'research_thesis' ? 'research_thesis' : 'rank_known_targets',
      sector: safeStr(parsed.sector),
      geo: safeStr(parsed.geo),
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

function storeOriginationRun(form: OriginationFormValues, result: OriginationResult): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(LAST_ORIGINATION_FORM_KEY, JSON.stringify(form));
  window.localStorage.setItem(LAST_ORIGINATION_RESULT_KEY, JSON.stringify(result));
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
    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => item as StoredOriginationRun)
      .filter(item => item.id && item.result && typeof item.result === 'object')
      .sort((a, b) => safeStr(b.created_at).localeCompare(safeStr(a.created_at)));
  } catch {
    return [];
  }
}

function writeOriginationRuns(runs: StoredOriginationRun[]): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(ORIGINATION_RUNS_KEY, JSON.stringify(runs.slice(0, 20)));
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

function saveOriginationRunToHistory(form: OriginationFormValues, result: OriginationResult): StoredOriginationRun {
  const createdAt = new Date().toISOString();
  const run: StoredOriginationRun = {
    id: `orig_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: createdAt,
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
  writeOriginationRuns([run, ...existing]);
  return run;
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
  const candidates = rawCandidates.filter(candidate => !isSyntheticReferenceCandidate(candidate));
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
  const hasConfirmedCandidates = groupedCandidates.confirmed.length > 0;
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
              title={compareReady === 0 ? 'Screen companys first to unlock a stronger comparison.' : undefined}
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
          <p className="text-[11px] text-muted-foreground mt-2">Screen companys first to unlock a stronger comparison.</p>
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
    const website = safeStr(c.website ?? '');
    const type = candidateType(c);
    const productSignal = productSignalLevel(c);
    const sourceLabel = safeStr(c.source_label) || 'Public-source candidate signal';
    const evidenceStatus = safeStr(c.evidence_status ?? c.verification_status ?? 'not_independently_verified');
    const verdict = safeStr(c.verdict ?? c.recommendation ?? '');
    const fit = safeStr(c.fit_score_100 ?? c.fit_score ?? c.score ?? '');
    const fits = safeStr(c.why_it_fits ?? c.why_fits ?? c.rationale ?? c.match_rationale ?? '');
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
          {type === 'extracted_company_candidate' && (
            <SemanticBadge tone="info">Company mention found</SemanticBadge>
          )}
          {verdict && <SemanticBadge tone="info">{verdict}</SemanticBadge>}
          <SemanticBadge tone={productSignal === 'strong' ? 'verified' : productSignal === 'plausible' ? 'info' : productSignal === 'weak' ? 'partial' : 'unknown'}>
            Product signal: {humanLabel(productSignal)}
          </SemanticBadge>
        </div>
        {(description || website) && (
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
            {[description, website].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {fit && (
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Fit score 100</p>
              <p className="font-semibold text-foreground">{fit}</p>
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
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => handleRunCandidate(c)}
            disabled={stored.run_ready === false || !website}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stored.run_ready === false || !website ? 'Add website' : 'Screen company →'}
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
    const type = candidateType(c);
    const stored = storedCandidateFromOrigination(c);
    const sourceUrl = sourceUrls(c)[0] || '';
    const whyFound = safeStr(c.why_this_candidate_matters ?? c.why_it_fits ?? c.source_snippet ?? c.description, 'Source-backed company mention; website not confirmed.');
    const nextAction = safeStr(c.next_best_action ?? c.next_action, 'Find official company website');
    return (
      <div key={`${name}-${i}`} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1.6fr_1.2fr_.8fr] gap-2 px-4 py-3 text-xs items-start">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          {type === 'extracted_company_candidate' && (
            <SemanticBadge tone="info" className="mt-1 text-[10px] px-2 py-1">Company mention found</SemanticBadge>
          )}
          <p className="mt-1 text-[11px] text-[var(--semantic-claim-text)]">Official website required before screening</p>
        </div>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
            {displayValue(c.source_label, 'Source')}
          </a>
        ) : (
          <p className="text-muted-foreground">{displayValue(c.source_label, 'Source-backed mention')}</p>
        )}
        <p className="text-muted-foreground leading-relaxed">{whyFound}</p>
        <p className="text-muted-foreground leading-relaxed">{nextAction}</p>
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
              <SemanticBadge tone="unknown">Not a company target</SemanticBadge>
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
            <span className="inline-flex items-center text-[11px] text-muted-foreground px-1">Not a company target</span>
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
          <div className="hidden md:grid grid-cols-[1.2fr_1fr_1.6fr_1.2fr_.8fr] gap-2 px-4 py-2 text-[10px] font-semibold text-muted-foreground border-b border-border bg-muted/20">
            <span>Company</span>
            <span>Source</span>
            <span>Why found</span>
            <span>Next action</span>
            <span>Save lead</span>
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
              {hasConfirmedCandidates ? 'Candidate summary' : 'Research summary'}
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
              ['Leads needing website', needsWebsiteCandidates.length],
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

      {!hasConfirmedCandidates && (
        <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Company candidates</p>
          <p className="text-sm font-semibold text-foreground">No confirmed company candidates found yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Frontier OS found research sources, but no official company websites were confirmed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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

      {openPossibleLeadsByDefault && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Possible leads found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Review these leads, confirm official websites, then screen companies individually.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
            >
              Screen company URL
            </Link>
          </div>
        </div>
      )}

      {renderCandidateGroup('Company candidates', groupedCandidates.confirmed, 'full')}
      {renderCandidateGroup(
        'Possible leads needing website confirmation',
        needsWebsiteCandidates,
        'compact',
        {
          collapsed: needsWebsiteCandidates.length > 3 || openPossibleLeadsByDefault,
          defaultOpen: openPossibleLeadsByDefault,
          id: 'origination-possible-leads',
          description: 'Company mentions that need an official website before Screen or Compare.',
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
      {renderCandidateGroup(
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
              Excluded targets ({rejected.length}) — why they were excluded
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
                    {safeStr(r.reason ?? r.exclusion_reason ?? '')}
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
          Private beta preview · Public-source signals only · Results require manual review before outreach or IC use.
        </span>
      </div>

      {/* Reset */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          Screen another origination screen
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
            {message || 'Frontier OS will rank only supplied/source-backed targets and will not invent acquisition targets.'}
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
  const compareReady = compareCandidates.filter(candidate => candidate.compare_ready !== false && candidate.website);
  const comparePending = compareCandidates.filter(candidate => candidate.compare_ready === false || !candidate.website);
  const researchSources = savedLeads.filter(lead => ['source_page', 'directory_or_listicle', 'news_article', 'research_article', 'forum_thread', 'market_report', 'search_result'].includes(lead.candidate_type || ''));

  return (
    <div className="surface-raised overflow-hidden rounded-xl">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Workspace</p>
          <p className="text-xs text-muted-foreground">Previous runs, saved leads and compare selections.</p>
        </div>
        <Link
          href="/app/compare"
          className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${compareReady.length > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border bg-background text-muted-foreground pointer-events-none opacity-60'}`}
        >
          Go to Compare
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Origination history</p>
            <span className="text-[10px] text-muted-foreground">{runs.length}</span>
          </div>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved origination runs yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {runs.slice(0, 8).map(run => {
                const summary = asRecord(run.result.candidate_summary);
                return (
                  <div key={run.id} className={`rounded-md border px-3 py-2 ${run.id === currentRunId ? 'border-primary/30 bg-primary/5' : 'border-border bg-background/60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{formatStoredTime(run.created_at)}</p>
                      {run.id === currentRunId && <SemanticBadge tone="info" className="text-[10px] px-2 py-1">Current</SemanticBadge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {shortText(run.thesis, `${run.geography || 'Any'} / ${run.sector || 'Any'}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {candidateCount(run.result)} candidates
                      {safeStr(summary.discovery_quality) ? ` · ${humanLabel(safeStr(summary.discovery_quality))} quality` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button type="button" onClick={() => onRestoreRun(run)} className="text-[11px] font-medium text-primary hover:underline">
                        Restore
                      </button>
                      <button type="button" onClick={() => onDeleteRun(run.id)} className="text-[11px] font-medium text-muted-foreground hover:text-destructive">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Saved leads</p>
            <span className="text-[10px] text-muted-foreground">{savedLeads.length}</span>
          </div>
          {savedLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Save candidates or sources from results to keep them here.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {savedLeads.slice(0, 10).map(lead => (
                <div key={candidateStorageKey(lead)} className="rounded-md border border-border bg-background/60 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{lead.company_name || lead.source_page_title || 'Saved lead'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 break-all">{lead.website || lead.source_url || 'Website not confirmed'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <SemanticBadge tone={['company', 'company_candidate'].includes(lead.candidate_type || '') ? 'info' : 'unknown'} className="text-[10px] px-2 py-1">
                      {humanLabel(lead.candidate_type || 'company_candidate')}
                    </SemanticBadge>
                    <SemanticBadge tone={lead.compare_ready === false ? 'unknown' : 'verified'} className="text-[10px] px-2 py-1">
                      {lead.compare_ready === false ? 'Not compare-ready' : 'Compare-ready'}
                    </SemanticBadge>
                    <SemanticBadge tone={lead.run_ready === false ? 'unknown' : 'verified'} className="text-[10px] px-2 py-1">
                      {lead.run_ready === false ? 'Screen not ready' : 'Screen-ready'}
                    </SemanticBadge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {lead.source_label || 'Origination'} · saved {formatStoredTime(lead.saved_at || '')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lead.run_ready !== false && lead.website ? (
                      <button type="button" onClick={() => onRunLead(lead)} className="text-[11px] font-medium text-primary hover:underline">Screen company</button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Find website</span>
                    )}
                    {lead.compare_ready !== false && lead.website ? (
                      <button type="button" onClick={() => onAddLeadToCompare(lead)} className="text-[11px] font-medium text-primary hover:underline">Add to Compare</button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Website/company target required before comparison.</span>
                    )}
                    <button type="button" onClick={() => onRemoveLead(lead)} className="text-[11px] font-medium text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Compare selection</p>
            <span className="text-[10px] text-muted-foreground">{compareCandidates.length}</span>
          </div>
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
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {compareCandidates.slice(0, 8).map(candidate => (
                <div key={candidateStorageKey(candidate)} className="rounded-md border border-border bg-background/60 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{candidate.company_name}</p>
                  <p className="text-[11px] text-muted-foreground break-all">{candidate.website || candidate.source_url || 'Website missing'}</p>
                  <button type="button" onClick={() => onRemoveCompare(candidate)} className="mt-1 text-[11px] font-medium text-muted-foreground hover:text-destructive">
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

        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Research sources</p>
            <span className="text-[10px] text-muted-foreground">{researchSources.length}</span>
          </div>
          {researchSources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Source pages/listicles saved from discovery will appear here.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {researchSources.slice(0, 8).map(source => (
                <div key={candidateStorageKey(source)} className="rounded-md border border-border bg-background/60 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{source.source_page_title || source.company_name}</p>
                  <p className="text-[11px] text-muted-foreground break-all">{source.source_url}</p>
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

function OriginationForm() {
  const storedForm = readStoredOriginationForm();
  const [mode, setMode] = useState<OriginationMode>(storedForm.mode);
  const [sector,    setSector   ] = useState(storedForm.sector);
  const [geo,       setGeo      ] = useState(storedForm.geo);
  const [sizeCriteria, setSizeCriteria] = useState(storedForm.sizeCriteria);
  const [rationale, setRationale] = useState(storedForm.rationale);
  const [buyerThesis, setBuyerThesis] = useState(storedForm.buyerThesis);
  const [targetUniverse, setTargetUniverse] = useState(storedForm.targetUniverse);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runs, setRuns] = useState<StoredOriginationRun[]>(() => readOriginationRuns());
  const [savedLeads, setSavedLeads] = useState<StoredCompareCandidate[]>(() => readSavedLeads());
  const [compareCandidates, setCompareCandidates] = useState<StoredCompareCandidate[]>(() => readCompareCandidates());
  const [state,     setState    ] = useState<FormState>(() => {
    const storedResult = readStoredOriginationResult();
    return storedResult ? { kind: 'result', data: storedResult, restored: true } : { kind: 'idle' };
  });
  const isRankKnownTargetsMode = mode === 'rank_known_targets';
  const statusCopy = isRankKnownTargetsMode
    ? 'Paste company names and websites. Frontier OS will rank and enrich only supplied/source-backed targets.'
    : 'Frontier OS will return research sources and possible leads. It will not invent acquisition targets.';
  const submitLabel = isRankKnownTargetsMode ? 'Rank supplied targets' : 'Research thesis';
  const loadingLabel = isRankKnownTargetsMode
    ? 'Ranking supplied/source-backed targets...'
    : 'Researching source-backed thesis evidence...';

  function refreshWorkspace() {
    setRuns(readOriginationRuns());
    setSavedLeads(readSavedLeads());
    setCompareCandidates(readCompareCandidates());
  }

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
      mode: run.form?.mode === 'research_thesis' ? 'research_thesis' : 'rank_known_targets',
      sector: run.form?.sector ?? run.sector ?? '',
      geo: run.form?.geo ?? run.geography ?? '',
      sizeCriteria: run.form?.sizeCriteria ?? run.size_criteria ?? '',
      rationale: run.form?.rationale ?? run.strategic_rationale ?? '',
      buyerThesis: run.form?.buyerThesis ?? run.thesis ?? '',
      targetUniverse: run.form?.targetUniverse ?? '',
    };
    setMode(form.mode);
    setSector(form.sector);
    setGeo(form.geo);
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
    setIsSubmitting(true);
    setState({ kind: 'idle' });
    try {
      const targets = parseKnownTargetUniverse(targetUniverse);
      if (mode === 'rank_known_targets' && targets.length === 0) {
        setState({ kind: 'error', message: 'Add at least one company and website to rank targets.' });
        return;
      }
      const formValues: OriginationFormValues = {
        mode,
        sector,
        geo,
        sizeCriteria,
        rationale,
        buyerThesis,
        targetUniverse,
      };
      const data = await runOrigination({
        buyer_thesis: buyerThesis,
        sector,
        geography: geo,
        size_criteria: sizeCriteria,
        strategic_rationale: rationale,
        ...(mode === 'rank_known_targets' && targets.length > 0 ? { targets } : {}),
      });
      storeOriginationRun(formValues, data);
      const storedRun = saveOriginationRunToHistory(formValues, data);
      refreshWorkspace();
      setState({ kind: 'result', data, restored: false, runId: storedRun.id });
    } catch (err) {
      console.error('[origination] run failed', err);
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
        ...(err instanceof OriginationTimeoutError ? { diagnostics: err.diagnostics } : {}),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setState({ kind: 'idle' });
  }

  function handleClearRestored() {
    clearStoredOriginationRun();
    setSector('');
    setGeo('');
    setSizeCriteria('');
    setRationale('');
    setBuyerThesis('');
    setTargetUniverse('');
    setMode('rank_known_targets');
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
      <ScreeningWorkflowGuide active="originate" />
      <form onSubmit={handleSubmit} className="surface-raised rounded-xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Start an origination</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Research a thesis or rank known targets. Frontier OS will not invent acquisition targets.
          </p>
        </div>
        <div className="surface-flat rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {isRankKnownTargetsMode
              ? 'Paste company names and websites to rank a known universe.'
              : 'Research a thesis and keep source pages separate from company candidates.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Best practice: screen companies individually before comparing candidates.
          </p>
        </div>
        <div className="surface-flat rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">Origination mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                value: 'rank_known_targets' as OriginationMode,
                label: 'Rank known targets',
                description: 'Rank and enrich a supplied/source-backed target universe.',
              },
              {
                value: 'research_thesis' as OriginationMode,
                label: 'Research thesis',
                description: 'Find source pages and possible leads without inventing targets.',
              },
            ].map(option => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs mt-0.5">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
        {!isRankKnownTargetsMode && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Buyer thesis
              </label>
              <textarea
                value={buyerThesis}
                onChange={e => setBuyerThesis(e.target.value)}
                rows={3}
                placeholder="e.g. Founder-owned UK vertical software with recurring revenue, low implementation complexity and low AI replica risk."
                className="w-full px-3 py-2 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Target sector / vertical
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="e.g. UK vertical SaaS, telecoms BSS"
                  className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Geography
                </label>
                <input
                  type="text"
                  value={geo}
                  onChange={e => setGeo(e.target.value)}
                  placeholder="e.g. UK, DACH, Nordic"
                  className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Size criteria
              </label>
              <input
                type="text"
                value={sizeCriteria}
                onChange={e => setSizeCriteria(e.target.value)}
                placeholder="e.g. UK lower mid-market, profitable bootstrapped software"
                className="w-full h-9 px-3 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Strategic rationale <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                rows={3}
                placeholder="What makes this a compelling thesis? e.g. mission-critical vertical software with low churn, cross-sell to existing portfolio..."
                className="w-full px-3 py-2 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none"
              />
            </div>
          </>
        )}
        {isRankKnownTargetsMode ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Paste known target companies
            </label>
            <textarea
              value={targetUniverse}
              onChange={e => setTargetUniverse(e.target.value)}
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
        ) : (
          <details className="rounded-lg border border-border bg-background/60 overflow-hidden">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Optional: provide known targets instead
            </summary>
            <div className="border-t border-border p-3">
              <textarea
                value={targetUniverse}
                onChange={e => setTargetUniverse(e.target.value)}
                rows={4}
                placeholder={`Paste known targets, one per line:
[Company name], [website URL], [jurisdiction], [brief description]`}
                className="w-full px-3 py-2 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none"
              />
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-1.5">
                Research thesis mode focuses on source pages. Switch to Rank known targets to rank supplied companies.
              </p>
            </div>
          </details>
        )}

        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          {statusCopy}
        </p>

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

        {isSubmitting && state.kind !== 'result' && (
          <div className="rounded-lg border border-card-border bg-card px-4 py-3 flex items-start gap-3 shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">{loadingLabel}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Frontier OS will not invent acquisition targets.
              </p>
            </div>
          </div>
        )}
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
          {state.diagnostics && (
            <details className="rounded-lg border border-border bg-card/40 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer list-none text-[10px] font-semibold tracking-normal text-muted-foreground">
                Developer diagnostics
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-border px-4 py-3">
                {[
                  ['endpoint', state.diagnostics.endpoint],
                  ['timeout_ms', state.diagnostics.timeout_ms],
                  ['elapsed_ms', state.diagnostics.elapsed_ms],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-0.5">{String(label)}</p>
                    <p className="text-xs text-foreground break-words">{safeStr(value)}</p>
                  </div>
                ))}
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
              setMode('rank_known_targets');
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
    title: 'Origination thesis',
    desc:  'Private-beta thesis-led target discovery from a reference universe.',
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
      <div className="w-full border-b border-border bg-card/30">
        <div className="app-container py-10">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Origination</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              PRIVATE BETA
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Preview thesis-led origination workflow.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Describe your buyer thesis. Hosted preview will not invent acquisition targets; it only
            renders targets when the backend provides a source-backed target universe.
          </p>
        </div>
      </div>

      <div className="app-container flex-1 py-10 space-y-10">

        {/* Workflow steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Search className="w-4 h-4" />, step: '1', title: 'Enter buyer thesis', desc: 'Sector, geography, revenue range and strategic rationale.' },
            { icon: <Target className="w-4 h-4" />, step: '2', title: 'Backend screen', desc: 'If enabled, the backend returns public-source candidate signals.' },
            { icon: <ChevronRight className="w-4 h-4" />, step: '3', title: 'Review candidates', desc: 'Treat all output as signals until each target is screened directly.' },
          ].map(({ icon, step, title, desc }) => (
            <div key={step} className="rounded-lg border border-border/70 bg-card/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[11px] font-bold font-medium">
                  {step}
                </span>
                <span className="text-primary">{icon}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-card-border bg-card/80 px-5 py-4 shadow-xs">
          <p className="text-sm font-semibold text-foreground mb-1">Private-beta origination workflow</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This page calls the backend origination endpoint when available. It does not show static target lists or save illustrative candidates to Cockpit.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
          {/* Live origination thesis form */}
          <div className="min-w-0">
            <div className="mb-4">
              <p className="text-xs font-semibold text-primary mb-1">Origination thesis</p>
              <p className="text-sm text-muted-foreground">
                Describe your buyer thesis and manage source-backed leads in the workspace.
              </p>
            </div>
            <OriginationForm />
          </div>

          {/* Available now in private beta */}
          <aside className="rounded-lg border border-border/70 bg-card/60 p-5">
            <p className="text-xs font-semibold text-muted-foreground mb-4">Available now</p>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_NOW.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 rounded-md px-3 py-3 hover:bg-accent/40 transition-colors group"
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

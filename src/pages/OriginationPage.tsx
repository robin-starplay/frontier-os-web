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
import { normalizeWebsiteUrl, isValidWebsiteUrl, WEBSITE_URL_VALIDATION_MESSAGE } from '@/lib/urlUtils';
import { addCompareCandidate } from '@/lib/compareSelection';

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

const LAST_ORIGINATION_RESULT_KEY = 'frontier_last_origination_result';
const LAST_ORIGINATION_FORM_KEY = 'frontier_last_origination_form';

interface OriginationFormValues {
  sector: string;
  geo: string;
  sizeCriteria: string;
  rationale: string;
  buyerThesis: string;
  targetUniverse: string;
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
  const timeout = window.setTimeout(() => controller.abort(), ORIGINATION_REQUEST_TIMEOUT_MS);
  const requestInit: RequestInit = {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
    signal:  controller.signal,
  };
  try {
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
    window.clearTimeout(timeout);
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
  return value.map(safeStr).filter(Boolean);
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
      return 'Web discovery returned source-backed candidates. Run URL screens before outreach.';
    }
    if (response.source_backed_target_universe_available === false) {
      return 'No source-backed target universe was available. Frontier OS did not invent targets.';
    }
  }

  return 'If live discovery is available, Frontier OS will return source-backed leads. If not, it will interpret the thesis and suggest search angles without inventing targets.';
}

function sourceUrls(candidate: Record<string, unknown>): string[] {
  const urls = Array.isArray(candidate.source_urls)
    ? candidate.source_urls.map(safeStr).filter(Boolean)
    : [];
  const sourceUrl = safeStr(candidate.source_url);
  if (sourceUrl && !urls.includes(sourceUrl)) urls.unshift(sourceUrl);
  return urls;
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
  const explicit = safeStr(candidate.display_mode);
  if (explicit) return explicit;
  const quality = candidateQuality(candidate);
  if (quality === 'excluded') return 'hidden_excluded';
  if (quality === 'needs_website_confirmation' || quality === 'low_priority') return 'compact_row';
  return 'full_card';
}

function candidateGroups(candidates: Record<string, unknown>[]) {
  return {
    screenable: candidates.filter(c => candidateDisplayMode(c) === 'full_card' && candidateQuality(c) !== 'excluded'),
    needsWebsite: candidates.filter(c => candidateQuality(c) === 'needs_website_confirmation' && candidateDisplayMode(c) !== 'full_card'),
    lowPriority: candidates.filter(c => candidateQuality(c) === 'low_priority' && candidateDisplayMode(c) !== 'full_card'),
    excluded: candidates.filter(c => candidateQuality(c) === 'excluded' || candidateDisplayMode(c) === 'hidden_excluded'),
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

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(safeStr(value));
  return Number.isFinite(parsed) ? parsed : null;
}

// ─── Result renderer ──────────────────────────────────────────────────────────

function OriginationResultView({
  data,
  onReset,
}: {
  data: OriginationResult;
  onReset: () => void;
}) {
  const [showRejected, setShowRejected] = useState(false);
  const [savedCandidates, setSavedCandidates] = useState<Set<string>>(() => new Set());
  const [compareMessages, setCompareMessages] = useState<Record<string, string>>({});

  // Normalise candidate list — backend may call this field anything
  const rawCandidates = (
    (data.targets as unknown[] | undefined) ??
    (data.ranked_targets as unknown[] | undefined) ??
    (data.candidates as unknown[] | undefined) ??
    []
  ) as Record<string, unknown>[];
  const candidates = rawCandidates.filter(candidate => !isSyntheticReferenceCandidate(candidate));
  const groupedCandidates = candidateGroups(candidates);
  const candidateSummary = asRecord(data.candidate_summary);

  const isUnavailable = data.status === 'unavailable';
  const isReferenceUniverse = data.universe_mode === 'private_beta_reference_universe';
  const sourceMode = safeStr(data.source_mode || data.universe_mode);
  const hasSourceBackedUniverse = data.source_backed_target_universe_available === true || candidates.length > 0;
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

  if (candidates.length === 0 || !hasSourceBackedUniverse) {
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
    const name = safeStr(candidate.company_name ?? candidate.company ?? candidate.name) || 'Unnamed candidate';
    const missingEvidence = asList(candidate.missing_evidence ?? candidate.evidence_gaps);
    saveOriginationTarget({
      companyName: name,
      website: safeStr(candidate.website),
      sector: safeStr(candidate.sector ?? candidate.vertical),
      country: safeStr(candidate.country ?? candidate.jurisdiction),
      fitScore: safeStr(candidate.fit_score),
      evidenceConfidence: safeStr(candidate.evidence_confidence, 'Low'),
      aiRisk: safeStr(candidate.ai_risk ?? candidate.ai_risk_view, 'Unknown'),
      whyItFits: safeStr(candidate.why_it_fits ?? candidate.why_fits ?? candidate.rationale),
      missingEvidence,
      nextAction: safeStr(candidate.next_action, 'Run URL screen before outreach or IC use.'),
    });
    setSavedCandidates(prev => new Set(prev).add(name));
  }

  function compareCandidateKey(candidate: Record<string, unknown>): string {
    return safeStr(candidate.website) || `${safeStr(candidate.company_name ?? candidate.company ?? candidate.name)}-${safeStr(candidate.jurisdiction ?? candidate.country)}`;
  }

  function handleAddToCompare(candidate: Record<string, unknown>) {
    const name = safeStr(candidate.company_name ?? candidate.company ?? candidate.name) || 'Unnamed candidate';
    const website = safeStr(candidate.website);
    const hasWebsite = Boolean(website.trim());
    const jurisdiction = safeStr(candidate.jurisdiction ?? candidate.country);
    const { added } = addCompareCandidate({
      company_name: name,
      website,
      jurisdiction,
      source: 'origination',
      source_label: safeStr(candidate.source_label),
      evidence_status: safeStr(candidate.evidence_status ?? candidate.verification_status),
      fit_score_100: numericOrNull(candidate.fit_score_100 ?? candidate.fit_score ?? candidate.score),
      recommendation: safeStr(candidate.recommendation ?? candidate.verdict),
      ...(hasWebsite
        ? { website_status: safeStr(candidate.website_status, 'known'), compare_ready: true }
        : {
            website_status: 'missing',
            compare_ready: false,
            compare_note: 'Website must be confirmed before comparison.',
          }),
    });
    const key = compareCandidateKey(candidate);
    setCompareMessages(prev => ({ ...prev, [key]: added ? 'Added to Compare' : 'Already in Compare' }));
    window.setTimeout(() => {
      window.location.href = '/app/compare';
    }, 350);
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
    const productSignal = safeStr(c.product_signal, 'unknown');
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
    const canSaveCandidate = website && (
      safeStr(c.source_mode) === 'user_supplied_target_universe'
      || sourceLabel === 'User supplied target universe'
      || evidenceStatus === 'user_supplied_claim'
      || sourceMode === 'user_supplied_target_universe'
    );

    return (
      <div key={`${name}-${rank}`} className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[11px] font-medium text-muted-foreground/50">#{rank}</span>
          <p className="text-sm font-semibold text-foreground">{name}</p>
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
          {website ? (
            <Link
              href={`/app/run?company=${encodeURIComponent(name)}&website=${encodeURIComponent(website)}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              Run screen →
            </Link>
          ) : (
            <Link
              href="/app/run"
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              Run screen →
            </Link>
          )}
          {canSaveCandidate && (
            <button
              type="button"
              onClick={() => handleSaveCandidate(c)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              {savedCandidates.has(name) ? 'Saved to Cockpit' : 'Save to Cockpit'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAddToCompare(c)}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
          >
            {compareMessages[compareKey] || 'Add to Compare'}
          </button>
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
    const companyHouseUrl = sourceUrls(c).find(url => url.includes('company-information.service.gov.uk') || url.includes('companieshouse'));
    const compareKey = compareCandidateKey(c);
    return (
      <div key={`${name}-${i}`} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_.8fr_.8fr_.9fr_1.4fr_.8fr_.9fr] gap-2 px-4 py-3 text-xs items-start">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="text-muted-foreground">{displayValue(c.source_label, 'Source-backed lead')}</p>
        <p className="text-muted-foreground">{humanLabel(displayValue(c.website_status))}</p>
        <p className="text-muted-foreground">{humanLabel(displayValue(c.product_signal))}</p>
        <p className="text-muted-foreground">{humanLabel(displayValue(c.candidate_decision))}</p>
        <p className="text-muted-foreground leading-relaxed">{displayValue(c.next_best_action, 'Find and verify website.')}</p>
        {companyHouseUrl ? (
          <a href={companyHouseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Companies House
          </a>
        ) : (
          <span className="text-muted-foreground/50">No registry link</span>
        )}
        <button
          type="button"
          onClick={() => handleAddToCompare(c)}
          className="inline-flex w-fit items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
        >
          {compareMessages[compareKey] || 'Add to Compare'}
        </button>
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

  function renderCandidateGroup(title: string, items: Record<string, unknown>[], mode: 'full' | 'compact' | 'excluded') {
    if (items.length === 0) return null;
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-normal text-primary">{title}</p>
          <span className="text-[10px] font-medium text-muted-foreground/60">{items.length}</span>
        </div>
        {mode === 'compact' && (
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.9fr_1.4fr_.8fr_.9fr] gap-2 px-4 py-2 text-[10px] font-semibold text-muted-foreground border-b border-border bg-muted/20">
            <span>Company</span>
            <span>Source</span>
            <span>Website</span>
            <span>Product</span>
            <span>Decision</span>
            <span>Next action</span>
            <span>Registry</span>
            <span>Compare</span>
          </div>
        )}
        <div className={mode === 'full' ? 'divide-y divide-border' : ''}>
          {items.map((item, index) => (
            mode === 'full'
              ? renderFullCandidateCard(item, index)
              : mode === 'compact'
              ? renderCompactCandidateRow(item, index)
              : renderExcludedCandidate(item, index)
          ))}
        </div>
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
        <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Warnings</p>
          <ul className="space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{safeStr(warning)}</li>
            ))}
          </ul>
        </div>
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
      {candidates.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Candidate summary</p>
            {safeStr(candidateSummary.discovery_quality) && (
              <SemanticBadge tone={safeStr(candidateSummary.discovery_quality) === 'low' ? 'partial' : safeStr(candidateSummary.discovery_quality) === 'high' ? 'verified' : 'info'}>
                Discovery quality: {humanLabel(safeStr(candidateSummary.discovery_quality))}
              </SemanticBadge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              ['Total candidates', candidateSummary.total_candidates ?? candidates.length],
              ['Screenable now', candidateSummary.screenable_now_count ?? groupedCandidates.screenable.length],
              ['Need website confirmation', candidateSummary.needs_website_confirmation_count ?? groupedCandidates.needsWebsite.length],
              ['Low priority', candidateSummary.low_priority_count ?? groupedCandidates.lowPriority.length],
              ['Excluded', candidateSummary.excluded_count ?? groupedCandidates.excluded.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">{String(label)}</p>
                <p className="text-sm font-semibold text-foreground">{safeStr(value, '0')}</p>
              </div>
            ))}
          </div>
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
            These are registry leads, not verified acquisition targets. Product websites are required before screening.
          </p>
        </div>
      )}

      {renderCandidateGroup('Screenable product candidates', groupedCandidates.screenable, 'full')}
      {renderCandidateGroup('Registry leads needing website confirmation', groupedCandidates.needsWebsite, 'compact')}
      {renderCandidateGroup('Low priority registry matches', groupedCandidates.lowPriority, 'compact')}
      {renderCandidateGroup('Excluded / hidden', groupedCandidates.excluded, 'excluded')}

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
          Run another origination screen
        </button>
        <Link
          href="/app/run"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Run URL screen
        </Link>
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-white hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Deal Cockpit
        </Link>
      </div>
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
                Run known URL screen <ArrowRight className="w-3 h-3" />
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
              Run URL screen <ArrowRight className="w-3 h-3" />
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

// ─── Origination form ─────────────────────────────────────────────────────────

type FormState =
  | { kind: 'idle' }
  | { kind: 'result'; data: OriginationResult; restored?: boolean }
  | { kind: 'error'; message: string; diagnostics?: OriginationRequestDiagnostics };

function OriginationForm() {
  const storedForm = readStoredOriginationForm();
  const [sector,    setSector   ] = useState(storedForm.sector);
  const [geo,       setGeo      ] = useState(storedForm.geo);
  const [sizeCriteria, setSizeCriteria] = useState(storedForm.sizeCriteria);
  const [rationale, setRationale] = useState(storedForm.rationale);
  const [buyerThesis, setBuyerThesis] = useState(storedForm.buyerThesis);
  const [targetUniverse, setTargetUniverse] = useState(storedForm.targetUniverse);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state,     setState    ] = useState<FormState>(() => {
    const storedResult = readStoredOriginationResult();
    return storedResult ? { kind: 'result', data: storedResult, restored: true } : { kind: 'idle' };
  });
  const statusCopy = discoveryStatusCopy(targetUniverse);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setState({ kind: 'idle' });
    try {
      const targets = parseKnownTargetUniverse(targetUniverse);
      const formValues: OriginationFormValues = {
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
        ...(targets.length > 0 ? { targets } : {}),
      });
      storeOriginationRun(formValues, data);
      setState({ kind: 'result', data, restored: false });
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
    setState({ kind: 'idle' });
  }

  if (state.kind === 'result') {
    return (
      <div className="space-y-4">
        {state.restored && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <span>Restored last origination run</span>
            <button
              type="button"
              onClick={handleClearRestored}
              className="font-medium text-primary hover:text-primary/80"
            >
              Clear
            </button>
          </div>
        )}
        <OriginationResultView data={state.data} onReset={handleReset} />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {statusCopy}
        </p>
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
            Run URL screen <ArrowRight className="w-3 h-3" />
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          Known target universe
        </label>
        <textarea
          value={targetUniverse}
          onChange={e => setTargetUniverse(e.target.value)}
          rows={5}
          placeholder={`Paste known targets, one per line:
Company name, website, country, brief description

Example format:
[Company name], [website URL], [country], [brief description]`}
          className="w-full px-3 py-2 text-sm bg-white border border-input rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors resize-none"
        />
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-1.5">
          Paste one company per line. Frontier OS will rank only supplied/source-backed targets and will not invent acquisition targets.
        </p>
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-1">
          Only paste targets you are permitted to screen. Frontier OS will not invent or enrich targets without evidence.
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        {statusCopy}
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking source-backed discovery and ranking candidates...</>
        ) : (
          <>Preview origination workflow <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </button>

      {isSubmitting && state.kind !== 'result' && (
        <div className="rounded-lg border border-card-border bg-card px-4 py-3 flex items-start gap-3 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Checking source-backed discovery and ranking candidates...</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Frontier OS will not invent acquisition targets.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AVAILABLE_NOW = [
  {
    href:  '/app/run',
    title: 'Run screen',
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
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
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

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-10">

        {/* Workflow steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Search className="w-4 h-4" />, step: '1', title: 'Enter buyer thesis', desc: 'Sector, geography, revenue range and strategic rationale.' },
            { icon: <Target className="w-4 h-4" />, step: '2', title: 'Backend screen', desc: 'If enabled, the backend returns public-source candidate signals.' },
            { icon: <ChevronRight className="w-4 h-4" />, step: '3', title: 'Review candidates', desc: 'Treat all output as signals until each target is screened directly.' },
          ].map(({ icon, step, title, desc }) => (
            <div key={step} className="rounded-lg border border-border bg-card p-5">
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

        <div className="rounded-lg border border-card-border bg-card px-5 py-4 shadow-xs">
          <p className="text-sm font-semibold text-foreground mb-1">Private-beta origination workflow</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This page calls the backend origination endpoint when available. It does not show static target lists or save illustrative candidates to Cockpit.
          </p>
        </div>

        {/* Live origination thesis form */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <p className="text-[10px] font-semibold tracking-normal text-primary mb-0.5">
              Origination thesis
            </p>
            <p className="text-xs text-muted-foreground">
              Describe your buyer thesis and run the private-beta origination workflow.
            </p>
          </div>
          <div className="p-5">
            <OriginationForm />
          </div>
        </div>

        {/* Available now in private beta */}
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-4">Available now in private beta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_NOW.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors group"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-0.5">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

      </div>

      <BetaCTA
        title="Ready to screen specific targets now?"
        body="Run a URL-only screen on any company website and get a recommendation in under 2 minutes."
        primaryLabel="Run screen"
        primaryHref="/app/run"
        secondaryLabel="Compare targets"
        secondaryHref="/compare"
        eventName="origination_bottom"
      />
    </div>
  );
}

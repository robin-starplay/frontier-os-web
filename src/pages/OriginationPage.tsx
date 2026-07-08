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

const LEVEL_CLASSES: Record<string, string> = {
  green: 'bg-green-500/10 text-green-700 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  red:   'bg-red-500/10   text-red-700   border-red-500/20',
};

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

interface KnownTarget {
  company_name: string;
  website: string;
  jurisdiction: string;
  sector: string;
  source_label: 'User supplied target universe';
}

async function runOrigination(req: OriginationRequest): Promise<OriginationResult> {
  const base = getBackendBaseUrl();
  const thesisUrl = base ? `${base}/api/origination/thesis` : '/api/origination/thesis';
  const runUrl = base ? `${base}/api/origination/run` : '/api/origination/run';
  const requestInit: RequestInit = {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
  };
  let res = req.targets && req.targets.length > 0
    ? await fetch(runUrl, requestInit)
    : await fetch(thesisUrl, requestInit);
  if (res.status === 404) res = await fetch(runUrl, requestInit);
  const body = await res.json().catch(() => null) as OriginationResult | null;
  if (!res.ok) {
    const message = typeof body?.message === 'string'
      ? body.message
      : `Backend returned status ${res.status}.`;
    throw new Error(message);
  }
  return body ?? {};
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
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [company, website, jurisdiction, ...sectorParts] = line.split(',').map(part => part.trim());
      return {
        company_name: company || '',
        website: website || '',
        jurisdiction: jurisdiction || '',
        sector: sectorParts.join(', ').trim(),
        source_label: 'User supplied target universe' as const,
      };
    })
    .filter(target => target.company_name && target.website);
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

  // Normalise candidate list — backend may call this field anything
  const rawCandidates = (
    (data.targets as unknown[] | undefined) ??
    (data.ranked_targets as unknown[] | undefined) ??
    (data.candidates as unknown[] | undefined) ??
    []
  ) as Record<string, unknown>[];
  const candidates = rawCandidates.filter(candidate => !isSyntheticReferenceCandidate(candidate));

  const isUnavailable = data.status === 'unavailable';
  const isReferenceUniverse = data.universe_mode === 'private_beta_reference_universe';
  const sourceMode = safeStr(data.source_mode || data.universe_mode);
  const hasSourceBackedUniverse = data.source_backed_target_universe_available === true || candidates.length > 0;
  const summary    = (data.summary ?? data.thesis_summary) as string | undefined;
  const rationale  = (data.match_rationale ?? data.buyer_thesis) as string | undefined;
  const nextActArr = data.next_actions      as unknown[] | undefined;
  const evidGaps   = data.evidence_gaps     as unknown[] | undefined;
  const limitations= (Array.isArray(data.limitations) ? data.limitations : data.limitations ? [data.limitations] : []) as unknown[];
  const warnings   = (Array.isArray(data.warnings) ? data.warnings : data.warnings ? [data.warnings] : []) as unknown[];
  const rejected   = (
    (data.excluded_targets as Record<string, unknown>[] | undefined) ??
    (data.rejected_targets as Record<string, unknown>[] | undefined) ??
    []
  );
  const showDiagnostics = showDeveloperDiagnostics();
  const diagnostics = [
    ['openai_used', data.openai_used],
    ['ranking_mode', data.ranking_mode],
    ['model_used', data.model_used],
    ['fallback_reason', data.fallback_reason],
    ['source_mode', data.source_mode],
  ].filter(([, value]) => safeStr(value) !== '');

  if (isUnavailable) {
    return <OriginationUnavailable onReset={onReset} message={safeStr(data.message)} />;
  }

  if (candidates.length === 0 || !hasSourceBackedUniverse) {
    return (
      <OriginationLimitedPreview
        onReset={onReset}
        warnings={warnings}
        limitations={limitations}
        summary={summary}
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

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {(isReferenceUniverse || sourceMode.includes('private_beta_reference_universe')) && (
            <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              Private-beta reference universe
            </span>
          )}
          {sourceMode.includes('user_supplied_target_universe') && (
            <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              Known target universe
            </span>
          )}
          <span className="inline-flex items-center rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-700">
            Validate before outreach
          </span>
          <span className="inline-flex items-center rounded border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            No live crawling
          </span>
          <span className="inline-flex items-center rounded border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            No paid data providers
          </span>
          <span className="inline-flex items-center rounded border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            No verified revenue/ARR/EBITDA/customer concentration
          </span>
        </div>
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

      {/* Candidate targets */}
      {candidates.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-normal text-primary">
              Candidate targets ({candidates.length})
            </p>
            <span className="text-[10px] font-medium text-muted-foreground/60">Public signals only · not verified</span>
          </div>
          <div className="divide-y divide-border">
            {candidates.map((c, i) => {
              const name    = safeStr(c.company_name ?? c.company ?? c.name) || 'Unnamed candidate';
              const sector  = safeStr(c.sector ?? c.vertical ?? '');
              const country = safeStr(c.country ?? c.jurisdiction ?? '');
              const verdict = safeStr(c.verdict ?? c.recommendation ?? '');
              const fit     = safeStr(c.fit_score_100 ?? c.fit_score ?? c.score ?? '');
              const fitLabel = safeStr(c.fit_label ?? c.buyer_thesis_fit ?? '');
              const confidence = safeStr(c.evidence_confidence ?? '');
              const risk    = safeStr(c.ai_risk ?? c.ai_risk_view ?? c.risk ?? '');
              const fits    = safeStr(c.why_it_fits ?? c.why_fits ?? c.rationale ?? c.match_rationale ?? '');
              const description = safeStr(c.one_line_description ?? c.description ?? '');
              const missingItems = asList(c.missing_evidence ?? c.evidence_gaps ?? '');
              const diligenceQuestions = asList(c.diligence_questions ?? '');
              const action  = safeStr(c.next_action ?? '');
              const website = safeStr(c.website ?? '');
              const sourceLabel = safeStr(c.source_label) || 'Public-source candidate signal';
              const evidenceStatus = safeStr(c.evidence_status ?? c.verification_status ?? 'not_independently_verified');
              const sourceUrls = Array.isArray(c.source_urls) ? c.source_urls.map(safeStr).filter(Boolean) : [];
              const rank = safeStr(c.rank, String(i + 1));
              const canSaveCandidate = website && (
                safeStr(c.source_mode) === 'user_supplied_target_universe'
                || sourceLabel === 'User supplied target universe'
                || evidenceStatus === 'user_supplied_claim'
                || sourceMode === 'user_supplied_target_universe'
              );
              const lvlRaw  = safeStr(c.level ?? c.recommendation_level ?? 'amber').toLowerCase();
              const lvl     = lvlRaw in LEVEL_CLASSES ? lvlRaw : 'amber';
              return (
                <div key={i} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-medium text-muted-foreground/50">#{rank}</span>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    {verdict && (
                      <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded border ${LEVEL_CLASSES[lvl]}`}>
                        {verdict}
                      </span>
                    )}
                  </div>
                  {(sector || description) && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {[sector, country, description].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-xs">
                    {fit && (
                      <div>
                        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Fit score 100</p>
                        <p className="font-semibold text-foreground">{fit}</p>
                      </div>
                    )}
                    {fitLabel && (
                      <div>
                        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Fit label</p>
                        <p className="font-medium text-muted-foreground">{fitLabel}</p>
                      </div>
                    )}
                    {confidence && (
                      <div>
                        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Evidence confidence</p>
                        <p className="font-medium text-muted-foreground">{confidence}</p>
                      </div>
                    )}
                    {risk && (
                      <div>
                        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">AI risk</p>
                        <p className="font-medium text-muted-foreground">{risk}</p>
                      </div>
                    )}
                    {fits && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-0.5">Why it fits</p>
                        <p className="text-muted-foreground leading-snug">{fits}</p>
                      </div>
                    )}
                  </div>
                  {missingItems.length > 0 && (
                    <div className="mb-2">
                      <p className="font-semibold tracking-normal text-[10px] text-amber-700/70 mb-1">Missing evidence</p>
                      <ul className="space-y-1">
                        {missingItems.slice(0, 4).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diligenceQuestions.length > 0 && (
                    <div className="mb-2">
                      <p className="font-semibold tracking-normal text-[10px] text-muted-foreground mb-1">Diligence questions</p>
                      <ul className="space-y-1">
                        {diligenceQuestions.slice(0, 4).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
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
                    <Link
                      href={`/compare?company=${encodeURIComponent(name)}&website=${encodeURIComponent(website)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                    >
                      Add to Compare
                    </Link>
                    {canSaveCandidate && (
                      <button
                        type="button"
                        onClick={() => handleSaveCandidate(c)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                      >
                        {savedCandidates.has(name) ? 'Saved to Cockpit' : 'Save to Cockpit'}
                      </button>
                    )}
                    {action && (
                      <span className="text-[11px] text-muted-foreground/60">{action}</span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground/40 mt-2">
                    Source: {humanLabel(sourceLabel)} · Evidence status: {humanLabel(evidenceStatus)}
                  </p>
                  {sourceUrls.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {sourceUrls.map(url => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
}: {
  onReset: () => void;
  warnings?: unknown[];
  limitations?: unknown[];
  summary?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Live target discovery is not enabled. Provide known targets or run a URL screen.
            </p>
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
}: {
  onReset: () => void;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Live target discovery is not enabled. Provide known targets or run a URL screen.
          </p>
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
  | { kind: 'submitting' }
  | { kind: 'result'; data: OriginationResult }
  | { kind: 'error'; message: string };

function OriginationForm() {
  const [sector,    setSector   ] = useState('');
  const [geo,       setGeo      ] = useState('');
  const [sizeCriteria, setSizeCriteria] = useState('');
  const [rationale, setRationale] = useState('');
  const [buyerThesis, setBuyerThesis] = useState('');
  const [targetUniverse, setTargetUniverse] = useState('');
  const [state,     setState    ] = useState<FormState>({ kind: 'idle' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: 'submitting' });
    try {
      const targets = parseKnownTargetUniverse(targetUniverse);
      const data = await runOrigination({
        buyer_thesis: buyerThesis,
        sector,
        geography: geo,
        size_criteria: sizeCriteria,
        strategic_rationale: rationale,
        ...(targets.length > 0 ? { targets } : {}),
      });
      setState({ kind: 'result', data });
    } catch (err) {
      console.error('[origination] run failed', err);
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }

  function handleReset() {
    setState({ kind: 'idle' });
  }

  if (state.kind === 'result') {
    return <OriginationResultView data={state.data} onReset={handleReset} />;
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Live target discovery is not enabled. Provide known targets or run a URL screen.
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Frontier OS will rank only supplied/source-backed targets and will not invent acquisition targets.
        </p>
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

      {/* Caveat */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Live target discovery is not enabled. Provide known targets or run a URL screen.
      </p>

      <button
        type="submit"
        disabled={state.kind === 'submitting'}
        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state.kind === 'submitting' ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Previewing origination workflow…</>
        ) : (
          <>Preview origination workflow <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </button>

      {state.kind === 'submitting' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Previewing origination workflow…</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ranking supplied targets when provided; otherwise checking whether live target discovery is enabled.
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

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
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

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { BetaCTA } from '@/components/BetaCTA';
import { SendFeedbackButton } from '@/components/SendFeedbackButton';
import {
  GitCompare, Clock, ChevronRight, X,
  BookMarked, TrendingUp, AlertTriangle,
  Lock, ArrowRight,
  ExternalLink, Filter, Trash2, PencilLine, Plus,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceCard } from '@/components/EvidenceCard';
import { getRuns, removeRun, updateRunEntry, type RunEntry } from '@/lib/runHistory';
import { safeEvidenceStatus } from '@/lib/evidenceUtils';
import { getWorkspaceId } from '@/lib/trialAccount';
import { getCockpitRuns, type CockpitRunRecord } from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { useOptionalUser } from '@/lib/optionalClerk';
import type { RecommendationLevel } from '@/data/mockData';
import { SemanticBadge } from '@/components/SemanticBadge';
import { ScreeningWorkflowGuide } from '@/components/ScreeningWorkflowGuide';
import { type StoredCompareCandidate } from '@/lib/compareSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { normalizeWebsiteUrl } from '@/lib/urlUtils';
import {
  addUserSuppliedEvidence,
  COCKPIT_COMPARE_SELECTION_KEY,
  saveCompareCandidates,
  updateWorkflowTarget,
  type WorkflowTargetMatcher,
} from '@/lib/workflowTargets';

// ─── Types & constants ────────────────────────────────────────────────────────

type FilterKey = 'all' | 'financials' | 'monitor' | 'high-ai-risk' | 'evidence-gaps';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'financials',    label: 'Financial evidence needed' },
  { key: 'monitor',       label: 'Monitor' },
  { key: 'high-ai-risk',  label: 'High AI risk' },
  { key: 'evidence-gaps', label: 'Diligence blockers' },
];

function applyFilter(runs: RunEntry[], filter: FilterKey): RunEntry[] {
  switch (filter) {
    case 'financials':    return runs.filter(r => r.recommendation === 'Request Financials');
    case 'monitor':       return runs.filter(r => r.recommendation_level === 'blue');
    case 'high-ai-risk':  return runs.filter(r => r.ai_replica_risk === 'High' || r.ai_replica_risk === 'Medium-high');
    case 'evidence-gaps': return runs.filter(r => r.blockers.length > 0);
    default:              return runs;
  }
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chip(level: RecommendationLevel, label: string) {
  return <SemanticBadge tone={level}>{label}</SemanticBadge>;
}

function riskChip(risk: string) {
  if (risk === 'Low')         return chip('green', risk);
  if (risk === 'Medium')      return chip('blue',  risk);
  if (risk === 'Medium-high') return chip('amber', risk);
  if (risk === 'High')        return chip('red',   risk);
  return chip('grey', risk);
}

function confidenceChip(conf: string) {
  if (conf === 'High')   return chip('green', conf);
  if (conf === 'Medium') return chip('amber', conf);
  if (!isDisplayText(conf)) return chip('grey', 'Not scored');
  return chip('grey', conf);
}

function safeLevel(level: string): RecommendationLevel {
  const valid: RecommendationLevel[] = ['green', 'amber', 'red', 'blue', 'grey'];
  return valid.includes(level as RecommendationLevel) ? (level as RecommendationLevel) : 'grey';
}

function isDisplayText(value: string | undefined | null): value is string {
  if (!value) return false;
  const text = value.trim();
  if (!text) return false;
  const lowered = text.toLowerCase();
  return lowered !== 'unavailable in this preview'
    && lowered !== 'unknown'
    && lowered !== 'n/a'
    && lowered !== 'na'
    && text !== '—'
    && text !== '-';
}

function displayText(value: string | undefined | null): string | null {
  return isDisplayText(value) ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function sourceTypeLabel(type: RunEntry['type']): string {
  if (type === 'compare') return 'Compare';
  if (type === 'document') return 'Document-assisted';
  if (type === 'origination') return 'Origination signal';
  return 'Public-source screen';
}

function cockpitTargetMatcher(run: RunEntry): WorkflowTargetMatcher {
  return {
    id: run.id,
    cockpit_target_id: run.id,
    run_id: run.id,
    company_name: run.company,
    website: run.website,
    jurisdiction: 'UK',
  };
}

function cockpitUserEvidence(run: RunEntry): Record<string, unknown> {
  return asRecord(asRecord(run.result).user_supplied_evidence);
}

function hasFinancialEvidence(run: RunEntry): boolean {
  const evidence = cockpitUserEvidence(run);
  if (Object.keys(asRecord(evidence.user_supplied_financials)).length > 0) return true;
  const cards = run.result?.evidence_cards ?? [];
  return cards.some(card => /revenue|arr|ebitda|gross margin|financial|turnover/i.test(`${card.field} ${card.value} ${card.summary}`));
}

function looksLikeSourcePageUrl(value: string): boolean {
  return /\/(blog|news|press|article|articles|insights|resources|top-|best-|list|lists|companies|startups)\b/i.test(value)
    || /\b(blog|news|article|directory|listicle)\b/i.test(value);
}

function companyDedupeKey(company: string): string {
  return company
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/\b(plc|limited|ltd|inc|corp|corporation|company|co)\b\.?/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeTargetRuns(runs: RunEntry[]): RunEntry[] {
  const seen = new Set<string>();
  return runs.filter((run) => {
    const key = `${run.type}:${companyDedupeKey(run.company) || run.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mainBlocker(run: RunEntry): string | null {
  const blocker = run.blockers.find(isDisplayText);
  if (blocker) return blocker;
  const blockingCard = run.result?.evidence_cards?.find(c => c.status === 'blocking');
  return displayText(blockingCard?.field) ?? displayText(blockingCard?.summary);
}

function runRecommendation(run: RunEntry): string {
  return displayText(run.recommendation) ?? (
    run.type === 'document' ? 'Document reviewed' :
    run.type === 'origination' ? 'Reference candidate' :
    run.type === 'compare' ? 'Compared target' :
    'Saved screen'
  );
}

function normalizeRunWebsite(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function runScreenHref(run: RunEntry): string {
  const params = new URLSearchParams();
  if (run.company) params.set('company_name', run.company);
  if (run.website) params.set('website', normalizeRunWebsite(run.website));
  return `/app/run?${params.toString()}`;
}

function isScreenedForCompare(run: RunEntry): boolean {
  if (!displayText(run.website)) return false;
  if (run.type === 'url') return true;
  if (run.type === 'document' && run.documentSummary) return true;
  return false;
}

function compareDisabledReason(run: RunEntry): string {
  if (!displayText(run.website)) return 'Website required';
  if (!isScreenedForCompare(run)) return 'Screen first';
  return '';
}

function cockpitCandidateFromRun(run: RunEntry): StoredCompareCandidate {
  return {
    company_name: run.company,
    website: normalizeRunWebsite(run.website),
    jurisdiction: 'UK',
    source: 'cockpit',
    source_label: 'Saved Cockpit target',
    evidence_status: displayText(run.evidence_confidence) ?? 'screened',
    fit_score_100: null,
    recommendation: runRecommendation(run),
    candidate_quality: 'screened_target',
    website_status: 'known',
    compare_ready: true,
    run_ready: true,
    screening_status: 'screened',
    cockpit_target_id: run.id,
    run_id: run.id,
    saved_at: run.timestamp,
  };
}

function readCockpitCompareSelectionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COCKPIT_COMPARE_SELECTION_KEY) || '[]');
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .map((item) => {
          const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          return typeof record.run_id === 'string'
            ? record.run_id
            : typeof record.cockpit_target_id === 'string'
              ? record.cockpit_target_id
              : '';
        })
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function writeCockpitCompareSelection(candidates: StoredCompareCandidate[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COCKPIT_COMPARE_SELECTION_KEY, JSON.stringify(candidates));
  } catch {
    // Selection persistence is helpful, but Cockpit should remain usable without it.
  }
}

// ─── Screen Detail Panel (real run entries) ──────────────────────────────────────

type CockpitTab = 'summary' | 'evidence' | 'ai-risk' | 'diligence' | 'decisions' | 'exports';
type CockpitEditMode = 'target' | 'website' | 'evidence' | 'financials' | 'clients' | 'team' | 'product_ai' | 'note';

function ContextActionRow({
  actions,
  onAction,
}: {
  actions: { label: string; mode: CockpitEditMode }[];
  onAction: (mode: CockpitEditMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => (
        <button
          key={`${action.mode}-${action.label}`}
          type="button"
          onClick={() => onAction(action.mode)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}

function RunDetailPanel({
  run,
  onClose,
  onEdit,
  onAddEvidence,
}: {
  run: RunEntry;
  onClose: () => void;
  onEdit: (run: RunEntry, mode: CockpitEditMode) => void;
  onAddEvidence: (run: RunEntry, mode: CockpitEditMode) => void;
}) {
  const level = safeLevel(run.recommendation_level);
  const [activeTab, setActiveTab] = useState<CockpitTab>('summary');

  const tabs: { id: CockpitTab; label: string }[] = [
    { id: 'summary',   label: 'Summary' },
    { id: 'evidence',  label: 'Evidence' },
    { id: 'diligence', label: 'Diligence' },
    { id: 'decisions', label: 'Decisions' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm sm:max-w-md lg:static lg:z-auto lg:inset-auto flex flex-col bg-card border-l border-border shadow-2xl lg:shadow-none lg:rounded-lg lg:border overflow-hidden">

        {/* header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0 bg-card">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-primary mb-1">
              {run.type === 'compare' ? 'Comparison target' : run.type === 'document' ? 'Document-assisted review' : 'Public-source screen'}
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug">{run.company}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {chip(level, run.recommendation)}
            </div>
            <button
              type="button"
              onClick={() => onEdit(run, 'target')}
              className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit target
            </button>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEdit(run, 'website')}
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                {run.website ? 'Edit website' : 'Add website'}
              </button>
              <button
                type="button"
                onClick={() => onAddEvidence(run, 'evidence')}
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Add evidence
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
        </div>

        {/* tab bar */}
        <div className="flex border-b border-border bg-card shrink-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Summary ── */}
          {activeTab === 'summary' && (
            <div className="px-5 py-4 space-y-5">
              <ContextActionRow
                actions={[
                  { label: run.website ? 'Edit website' : 'Add website', mode: 'website' },
                  { label: hasFinancialEvidence(run) ? 'Edit financials' : 'Add financials', mode: 'financials' },
                  { label: 'Add note', mode: 'note' },
                ]}
                onAction={mode => onAddEvidence(run, mode)}
              />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'IC readiness',        value: displayText(run.ic_readiness) },
                  { label: 'Evidence confidence', value: displayText(run.evidence_confidence) },
                  { label: 'Strategic fit',       value: displayText(run.strategic_fit_label) },
                  { label: 'Valuation readiness', value: displayText(run.valuation_readiness) ?? displayText(run.result?.valuation_readiness) },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-border bg-background p-3">
                    <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
                    <p className="text-sm font-medium text-foreground leading-snug">{value}</p>
                  </div>
                ))}
              </div>
              {displayText(run.ai_replica_risk) && (
                <div className="rounded-md border border-border bg-background p-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/60">AI replica risk</p>
                  {riskChip(run.ai_replica_risk)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[11px] font-medium text-muted-foreground">Next action</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{cockpitNextAction(run)}</p>
              </div>
              {run.website && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Website</p>
                  <a href={run.website.startsWith('http') ? run.website : `https://${run.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                    {run.website} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Screened</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTs(run.timestamp)}
                </p>
              </div>
            </div>
          )}

          {/* ── Evidence ── */}
          {activeTab === 'evidence' && (
            <div className="px-5 py-4 space-y-4">
              <ContextActionRow
                actions={[
                  { label: 'Add financials', mode: 'financials' },
                  { label: 'Add clients', mode: 'clients' },
                  { label: 'Add team size', mode: 'team' },
                  { label: 'Add product/AI evidence', mode: 'product_ai' },
                ]}
                onAction={mode => onAddEvidence(run, mode)}
              />
              {run.result?.evidence_cards && run.result.evidence_cards.length > 0 ? (
                <>
                  {/* Three-gate model: safeEvidenceStatus(status, source, confidence) */}
                  {run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'verified').length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold tracking-normal text-green-700 mb-2">
                        Verified facts ({run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'verified').length})
                      </p>
                      <div className="space-y-2">
                        {run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'verified').map((ev, i) => {
                          const conf = (ev.confidence?.toLowerCase() ?? 'low') as 'high' | 'medium' | 'low';
                          return <EvidenceCard key={i} field={ev.field} value={ev.value} source={ev.source} confidence={conf} status="verified" />;
                        })}
                      </div>
                    </div>
                  )}
                  {run.result.evidence_cards.filter(c => { const s = safeEvidenceStatus(c.status, c.source, c.confidence); return s === 'claim' || s === 'caveat'; }).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold tracking-normal text-blue-700 mb-2">
                        Company claims ({run.result.evidence_cards.filter(c => { const s = safeEvidenceStatus(c.status, c.source, c.confidence); return s === 'claim' || s === 'caveat'; }).length})
                      </p>
                      <div className="space-y-2">
                        {run.result.evidence_cards.filter(c => { const s = safeEvidenceStatus(c.status, c.source, c.confidence); return s === 'claim' || s === 'caveat'; }).map((ev, i) => {
                          const conf = (ev.confidence?.toLowerCase() ?? 'low') as 'high' | 'medium' | 'low';
                          return <EvidenceCard key={i} field={ev.field} value={ev.value} source={ev.source} confidence={conf} status="candidate" />;
                        })}
                      </div>
                    </div>
                  )}
                  {run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'unknown').length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">
                        Not verified in this run ({run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'unknown').length})
                      </p>
                      <div className="space-y-2">
                        {run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'unknown').map((ev, i) => (
                          <EvidenceCard key={i} field={ev.field} value={ev.value} source={ev.source} confidence="low" status="pending" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookMarked className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No evidence detail</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[220px]">Evidence detail will appear after the next screen run on this target.</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI Risk ── */}
          {activeTab === 'ai-risk' && (
            <div className="px-5 py-4 space-y-4">
              {displayText(run.ai_replica_risk) && (
                <div className="rounded-md border border-border bg-background p-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/60">AI replica risk</p>
                  {riskChip(run.ai_replica_risk)}
                </div>
              )}
              {run.result?.ai_disruption ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Moat evidence',      value: run.result.ai_disruption.moat_evidence },
                      { label: 'Inference economics', value: run.result.ai_disruption.inference_economics },
                      { label: 'Product expansion',   value: run.result.ai_disruption.product_expansion },
                      { label: 'OPEX improvement',    value: run.result.ai_disruption.opex_improvement },
                    ] as { label: string; value: string | undefined }[])
                      .map(row => ({ ...row, value: displayText(row.value) }))
                      .filter(r => r.value)
                      .map(row => (
                      <div key={row.label} className="rounded-md border border-border bg-background p-3">
                        <p className="text-[10px] text-muted-foreground/60 mb-1">{row.label}</p>
                        <p className="text-xs text-foreground leading-snug">{row.value}</p>
                      </div>
                    ))}
                  </div>
                  {run.result.ai_disruption.diligence_questions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">AI diligence questions</p>
                      <div className="space-y-1.5">
                        {run.result.ai_disruption.diligence_questions.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/40 shrink-0" />
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                  <p className="text-xs text-muted-foreground/60">Full AI risk detail is available after a public-source screen on this target.</p>
              )}
            </div>
          )}

          {/* ── Diligence ── */}
          {activeTab === 'diligence' && (
            <div className="px-5 py-4 space-y-4">
              <ContextActionRow
                actions={[
                  { label: 'Add clients', mode: 'clients' },
                  { label: 'Add financials', mode: 'financials' },
                  { label: 'Add product/AI evidence', mode: 'product_ai' },
                  { label: 'Add note', mode: 'note' },
                ]}
                onAction={mode => onAddEvidence(run, mode)}
              />
              {run.blockers.length > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">
                      Diligence blockers ({run.blockers.length})
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {run.blockers.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/60 shrink-0" />
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60">No blocking gaps identified from public sources.</p>
              )}
              {run.result?.strategic_fit && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Strategic fit</p>
                  </div>
                  {run.result.strategic_fit.why_fits?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-medium text-green-700/80 mb-1.5">Why it fits</p>
                      <div className="space-y-1">
                        {run.result.strategic_fit.why_fits.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-green-400/50 shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {run.result.strategic_fit.why_not?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-medium text-amber-700/80 mb-1.5">Concerns</p>
                      <div className="space-y-1">
                        {run.result.strategic_fit.why_not.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {run.result.strategic_fit.diligence_questions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground/60 mb-1.5">Diligence questions</p>
                      <div className="space-y-1">
                        {run.result.strategic_fit.diligence_questions.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Decisions ── */}
          {activeTab === 'decisions' && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Next action</p>
                <div className="space-y-2">
                  <Link href="/app/run" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium border border-border bg-background hover:bg-accent rounded-md transition-colors text-foreground">
                    Screen company <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/request-pilot" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-md transition-colors text-primary">
                    Request diligence support
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Decision actions</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Monitor',                hint: 'Watch for further evidence' },
                    { label: 'Pass',                   hint: 'Mark as not progressing' },
                    { label: 'Pursue',                 hint: 'Advance to next stage' },
                    { label: 'Prepare Evidence Pack',  hint: 'Compile IC evidence register' },
                  ].map(({ label, hint }) => (
                    <div key={label} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-md border border-border/50 bg-card/40">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground/70">{label}</p>
                        <p className="text-[10px] text-muted-foreground/40">{hint}</p>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Decision log</p>
                <div className="space-y-1">
                  {['Track IC decision', 'Add IC date', 'Add memo note'].map(feat => (
                    <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground/50">
                      <Lock className="w-3 h-3 shrink-0" /> {feat}
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/request-pilot" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                Request pilot access
              </Link>
            </div>
          )}

          {/* ── Exports ── */}
          {activeTab === 'exports' && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Available with pilot access</p>
                <div className="space-y-2">
                  {[
                    { label: 'Markdown report',         hint: 'Structured acquisition screen as plain text' },
                    { label: 'PDF summary',             hint: 'Single-page IC-ready evidence summary' },
                    { label: 'PowerPoint IC pack',      hint: 'Ready-to-present IC slide deck with evidence' },
                    { label: 'Excel diligence tracker', hint: 'Diligence gap register with priority flags' },
                  ].map(({ label, hint }) => (
                    <div key={label} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-border/50 bg-card/40">
                      <div>
                        <p className="text-xs font-medium text-foreground/70">{label}</p>
                        <p className="text-[10px] text-muted-foreground/50">{hint}</p>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/request-pilot" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                Request pilot access
              </Link>
            </div>
          )}

        </div>

        <div className="shrink-0 px-5 py-3 border-t border-border bg-card">
        <p className="text-[10px] text-muted-foreground/50 text-center">
            {run.type === 'compare' ? 'Comparison run · local browser storage' : run.type === 'document' ? 'Document-assisted review · local browser storage' : 'Public-source screen · local browser storage'}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Cockpit display helpers ──────────────────────────────────────────────────

/**
 * Return a short, readable label for a company name in list contexts.
 * Skips a leading "The" / "THE" so we never display a bare "The —" bullet.
 * Examples:
 *   "Example Target Ltd."     → "Example Target"
 *   "The Target Company"      → "Target Company"
 *   "Illustrative Target Co." → "Illustrative Target"
 */
function cockpitShortName(company: string): string {
  const words = company.trim().split(/\s+/);
  // Skip a leading article so we don't show a bare "The"
  const start = words.length > 1 && /^the$/i.test(words[0]) ? 1 : 0;
  // Return up to two words from the meaningful start
  return words.slice(start, start + 2).join(' ') || company.trim();
}

/**
 * Derive the best next-action string for a cockpit row.
 *
 * Priority chain (spec §"Use this priority order"):
 *  1. run.next_action                                         — backend / API
 *  2. First blocking evidence card's action summary           — diligence_blockers[].next_action
 *  3. First blocker field name formatted as an action         — high-severity blocker
 *  4. First unknowns[].next_action                            — unknown evidence gap
 *  5. First strategic fit diligence question                  — strategic gap
 *  6. Fallback: "Review evidence gaps before IC use."
 */
function cockpitNextAction(run: RunEntry): string {
  const UNAVAIL = 'Unavailable in this preview';
  const isUsable = (s: string | undefined) => s && s.trim() && s !== UNAVAIL;
  const isGenericFinancialAction = (s: string | undefined) => {
    const normalised = (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    return normalised === 'request latest accounts, management accounts and arr bridge.'
      || normalised === 'request latest accounts, management accounts and arr bridge';
  };

  // 1. Direct next_action from backend or save function
  const withoutCompanyPrefix = (value: string): string => {
    let output = value.trim();
    const company = run.company.trim();
    const shortName = cockpitShortName(company);
    for (const prefix of [company, shortName]) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(`^(?:${escaped}\\s*:\\s*)+`, 'i'), '');
    }
    return output.trim();
  };

  if (isUsable(run.next_action) && !isGenericFinancialAction(run.next_action)) return withoutCompanyPrefix(run.next_action);

  // 2. First blocking evidence card summary (diligence_blockers[].next_action)
  const blockingCard = run.result?.evidence_cards?.find(c => c.status === 'blocking');
  if (blockingCard && isUsable(blockingCard.summary)) return withoutCompanyPrefix(blockingCard.summary);

  // 3. First blocker field formatted as a targeted action (high-severity blocker)
  if (run.blockers && run.blockers.length > 0) {
    return `${run.blockers[0]}. Verify before IC use.`;
  }

  // 4. First unknowns[].next_action — unknown evidence gap
  const unknowns = (run.result as unknown as Record<string, unknown> | undefined)?.unknowns;
  if (Array.isArray(unknowns) && unknowns.length > 0) {
    const firstUnknown = unknowns[0] as Record<string, unknown> | null;
    const unk = firstUnknown?.next_action as string | undefined;
    if (isUsable(unk)) return withoutCompanyPrefix(unk!);
  }

  // 5. Strategic fit diligence question
  const sfq = run.result?.strategic_fit?.diligence_questions;
  if (Array.isArray(sfq) && sfq.length > 0 && isUsable(sfq[0])) return withoutCompanyPrefix(sfq[0]);

  if (isGenericFinancialAction(run.next_action)) {
    return 'Request management accounts, ARR bridge and customer schedule.';
  }

  // 6. Generic fallback
  return 'Review evidence gaps before IC use.';
}

function cockpitDisplayDomain(value: string): { domain: string; full: string } | null {
  const full = normalizeRunWebsite(value);
  if (!full) return null;
  try {
    const parsed = new URL(full);
    if (/^(?:www\.)?google\./i.test(parsed.hostname) && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) {
        const resolved = new URL(target);
        return { domain: resolved.hostname.replace(/^www\./, ''), full: resolved.href };
      }
    }
    return { domain: parsed.hostname.replace(/^www\./, ''), full: parsed.href };
  } catch {
    return { domain: value.replace(/^https?:\/\//i, '').split('/')[0], full: value };
  }
}

const editModeTitle: Record<CockpitEditMode, string> = {
  target: 'Edit target',
  website: 'Add website',
  evidence: 'Add evidence',
  financials: 'Add financials',
  clients: 'Add clients',
  team: 'Add team size',
  product_ai: 'Add product / AI evidence',
  note: 'Add note',
};

function CockpitEditSheet({
  run,
  mode,
  open,
  onOpenChange,
  onSaved,
}: {
  run: RunEntry | null;
  mode: CockpitEditMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (run: RunEntry, message: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [jurisdiction, setJurisdiction] = useState('UK');
  const [sector, setSector] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [allowSourceOverride, setAllowSourceOverride] = useState(false);
  const [error, setError] = useState('');
  const [activeEvidenceSection, setActiveEvidenceSection] = useState<CockpitEditMode>('financials');

  const [revenue, setRevenue] = useState('');
  const [arr, setArr] = useState('');
  const [ebitda, setEbitda] = useState('');
  const [grossMargin, setGrossMargin] = useState('');
  const [period, setPeriod] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [financialSourceType, setFinancialSourceType] = useState('Management accounts');
  const [financialReference, setFinancialReference] = useState('');
  const [financialNote, setFinancialNote] = useState('');

  const [clientNames, setClientNames] = useState('');
  const [customerConcentration, setCustomerConcentration] = useState('');
  const [retentionChurn, setRetentionChurn] = useState('');
  const [clientSource, setClientSource] = useState('');

  const [teamSize, setTeamSize] = useState('');
  const [teamSourceType, setTeamSourceType] = useState('LinkedIn');
  const [teamSource, setTeamSource] = useState('');

  const [productSummary, setProductSummary] = useState('');
  const [aiFeatures, setAiFeatures] = useState('');
  const [defensibilityNotes, setDefensibilityNotes] = useState('');
  const [productSource, setProductSource] = useState('');

  useEffect(() => {
    if (!run || !open) return;
    const resultRecord = asRecord(run.result);
    const evidence = asRecord(resultRecord.user_supplied_evidence);
    const targetEdits = asRecord(evidence.target_edits);
    const financials = asRecord(evidence.user_supplied_financials);
    const clients = asRecord(evidence.user_supplied_clients);
    const team = asRecord(evidence.team_size_signal);
    const product = asRecord(evidence.product_signal);
    const ai = asRecord(evidence.ai_signal);
    const note = asRecord(evidence.note);

    setCompany(textValue(targetEdits.company_name, run.company));
    setWebsite(textValue(targetEdits.website, run.website));
    setJurisdiction(textValue(targetEdits.jurisdiction, 'UK'));
    setSector(textValue(targetEdits.sector, run.strategic_fit_label));
    setSourceLabel(textValue(targetEdits.source_label, sourceTypeLabel(run.type)));
    setNotes(textValue(targetEdits.notes ?? note.note, ''));
    setSourceNote('');
    setAllowSourceOverride(false);
    setError('');
    setActiveEvidenceSection(mode === 'evidence' ? 'financials' : mode);

    setRevenue(textValue(financials.revenue, ''));
    setArr(textValue(financials.arr, ''));
    setEbitda(textValue(financials.ebitda, ''));
    setGrossMargin(textValue(financials.gross_margin, ''));
    setPeriod(textValue(financials.period, ''));
    setCurrency(textValue(financials.currency, 'GBP'));
    setFinancialSourceType(textValue(financials.source_type, 'Management accounts'));
    setFinancialReference(textValue(financials.source_reference, ''));
    setFinancialNote(textValue(financials.note, ''));

    setClientNames(textValue(clients.client_names, ''));
    setCustomerConcentration(textValue(clients.customer_concentration_note, ''));
    setRetentionChurn(textValue(clients.retention_churn_note, ''));
    setClientSource(textValue(clients.source_note, ''));

    setTeamSize(textValue(team.team_size, ''));
    setTeamSourceType(textValue(team.source_type, 'LinkedIn'));
    setTeamSource(textValue(team.source_note, ''));

    setProductSummary(textValue(product.product_summary, ''));
    setAiFeatures(textValue(ai.ai_features, ''));
    setDefensibilityNotes(textValue(product.defensibility_notes, ''));
    setProductSource(textValue(product.source_note ?? ai.source_note, ''));
  }, [run, open]);

  if (!run) return null;

  const activeMode = mode === 'evidence' ? activeEvidenceSection : mode;
  const sourcePageWarning = website.trim() && looksLikeSourcePageUrl(website);

  const patchRun = (patch: Partial<RunEntry>, evidencePatch?: Record<string, unknown>, message = 'Target updated') => {
    const currentEvidence = cockpitUserEvidence(run);
    const nextResult = {
      ...asRecord(run.result),
      user_supplied_evidence: {
        ...currentEvidence,
        ...(evidencePatch ?? {}),
        updated_at: new Date().toISOString(),
      },
    } as unknown as RunEntry['result'];
    const nextRun: RunEntry = {
      ...run,
      ...patch,
      result: nextResult,
    };
    updateRunEntry(run.id, patch.result === null ? patch : { ...patch, result: nextResult });
    onSaved(nextRun, message);
  };

  const saveTarget = () => {
    const normalizedWebsite = normalizeWebsiteUrl(website);
    if ((activeMode === 'website' || normalizedWebsite) && normalizedWebsite && !/^https?:\/\/[^.\s]+\.[^\s]+/i.test(normalizedWebsite)) {
      setError('Enter a valid company website URL.');
      return;
    }
    if (sourcePageWarning && !allowSourceOverride) {
      setError('Confirm this is the official company website before saving.');
      return;
    }
    const patch = {
      company_name: company,
      website: normalizedWebsite,
      jurisdiction,
      sector,
      source_label: sourceLabel,
      notes,
      website_status: normalizedWebsite ? 'user_confirmed' : 'missing',
      run_ready: Boolean(normalizedWebsite),
      candidate_quality: normalizedWebsite ? 'ready_to_screen' : 'needs_website_confirmation',
      next_action: normalizedWebsite ? 'Screen company' : 'Add website',
      workflow_state: {
        recommended_next_step: normalizedWebsite ? 'run_screen' : 'request_evidence',
        compare_readiness: normalizedWebsite ? 'ready' : 'missing_website',
      },
    };
    updateWorkflowTarget(cockpitTargetMatcher(run), patch);
    patchRun(
      {
        company,
        website: normalizedWebsite,
        strategic_fit_label: sector,
        next_action: normalizedWebsite ? 'Screen company' : run.next_action,
      },
      {
        target_edits: {
          company_name: company,
          website: normalizedWebsite,
          jurisdiction,
          sector,
          source_label: sourceLabel,
          notes,
          source_note: sourceNote,
          evidence_status: normalizedWebsite ? 'user_supplied_claim' : 'unknown',
        },
      },
      normalizedWebsite ? 'Website saved. Ready to screen.' : 'Target updated',
    );
    onOpenChange(false);
  };

  const saveEvidence = () => {
    let evidencePatch: Record<string, unknown> = {};
    if (activeMode === 'financials') {
      evidencePatch = {
        user_supplied_financials: {
          revenue,
          arr,
          ebitda,
          gross_margin: grossMargin,
          period,
          currency,
          source_type: financialSourceType,
          source_reference: financialReference,
          note: financialNote,
          evidence_status: financialReference ? 'source_backed_unverified' : 'user_supplied_claim',
        },
        evidence_confidence: 'User-supplied claim',
      };
    } else if (activeMode === 'clients') {
      evidencePatch = {
        user_supplied_clients: {
          client_names: clientNames,
          customer_concentration_note: customerConcentration,
          retention_churn_note: retentionChurn,
          source_note: clientSource,
          evidence_status: clientSource ? 'source_backed_unverified' : 'user_supplied_claim',
        },
      };
    } else if (activeMode === 'team') {
      evidencePatch = {
        team_size_signal: {
          team_size: teamSize,
          source_type: teamSourceType,
          source_note: teamSource,
          evidence_status: teamSource ? 'source_backed_unverified' : 'user_supplied_claim',
        },
      };
    } else if (activeMode === 'product_ai') {
      evidencePatch = {
        product_signal: {
          product_summary: productSummary,
          defensibility_notes: defensibilityNotes,
          source_note: productSource,
          evidence_status: productSource ? 'source_backed_unverified' : 'user_supplied_claim',
        },
        ai_signal: {
          ai_features: aiFeatures,
          source_note: productSource,
          evidence_status: productSource ? 'source_backed_unverified' : 'user_supplied_claim',
        },
      };
    } else if (activeMode === 'note') {
      evidencePatch = {
        note: {
          note: notes,
          source_note: sourceNote,
          evidence_status: 'user_supplied_claim',
        },
      };
    }

    addUserSuppliedEvidence(cockpitTargetMatcher(run), evidencePatch);
    patchRun({}, evidencePatch, 'Target updated');
    onOpenChange(false);
  };

  const save = activeMode === 'target' || activeMode === 'website' ? saveTarget : saveEvidence;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{activeMode === 'website' ? 'Confirm official website' : editModeTitle[mode]}</SheetTitle>
          <SheetDescription>
            Edits are saved locally and treated as user-supplied claims unless independently verified by a later screen.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {mode === 'evidence' && (
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">Evidence section</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([
                  ['website', 'Website'],
                  ['financials', 'Financials'],
                  ['clients', 'Clients'],
                  ['team', 'Team size'],
                  ['product_ai', 'Product / AI'],
                  ['note', 'Notes'],
                ] as [CockpitEditMode, string][]).map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveEvidenceSection(section)}
                    className={cn(
                      'inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors',
                      activeEvidenceSection === section
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeMode === 'target' || activeMode === 'website') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cockpit-company">Company name</Label>
                <Input id="cockpit-company" value={company} onChange={event => setCompany(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cockpit-website">Website URL</Label>
                <Input
                  id="cockpit-website"
                  value={website}
                  onChange={event => { setWebsite(event.target.value); setError(''); }}
                  onBlur={() => website.trim() && setWebsite(normalizeWebsiteUrl(website))}
                  placeholder="https://company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cockpit-jurisdiction">Jurisdiction</Label>
                <Input id="cockpit-jurisdiction" value={jurisdiction} onChange={event => setJurisdiction(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cockpit-sector">Sector / vertical</Label>
                <Input id="cockpit-sector" value={sector} onChange={event => setSector(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cockpit-source-label">Source label</Label>
                <Input id="cockpit-source-label" value={sourceLabel} onChange={event => setSourceLabel(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cockpit-notes">Notes</Label>
                <Textarea id="cockpit-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} />
              </div>
              {activeMode === 'website' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cockpit-source-note">Source note</Label>
                  <Input id="cockpit-source-note" value={sourceNote} onChange={event => setSourceNote(event.target.value)} placeholder="Where did the website confirmation come from?" />
                </div>
              )}
            </div>
          )}

          {activeMode === 'financials' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup id="financial-revenue" label="Revenue" value={revenue} onChange={setRevenue} />
              <InputGroup id="financial-arr" label="ARR" value={arr} onChange={setArr} />
              <InputGroup id="financial-ebitda" label="EBITDA" value={ebitda} onChange={setEbitda} />
              <InputGroup id="financial-margin" label="Gross margin" value={grossMargin} onChange={setGrossMargin} />
              <InputGroup id="financial-period" label="Period / year" value={period} onChange={setPeriod} />
              <InputGroup id="financial-currency" label="Currency" value={currency} onChange={setCurrency} />
              <InputGroup id="financial-source-type" label="Source type" value={financialSourceType} onChange={setFinancialSourceType} placeholder="Management accounts, public filing, data room, user estimate, other" className="sm:col-span-2" />
              <InputGroup id="financial-reference" label="Source URL / document reference" value={financialReference} onChange={setFinancialReference} className="sm:col-span-2" />
              <TextAreaGroup id="financial-note" label="Note" value={financialNote} onChange={setFinancialNote} className="sm:col-span-2" />
            </div>
          )}

          {activeMode === 'clients' && (
            <div className="space-y-4">
              <TextAreaGroup id="client-names" label="Client names" value={clientNames} onChange={setClientNames} />
              <TextAreaGroup id="client-concentration" label="Customer concentration note" value={customerConcentration} onChange={setCustomerConcentration} />
              <TextAreaGroup id="client-retention" label="Retention / churn note" value={retentionChurn} onChange={setRetentionChurn} />
              <InputGroup id="client-source" label="Source URL / note" value={clientSource} onChange={setClientSource} />
            </div>
          )}

          {activeMode === 'team' && (
            <div className="space-y-4">
              <InputGroup id="team-size" label="Team size / range" value={teamSize} onChange={setTeamSize} />
              <InputGroup id="team-source-type" label="Source type" value={teamSourceType} onChange={setTeamSourceType} placeholder="LinkedIn, company website, user estimate, other" />
              <InputGroup id="team-source" label="Source URL / note" value={teamSource} onChange={setTeamSource} />
            </div>
          )}

          {activeMode === 'product_ai' && (
            <div className="space-y-4">
              <TextAreaGroup id="product-summary" label="Product summary" value={productSummary} onChange={setProductSummary} />
              <TextAreaGroup id="ai-features" label="AI features / AI usage" value={aiFeatures} onChange={setAiFeatures} />
              <TextAreaGroup id="defensibility" label="Defensibility notes" value={defensibilityNotes} onChange={setDefensibilityNotes} />
              <InputGroup id="product-source" label="Source URL / note" value={productSource} onChange={setProductSource} />
            </div>
          )}

          {activeMode === 'note' && (
            <div className="space-y-4">
              <TextAreaGroup id="cockpit-note" label="Note" value={notes} onChange={setNotes} />
              <InputGroup id="cockpit-note-source" label="Source note" value={sourceNote} onChange={setSourceNote} />
            </div>
          )}

          {sourcePageWarning && (
            <div className="rounded-lg border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--semantic-claim-text)]">This looks like a source page, not an official company website.</p>
              <label className="mt-2 flex items-start gap-2 text-xs text-[var(--semantic-claim-text)]">
                <input type="checkbox" checked={allowSourceOverride} onChange={event => setAllowSourceOverride(event.currentTarget.checked)} className="mt-0.5" />
                <span>I confirm this is the official company website or a company product page.</span>
              </label>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-[var(--semantic-blocker-border)] bg-[var(--semantic-blocker-bg)] px-3 py-2 text-xs font-medium text-[var(--semantic-blocker-text)]">
              {error}
            </p>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save}>{activeMode === 'website' ? 'Save website' : 'Save changes'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InputGroup({ id, label, value, onChange, placeholder = '', className = '' }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaGroup({ id, label, value, onChange, className = '' }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={3} />
    </div>
  );
}

function SavedRunCard({
  run,
  active,
  onSelect,
  selected = false,
  selectionDisabledReason = '',
  onToggleCompare,
  onEdit,
  onAddEvidence,
  onRemove,
  compact = false,
}: {
  run: RunEntry;
  active: boolean;
  onSelect: () => void;
  selected?: boolean;
  selectionDisabledReason?: string;
  onToggleCompare?: () => void;
  onEdit?: (mode: CockpitEditMode) => void;
  onAddEvidence?: (mode: CockpitEditMode) => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const blocker = mainBlocker(run);
  const icReadiness = displayText(run.ic_readiness);
  const confidence = displayText(run.evidence_confidence);
  const derivedNextAction = cockpitNextAction(run);
  const canSelectForCompare = Boolean(onToggleCompare) && !selectionDisabledReason;
  const missingWebsite = !displayText(run.website);
  const missingFinancials = !hasFinancialEvidence(run);
  const website = cockpitDisplayDomain(run.website);
  const isOriginationSignal = run.type === 'origination';
  const isCompareCandidate = run.type === 'compare';
  const isScreenedTarget = !isOriginationSignal && !isCompareCandidate;
  const nextAction = isOriginationSignal && missingWebsite
    ? 'Verify the official company website.'
    : isCompareCandidate
      ? 'Run an individual company screen before comparison.'
      : derivedNextAction;
  const dateLabel = isOriginationSignal ? 'Discovered' : isCompareCandidate ? 'Imported' : 'Screened';
  const cardVariant = isOriginationSignal ? 'origination-signal' : isCompareCandidate ? 'individual-screen' : 'screened-target';
  const primaryState = isOriginationSignal
    ? 'Signal only'
    : isCompareCandidate
      ? 'Individual screen required'
      : runRecommendation(run);
  const primaryTone: RecommendationLevel = isOriginationSignal || isCompareCandidate
    ? 'grey'
    : safeLevel(run.recommendation_level);

  const compactButtonClass = 'h-9 rounded-md px-3 text-sm leading-5';

  return (
    <div
      data-testid="cockpit-target-card"
      data-card-variant={cardVariant}
      className={cn(
        'surface-raised w-full min-w-0 text-left rounded-lg p-3 transition-colors',
        active ? 'surface-selected' : '',
      )}
    >
      <div className="flex min-w-0 flex-col gap-2.5">
        <header className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            {!compact && onToggleCompare && isScreenedTarget && (
              <div className="flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={!canSelectForCompare}
                  onChange={onToggleCompare}
                  aria-label={`Select ${run.company} for compare`}
                  className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>
            )}
            <button type="button" onClick={onSelect} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
              <span className="block truncate text-base font-semibold leading-5 text-foreground hover:text-primary">{run.company}</span>
            </button>
            {chip(primaryTone, primaryState)}
            {run.blockers.length > 0 && (
              <span className="inline-flex shrink-0 items-center rounded border border-[var(--semantic-blocker-border)] bg-[var(--semantic-blocker-bg)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--semantic-blocker-text)]">
                {run.blockers.length} blocker{run.blockers.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {website && (
              <span className="max-w-[16rem] truncate" title={website.full} aria-label={`Website: ${website.full}`}>{website.domain}</span>
            )}
            <span>{sourceTypeLabel(run.type)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {dateLabel} {formatTs(run.timestamp)}</span>
            {confidence && <span>Confidence: <strong className="font-medium text-foreground">{confidence}</strong></span>}
          </div>
        </header>

        {isScreenedTarget && (icReadiness || confidence || blocker) && (
          <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1.5 border-y border-border/70 py-2 sm:grid-cols-3">
            <div className="min-w-0"><dt className="text-[11px] text-muted-foreground">IC readiness</dt><dd className="truncate text-sm font-medium text-foreground" title={icReadiness || 'Not assessed'}>{icReadiness || 'Not assessed'}</dd></div>
            <div className="min-w-0"><dt className="text-[11px] text-muted-foreground">Evidence confidence</dt><dd className="truncate text-sm font-medium text-foreground">{confidence || 'Not scored'}</dd></div>
            <div className="min-w-0"><dt className="text-[11px] text-muted-foreground">Main blocker</dt><dd className="truncate text-sm font-medium text-foreground" title={blocker || 'No recorded blocker'}>{blocker || 'No recorded blocker'}</dd></div>
          </dl>
        )}

        <div className="flex min-w-0 items-start justify-between gap-2 border-b border-border/70 pb-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-primary">Next action</p>
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground" title={nextAction} data-testid="next-action">{nextAction}</p>
          </div>
          <button type="button" onClick={onSelect} className="mt-1 shrink-0 rounded-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`View full details for ${run.company}`}>
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2" data-testid="primary-actions">
          {isOriginationSignal && missingWebsite && onEdit && (
            <Button type="button" onClick={() => onEdit('website')} className={compactButtonClass}>Add website</Button>
          )}
          <Button type="button" variant="outline" onClick={onSelect} className={compactButtonClass}>View</Button>
          {isCompareCandidate && (
            <Button asChild className={compactButtonClass}><Link href={runScreenHref(run)}>Individual screen</Link></Button>
          )}
          {isScreenedTarget && !missingWebsite && missingFinancials && onAddEvidence && (
            <Button type="button" onClick={() => onAddEvidence('financials')} className={compactButtonClass}>Add financials</Button>
          )}
          {isScreenedTarget && !missingWebsite && !missingFinancials && onAddEvidence && (
            <Button type="button" variant="outline" onClick={() => onAddEvidence('evidence')} className={compactButtonClass}>Add evidence</Button>
          )}
          {isScreenedTarget && onToggleCompare && canSelectForCompare && (
            <Button type="button" variant="outline" onClick={onToggleCompare} className={compactButtonClass}>{selected ? 'In Compare' : 'Send to Compare'}</Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className={cn(compactButtonClass, 'ml-auto')} aria-label={`More actions for ${run.company}`}>
                <MoreHorizontal className="size-4" /> <span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={8} className="w-48">
              {onEdit && <DropdownMenuItem onSelect={() => onEdit('target')}>Edit</DropdownMenuItem>}
              {!missingWebsite && onEdit && <DropdownMenuItem onSelect={() => onEdit('website')}>Edit website</DropdownMenuItem>}
              {isOriginationSignal && onAddEvidence && <DropdownMenuItem onSelect={() => onAddEvidence('evidence')}>Add evidence</DropdownMenuItem>}
              {isScreenedTarget && <DropdownMenuItem asChild><Link href={runScreenHref(run)}>Re-screen</Link></DropdownMenuItem>}
              {onRemove && <DropdownMenuSeparator />}
              {onRemove && <DropdownMenuItem onSelect={onRemove} className="text-destructive focus:text-destructive"><Trash2 className="size-4" />Remove target</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealCockpitPage() {
  const { isLoaded, isSignedIn } = useOptionalUser();
  const [, navigate] = useLocation();

  // ── Screen history ──
  // Lazy initializer: reads localStorage synchronously on first render so
  // hasRealRuns is correct before the first paint — avoids a flash of the
  // empty state when the user already has saved runs.
  const [runs, setRuns] = useState<RunEntry[]>(() => getRuns());
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedCompareIds, setSelectedCompareIds] = useState<Set<string>>(() => readCockpitCompareSelectionIds());
  const [editRun, setEditRun] = useState<RunEntry | null>(null);
  const [editMode, setEditMode] = useState<CockpitEditMode>('target');
  const [statusMessage, setStatusMessage] = useState('');

  // ── Backend run loading ──
  // When workspace_id is available, merge backend runs with localStorage runs.
  // Backend wins on dedupe (same company name). Falls back to localStorage
  // silently if the backend returns an error or 404.
  useEffect(() => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) return;
    getCockpitRuns(workspaceId).then(records => {
      if (!records.length) return;
      const backendRuns: RunEntry[] = records.map((r: CockpitRunRecord) => ({
        id:                  r.run_id,
        type:                r.type ?? (r.run_type === 'compare' ? 'compare' : r.run_type === 'document_review' ? 'document' : 'url'),
        timestamp:           r.timestamp ?? r.created_at ?? new Date().toISOString(),
        company:             r.company ?? r.company_name ?? 'Unknown target',
        website:             r.website ?? '',
        recommendation:      r.recommendation,
        recommendation_level: r.recommendation_level,
        ic_readiness:        r.ic_readiness,
        valuation_readiness: r.valuation_readiness ?? '',
        strategic_fit_label: r.strategic_fit_label ?? '',
        evidence_confidence: r.evidence_confidence,
        ai_replica_risk:     r.ai_replica_risk,
        blockers:            r.blockers ?? [],
        next_action:         r.next_action,
        result:              (r.result_payload && typeof r.result_payload === 'object') ? r.result_payload as RunEntry['result'] : null,
      }));
      // Merge: backend entries win; localStorage entries fill gaps
      const backendNames = new Set(backendRuns.map(r => r.company));
      const localOnly = getRuns().filter(r => !backendNames.has(r.company));
      setRuns([...backendRuns, ...localOnly]);
    });
  }, []);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const hasRealRuns = runs.length > 0;
  const targetRuns = dedupeTargetRuns(runs.filter(r => r.type !== 'compare'));
  const comparisonRuns = runs.filter(r => r.type === 'compare');
  const filteredRuns = applyFilter(targetRuns, activeFilter);
  const filteredComparisons = applyFilter(comparisonRuns, activeFilter);
  const activeRun = runs.find(r => r.id === activeRunId) ?? null;
  const selectedCompareRuns = targetRuns.filter(run => selectedCompareIds.has(run.id) && !compareDisabledReason(run)).slice(0, 5);
  const selectedCompareCandidates = selectedCompareRuns.map(cockpitCandidateFromRun);
  const compareButtonLabel = selectedCompareCandidates.length === 0
    ? 'Select screened targets to compare'
    : selectedCompareCandidates.length === 1
      ? 'Select one more target'
      : 'Compare selected screened targets';

  function persistCockpitSelection(ids: Set<string>, sourceRuns = targetRuns): void {
    const candidates = sourceRuns
      .filter(run => ids.has(run.id) && !compareDisabledReason(run))
      .slice(0, 5)
      .map(cockpitCandidateFromRun);
    writeCockpitCompareSelection(candidates);
  }

  function toggleCompareSelection(run: RunEntry): void {
    if (compareDisabledReason(run)) return;
    setSelectedCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(run.id)) next.delete(run.id);
      else if (selectedCompareRuns.length < 5) next.add(run.id);
      persistCockpitSelection(next);
      return next;
    });
  }

  function handleCompareSelected(): void {
    const candidates = selectedCompareCandidates;
    if (candidates.length < 2) return;
    saveCompareCandidates(candidates);
    writeCockpitCompareSelection(candidates);
    navigate('/app/compare');
  }

  function handleRemoveRun(runId: string): void {
    const nextSelected = new Set(selectedCompareIds);
    nextSelected.delete(runId);
    setSelectedCompareIds(nextSelected);
    persistCockpitSelection(nextSelected, targetRuns.filter(run => run.id !== runId));
    removeRun(runId);
    setRuns(prev => prev.filter(run => run.id !== runId));
    setActiveRunId(prev => prev === runId ? null : prev);
  }

  function openEditSheet(run: RunEntry, mode: CockpitEditMode): void {
    setEditRun(run);
    setEditMode(mode);
    setStatusMessage('');
  }

  function handleEditSaved(updatedRun: RunEntry, message: string): void {
    setRuns(prev => prev.map(run => run.id === updatedRun.id ? updatedRun : run));
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3200);
  }

  // ── Summary stats from real runs ──
  const stats = {
    total: runs.length,
    financials: runs.filter(r => r.recommendation === 'Request Financials').length,
    highAiRisk: runs.filter(r => r.ai_replica_risk === 'High' || r.ai_replica_risk === 'Medium-high').length,
    blockers: runs.reduce((acc, r) => acc + r.blockers.length, 0),
    compared: runs.filter(r => r.type === 'compare').length,
  };

  return (
    <div className="app-container flex-1 flex flex-col py-6 md:py-8">

      {/* ── Header ── */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-primary mb-2">Deal pipeline</p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Deal pipeline</h1>
            <p className="text-base text-muted-foreground">
              {hasRealRuns
                ? 'Your screened targets: track recommendation, evidence confidence, blockers and next action.'
                : 'Track screened targets, compare evidence quality and turn gaps into next actions.'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Public-source screens are decision support. Financials and document evidence must be verified before IC or client use.
            </p>
          </div>
          <Link
            href="/app/run"
            className="inline-flex items-center gap-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 rounded-md transition-colors text-foreground shrink-0"
          >
            Screen another company
          </Link>
        </div>
      </div>

      <details className="mb-3 rounded-md border border-border/70 bg-card/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">How the screening workflow works</summary>
        <ScreeningWorkflowGuide active="cockpit" className="mt-3" />
      </details>

      <div className="mb-4 rounded-lg border border-border/80 bg-card/80 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
        <div>
          <p className="text-sm font-semibold text-foreground">Cockpit keeps screened targets.</p>
          <p className="text-xs text-muted-foreground">
            Select two or more saved screens to compare evidence side by side.
          </p>
          {selectedCompareCandidates.length > 0 && (
            <p className="mt-2 text-xs font-medium text-primary">
              {selectedCompareCandidates.length} selected for compare
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/run"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            Back to Screen
          </Link>
          <button
            type="button"
            onClick={handleCompareSelected}
            disabled={selectedCompareCandidates.length < 2}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
              selectedCompareCandidates.length >= 2
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-70',
            )}
          >
            {compareButtonLabel}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-6 rounded-lg border border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)] px-4 py-3 text-sm font-medium text-[var(--semantic-verified-text)]">
          {statusMessage}
        </div>
      )}

      {/* ── Account state banner (no workspace) ── */}
      {isLoaded && !isSignedIn && (
        <div className="mb-6 rounded-lg border border-border bg-card/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-0.5">Runs are saved locally in this browser.</p>
            <p className="text-xs text-muted-foreground">Create a workspace to save runs and access the full pipeline.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/create-workspace"
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors whitespace-nowrap"
            >
              Create workspace
            </Link>
            <Link href="/request-pilot" className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border border-border bg-background hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground whitespace-nowrap">
              Request pilot
            </Link>
          </div>
        </div>
      )}

      {/* ── Summary strip ── */}
      {hasRealRuns ? (
        <dl className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-5">
          {[
            { label: 'Runs saved',        value: stats.total,      level: 'grey' as RecommendationLevel },
            { label: 'Financial evidence needed', value: stats.financials, level: 'amber' as RecommendationLevel },
            { label: 'High AI risk',       value: stats.highAiRisk, level: 'red' as RecommendationLevel },
            { label: 'Evidence blockers',  value: stats.blockers,   level: 'amber' as RecommendationLevel },
            { label: 'Compared targets',   value: stats.compared,   level: 'blue' as RecommendationLevel },
          ].map(({ label, value }) => (
            <div key={label} className="flex min-w-0 items-baseline gap-2 border-b border-r border-border/70 px-3 py-2 last:border-r-0 sm:border-b-0">
              <dd className="text-lg font-bold text-foreground">{value}</dd>
              <dt className="truncate text-xs text-muted-foreground" title={label}>{label}</dt>
            </div>
          ))}
        </dl>
      ) : (
        // Greyed-out placeholder — shown while loading or when no saved runs yet
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 opacity-30 pointer-events-none select-none">
          {[
            { label: 'Runs saved', value: '0', level: 'grey' },
            { label: 'Financial evidence needed', value: '0', level: 'grey' },
            { label: 'High AI risk', value: '0', level: 'red' },
            { label: 'Evidence blockers', value: '0', level: 'grey' },
          ].map(({ label, value, level }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {chip(level as RecommendationLevel, label)}
            </div>
          ))}
        </div>
      )}

      {/* ─────────────── REAL RUNS PATH ─────────────── */}
      {hasRealRuns && (
        <>
          {/* Priority next actions — shown for all real runs, deduplicated by company */}
          {(() => {
            // Deduplicate by normalized company name — strip leading article so
            // "The X Ltd" and "X Ltd" collapse to the same key (newest-first wins)
            const seen = new Set<string>();
            const deduped = targetRuns.filter(r => {
              const key = r.company.trim().toLowerCase().replace(/^the\s+/i, '');
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }).slice(0, 3);
            return (
              <details className="mb-4 rounded-lg border border-card-border bg-card px-3 py-2.5 shadow-xs">
                <summary className="cursor-pointer text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Priority next actions ({deduped.length})</summary>
                <div className="mt-3 space-y-2">
                  {deduped.map(r => (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{cockpitShortName(r.company)}: </span>
                        <span className="text-sm text-muted-foreground">{cockpitNextAction(r)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })()}

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-card/40 p-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                  activeFilter === key
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent/40',
                )}
              >
                {label}
                {key === 'all' && ` (${runs.length})`}
                {key === 'financials' && stats.financials > 0 && ` (${stats.financials})`}
                {key === 'high-ai-risk' && stats.highAiRisk > 0 && ` (${stats.highAiRisk})`}
                {key === 'evidence-gaps' && stats.blockers > 0 && ` (${stats.blockers})`}
              </button>
            ))}
          </div>

          {/* Main layout: saved-run cards + detail panel */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className={cn('flex-1 min-w-0', activeRun ? 'lg:max-w-[calc(100%-22rem-1.5rem)]' : '')}>
              <div className="space-y-3">
                {filteredRuns.length === 0 && filteredComparisons.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
                    No saved runs match this filter.
                  </div>
                ) : filteredRuns.length > 0 ? (
                  filteredRuns.map((run) => (
                    <SavedRunCard
                      key={run.id}
                      run={run}
                      active={activeRunId === run.id}
                      onSelect={() => setActiveRunId(prev => prev === run.id ? null : run.id)}
                      selected={selectedCompareIds.has(run.id)}
                      selectionDisabledReason={
                        selectedCompareIds.has(run.id)
                          ? compareDisabledReason(run)
                          : selectedCompareCandidates.length >= 5
                            ? 'Limit 5 targets'
                            : compareDisabledReason(run)
                      }
                      onToggleCompare={() => toggleCompareSelection(run)}
                      onEdit={mode => openEditSheet(run, mode)}
                      onAddEvidence={mode => openEditSheet(run, mode)}
                      onRemove={() => handleRemoveRun(run.id)}
                    />
                  ))
                ) : null}
              </div>

              {filteredComparisons.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <GitCompare className="w-3.5 h-3.5 text-blue-700" />
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">
                      Comparisons ({filteredComparisons.length})
                    </p>
                  </div>
                  <div className="space-y-3">
                    {filteredComparisons.map((run) => (
                      <SavedRunCard
                        key={run.id}
                        run={run}
                        active={activeRunId === run.id}
                        onSelect={() => setActiveRunId(prev => prev === run.id ? null : run.id)}
                        onEdit={mode => openEditSheet(run, mode)}
                        onAddEvidence={mode => openEditSheet(run, mode)}
                        onRemove={() => handleRemoveRun(run.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom CTAs */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/app/run" className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                  Screen another company <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a href={BOOK_INTRO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                  Book 30-min intro
                </a>
              </div>
            </div>

            {/* Detail panel */}
            {activeRun && (
              <>
                {/* Mobile overlay */}
                {typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches && (
                  <RunDetailPanel
                    run={activeRun}
                    onClose={() => setActiveRunId(null)}
                    onEdit={openEditSheet}
                    onAddEvidence={openEditSheet}
                  />
                )}
                {/* Desktop inline */}
                <div className="hidden lg:flex flex-col w-96 shrink-0">
                  <RunDetailPanel
                    run={activeRun}
                    onClose={() => setActiveRunId(null)}
                    onEdit={openEditSheet}
                    onAddEvidence={openEditSheet}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ─────────────── LOADING SKELETON ─────────────── */}
      {!isLoaded && !hasRealRuns && (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-14 rounded-lg bg-card/50 border border-border" />
          <div className="h-32 rounded-lg bg-card/30 border border-border" />
        </div>
      )}

      {/* ─────────────── NO RUNS PATH (both signed-in and signed-out) ─────────── */}
      {isLoaded && !hasRealRuns && (
        <>
          {/* ── 1. Empty state — always first ── */}
          <div className="flex flex-col items-center justify-center py-12 gap-5 text-center rounded-lg border border-border bg-card/30 mb-6">
            <div>
              <p className="text-base font-semibold text-foreground mb-1">No screened targets saved yet.</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Screen a company URL and save it to Cockpit before comparing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/app/run" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md transition-colors">
                Back to Screen <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground">
                View pricing
              </Link>
            </div>
          </div>

          {/* ── 2. Local-storage notice (signed-out only) ── */}
          {!isSignedIn && (
            <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground px-4 py-3 rounded-lg border border-border bg-card/30">
              <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
              <span>
                Deal pipeline is stored locally in this browser.{' '}
                <Link href="/create-workspace" className="text-primary hover:underline transition-colors">Create a workspace</Link>
                {' '}to save across devices.
              </span>
            </div>
          )}

        </>
      )}

      {/* Feedback CTA */}
      <div className="mt-10 py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground mb-0.5">Share product feedback.</p>
          <p className="text-xs text-muted-foreground">Takes 3 minutes and helps prioritise diligence workflow improvements.</p>
        </div>
        <SendFeedbackButton
          label="Send feedback"
          className="text-sm font-medium border border-border hover:border-primary/40 h-9 px-5 rounded-md hover:bg-accent/30 shrink-0"
        />
      </div>

      <BetaCTA
        title="Want to evaluate this on your own pipeline?"
        body="Request pilot access or book a 30-minute intro to discuss acquisition screening, evidence confidence and IC workflow."
        primaryLabel="Request pilot access"
        primaryHref="/request-pilot"
        secondaryLabel=""
        secondaryHref=""
        eventName="deal_cockpit_bottom"
      />
      <CockpitEditSheet
        run={editRun}
        mode={editMode}
        open={Boolean(editRun)}
        onOpenChange={open => { if (!open) setEditRun(null); }}
        onSaved={handleEditSaved}
      />
    </div>
  );
}

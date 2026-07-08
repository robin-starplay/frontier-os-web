import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { BetaCTA } from '@/components/BetaCTA';
import { SendFeedbackButton } from '@/components/SendFeedbackButton';
import {
  GitCompare, Clock, ChevronRight, X,
  BookMarked, TrendingUp, AlertTriangle,
  Lock, ArrowRight,
  ExternalLink, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceCard } from '@/components/EvidenceCard';
import { getRuns, type RunEntry } from '@/lib/runHistory';
import { safeEvidenceStatus } from '@/lib/evidenceUtils';
import { getWorkspaceId } from '@/lib/trialAccount';
import { getCockpitRuns, type CockpitRunRecord } from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { useOptionalUser } from '@/lib/optionalClerk';
import type { RecommendationLevel } from '@/data/mockData';

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
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border';
  const map: Record<RecommendationLevel, string> = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red:   'bg-red-500/10   text-red-400   border-red-500/20',
    blue:  'bg-blue-500/10  text-blue-400  border-blue-500/20',
    grey:  'bg-muted/40     text-muted-foreground border-border',
  };
  return <span className={cn(base, map[level])}>{label}</span>;
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

function sourceTypeLabel(type: RunEntry['type']): string {
  if (type === 'compare') return 'Compare';
  if (type === 'document') return 'Document-assisted';
  if (type === 'origination') return 'Origination signal';
  return 'Public-source screen';
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

// ─── Run Detail Panel (real run entries) ──────────────────────────────────────

type CockpitTab = 'summary' | 'evidence' | 'ai-risk' | 'diligence' | 'decisions' | 'exports';

function RunDetailPanel({ run, onClose }: { run: RunEntry; onClose: () => void }) {
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
              {run.result?.evidence_cards && run.result.evidence_cards.length > 0 ? (
                <>
                  {/* Three-gate model: safeEvidenceStatus(status, source, confidence) */}
                  {run.result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'verified').length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-green-400 mb-2">
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
                      <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400 mb-2">
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
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
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
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">AI diligence questions</p>
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
              {run.blockers.length > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
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
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Strategic fit</p>
                  </div>
                  {run.result.strategic_fit.why_fits?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-mono text-green-400/80 mb-1.5">Why it fits</p>
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
                      <p className="text-[10px] font-mono text-amber-400/80 mb-1.5">Concerns</p>
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
                      <p className="text-[10px] font-mono text-muted-foreground/60 mb-1.5">Diligence questions</p>
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
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Next action</p>
                <div className="space-y-2">
                  <Link href="/app/run" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium border border-border bg-background hover:bg-accent rounded-md transition-colors text-foreground">
                    Run screen <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/request-pilot" className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-md transition-colors text-primary">
                    Request diligence support
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Decision actions</p>
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
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Decision log</p>
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
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Available with pilot access</p>
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
 *   "Northstar Workflow Systems Ltd." → "Northstar Workflow Systems"
 *   "The Boeing Company"        → "Boeing Company"
 *   "Illustrative Target Co."    → "Illustrative Target"
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
  if (isUsable(run.next_action) && !isGenericFinancialAction(run.next_action)) return run.next_action.trim();

  // 2. First blocking evidence card summary (diligence_blockers[].next_action)
  const blockingCard = run.result?.evidence_cards?.find(c => c.status === 'blocking');
  if (blockingCard && isUsable(blockingCard.summary)) return blockingCard.summary;

  // 3. First blocker field formatted as a targeted action (high-severity blocker)
  if (run.blockers && run.blockers.length > 0) {
    return `${run.company}: ${run.blockers[0]} — verify before IC use.`;
  }

  // 4. First unknowns[].next_action — unknown evidence gap
  const unknowns = (run.result as unknown as Record<string, unknown> | undefined)?.unknowns;
  if (Array.isArray(unknowns) && unknowns.length > 0) {
    const firstUnknown = unknowns[0] as Record<string, unknown> | null;
    const unk = firstUnknown?.next_action as string | undefined;
    if (isUsable(unk)) return unk!.trim();
  }

  // 5. Strategic fit diligence question
  const sfq = run.result?.strategic_fit?.diligence_questions;
  if (Array.isArray(sfq) && sfq.length > 0 && isUsable(sfq[0])) return sfq[0];

  if (isGenericFinancialAction(run.next_action)) {
    return `${run.company}: source-backed financials are incomplete; request management accounts, ARR bridge and customer schedule.`;
  }

  // 6. Generic fallback
  return `${run.company}: review evidence gaps before IC use.`;
}

function SavedRunCard({
  run,
  active,
  onSelect,
  compact = false,
}: {
  run: RunEntry;
  active: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const blocker = mainBlocker(run);
  const icReadiness = displayText(run.ic_readiness);
  const confidence = displayText(run.evidence_confidence);
  const nextAction = cockpitNextAction(run);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border bg-card p-4 transition-colors',
        active ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/20',
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={cn(
                'inline-flex px-2 py-0.5 rounded bg-muted/40 text-[10px] font-medium',
                run.type === 'compare' ? 'text-blue-400' : run.type === 'document' ? 'text-violet-400' : run.type === 'origination' ? 'text-cyan-400' : 'text-primary',
              )}>
                {sourceTypeLabel(run.type)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" /> {formatTs(run.timestamp)}
              </span>
            </div>
            <p className="text-base font-semibold text-foreground leading-snug break-words">{run.company}</p>
            {displayText(run.website) && (
              <p className="text-xs text-muted-foreground mt-0.5 break-all">{run.website}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {chip(safeLevel(run.recommendation_level), runRecommendation(run))}
            {run.blockers.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap">
                {run.blockers.length} blocker{run.blockers.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {icReadiness && (
            <div className="rounded-md border border-border/70 bg-background/60 p-3">
              <p className="text-[11px] font-medium text-muted-foreground/60 mb-1">IC readiness</p>
              <p className="text-sm text-foreground leading-snug">{icReadiness}</p>
            </div>
          )}
          {confidence && (
            <div className="rounded-md border border-border/70 bg-background/60 p-3">
              <p className="text-[11px] font-medium text-muted-foreground/60 mb-1">Evidence confidence</p>
              <div>{confidenceChip(confidence)}</div>
            </div>
          )}
          {blocker && (
            <div className="rounded-md border border-border/70 bg-background/60 p-3 sm:col-span-2 xl:col-span-1">
              <p className="text-[11px] font-medium text-muted-foreground/60 mb-1">Main blocker</p>
              <p className="text-sm text-foreground leading-snug">{blocker}</p>
            </div>
          )}
        </div>

        <div className="rounded-md border border-primary/15 bg-primary/5 p-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-primary mb-1">Next action</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{nextAction}</p>
          </div>
          {!compact && <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
        </div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealCockpitPage() {
  const { isLoaded, isSignedIn } = useOptionalUser();

  // ── Run history ──
  // Lazy initializer: reads localStorage synchronously on first render so
  // hasRealRuns is correct before the first paint — avoids a flash of the
  // empty state when the user already has saved runs.
  const [runs, setRuns] = useState<RunEntry[]>(() => getRuns());
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

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

  // ── Summary stats from real runs ──
  const stats = {
    total: runs.length,
    financials: runs.filter(r => r.recommendation === 'Request Financials').length,
    highAiRisk: runs.filter(r => r.ai_replica_risk === 'High' || r.ai_replica_risk === 'Medium-high').length,
    blockers: runs.reduce((acc, r) => acc + r.blockers.length, 0),
    compared: runs.filter(r => r.type === 'compare').length,
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
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
            Run another screen
          </Link>
        </div>
      </div>

      {/* ── Account state banner (no workspace) ── */}
      {isLoaded && !isSignedIn && (
        <div className="mb-6 rounded-lg border border-border bg-card/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-0.5">Runs are saved locally in this browser.</p>
            <p className="text-xs text-muted-foreground">Create a workspace to persist runs and unlock the full pipeline.</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Runs saved',        value: stats.total,      level: 'grey' as RecommendationLevel },
            { label: 'Financial evidence needed', value: stats.financials, level: 'amber' as RecommendationLevel },
            { label: 'High AI risk',       value: stats.highAiRisk, level: 'red' as RecommendationLevel },
            { label: 'Evidence blockers',  value: stats.blockers,   level: 'amber' as RecommendationLevel },
            { label: 'Compared targets',   value: stats.compared,   level: 'blue' as RecommendationLevel },
          ].map(({ label, value, level }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {chip(level, label)}
            </div>
          ))}
        </div>
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
              <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <p className="text-xs font-semibold text-primary mb-4">Priority next actions</p>
                <div className="space-y-3">
                  {deduped.map(r => (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{cockpitShortName(r.company)} — </span>
                        <span className="text-sm text-muted-foreground">{cockpitNextAction(r)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
                    />
                  ))
                ) : null}
              </div>

              {filteredComparisons.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <GitCompare className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
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
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom CTAs */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/app/run" className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                  Run another screen <ArrowRight className="w-3.5 h-3.5" />
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
                  <RunDetailPanel run={activeRun} onClose={() => setActiveRunId(null)} />
                )}
                {/* Desktop inline */}
                <div className="hidden lg:flex flex-col w-96 shrink-0">
                  <RunDetailPanel run={activeRun} onClose={() => setActiveRunId(null)} />
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
              <p className="text-base font-semibold text-foreground mb-1">No saved runs yet.</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Run a screen to start building your deal pipeline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/app/run" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md transition-colors">
                Run first acquisition screen <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
}

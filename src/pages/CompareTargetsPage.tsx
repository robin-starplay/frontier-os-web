import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  Trophy, AlertCircle, Plus, Trash2, ArrowRight,
  CheckCircle2, Loader2, Clock, Info, ExternalLink,
  Lock as LockIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BetaCTA } from '@/components/BetaCTA';
import { compareCompanies, type CompareResult, type CompareTargetResult, type Level } from '@/lib/frontierApi';
import { saveCompareRun } from '@/lib/runHistory';
import { getWorkspaceId, getUserId, createBackendAccount } from '@/lib/trialAccount';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';

// ─── types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'result' | 'error';
type Jurisdiction = 'uk' | 'us' | 'de' | 'fr' | 'it' | 'other';

interface CompanyRow {
  name: string;
  url: string;
  jurisdiction: Jurisdiction;
}

interface ProgressStage {
  label: string;
  status: 'queued' | 'running' | 'complete';
}

const EMPTY_COMPANY = (): CompanyRow => ({ name: '', url: '', jurisdiction: 'uk' });

const PROGRESS_STEPS: string[] = [
  'Screening targets',
  'Ranking evidence quality',
  'Testing strategic fit',
  'Comparing AI risk',
  'Building recommendation',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function chip(level: Level, label: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium whitespace-nowrap border';
  const map: Record<Level, string> = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red:   'bg-red-500/10   text-red-400   border-red-500/20',
    blue:  'bg-blue-500/10  text-blue-400  border-blue-500/20',
    grey:  'bg-muted/40     text-muted-foreground border-border',
  };
  return <span className={cn(base, map[level])}>{label}</span>;
}

function riskLevel(risk: string): Level {
  if (risk === 'Low')         return 'green';
  if (risk === 'Medium')      return 'blue';
  if (risk === 'Medium-high') return 'amber';
  if (risk === 'High')        return 'red';
  return 'grey';
}

function rankBadgeStyle(rank: number) {
  if (rank === 1) return 'bg-green-500/15 text-green-400 border border-green-500/30';
  if (rank === 2) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  if (rank === 3) return 'bg-blue-500/10  text-blue-400  border border-blue-500/20';
  return 'bg-muted/30 text-muted-foreground border border-border';
}

// ─── Form phase ───────────────────────────────────────────────────────────────

function CompareForm({
  buyer, setBuyer,
  buyerThesis, setBuyerThesis,
  companies, setCompanies,
  onSubmit,
}: {
  buyer: string; setBuyer: (v: string) => void;
  buyerThesis: string; setBuyerThesis: (v: string) => void;
  companies: CompanyRow[]; setCompanies: (v: CompanyRow[]) => void;
  onSubmit: () => void;
}) {
  function updateCompany(i: number, field: keyof CompanyRow, value: string) {
    const updated = companies.map((c, idx) => idx === i ? { ...c, [field]: value } : c);
    setCompanies(updated);
  }

  function addCompany() {
    if (companies.length < 5) setCompanies([...companies, EMPTY_COMPANY()]);
  }

  function removeCompany(i: number) {
    if (companies.length > 2) setCompanies(companies.filter((_, idx) => idx !== i));
  }

  const canSubmit = companies.filter(c => c.name.trim()).length >= 2;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={e => { e.preventDefault(); if (canSubmit) onSubmit(); }}>
        {/* Buyer context */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-0">Buyer context</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer / platform name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="buyer"
                placeholder="e.g. UK Mid-Market PE Acquirer"
                value={buyer}
                onChange={e => setBuyer(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_thesis">
                Buyer thesis <span className="text-muted-foreground font-normal">(optional, improves strategic fit ranking)</span>
              </Label>
              <textarea
                id="buyer_thesis"
                rows={3}
                placeholder="e.g. PE platform add-on — recurring revenue, EBITDA quality, ARR confirmation, low AI replica risk"
                value={buyerThesis}
                onChange={e => setBuyerThesis(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Company rows */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Target companies</p>
            <span className="text-xs text-muted-foreground">{companies.length} / 5</span>
          </div>
          <div className="divide-y divide-border">
            {companies.map((co, i) => (
              <div key={i} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-foreground">Company {i + 1}</p>
                  {companies.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeCompany(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs" htmlFor={`co-name-${i}`}>Company name</Label>
                    <Input
                      id={`co-name-${i}`}
                      placeholder="Company name"
                      value={co.name}
                      onChange={e => updateCompany(i, 'name', e.target.value)}
                      className="bg-background h-9 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs" htmlFor={`co-url-${i}`}>Website URL</Label>
                    <Input
                      id={`co-url-${i}`}
                      placeholder="https://example.com"
                      value={co.url}
                      onChange={e => updateCompany(i, 'url', e.target.value)}
                      className="bg-background h-9 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs">Jurisdiction</Label>
                    <Select
                      value={co.jurisdiction}
                      onValueChange={v => updateCompany(i, 'jurisdiction', v)}
                    >
                      <SelectTrigger className="bg-background h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uk">UK</SelectItem>
                        <SelectItem value="us">US</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {companies.length < 5 && (
            <div className="px-5 py-3 border-t border-border">
              <button
                type="button"
                onClick={addCompany}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add company ({companies.length}/5)
              </button>
            </div>
          )}
        </div>

        {!canSubmit && (
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Enter at least 2 company names to compare.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={!canSubmit} className="sm:flex-1 h-11 text-base">
            Compare companies <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-border bg-background hover:bg-accent h-11 px-5 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_compare_form')}
          >
            Book a 30-minute intro <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>
    </div>
  );
}

// ─── Loading phase ────────────────────────────────────────────────────────────

function CompareLoading({ stages }: { stages: ProgressStage[] }) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-xs text-muted-foreground">Comparing targets. Building ranked recommendation…</p>
        </div>
        <div className="divide-y divide-border">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={cn(
                'px-4 py-3 flex items-center gap-3 transition-colors',
                stage.status === 'running'  ? 'bg-primary/5' :
                stage.status === 'complete' ? 'bg-background' :
                'bg-muted/5 opacity-40',
              )}
            >
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {stage.status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : stage.status === 'running' ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground/30" />
                )}
              </div>
              <p className={cn(
                'text-sm',
                stage.status === 'queued' ? 'text-muted-foreground' : 'text-foreground',
              )}>
                {stage.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Result phase ─────────────────────────────────────────────────────────────

function evidenceScore(s: string) {
  return s === 'High' ? 3 : s === 'Medium' ? 2 : s === 'Low' ? 1 : 0;
}

function CompareResultView({ result, onReset, saveSource }: {
  result: CompareResult;
  onReset: () => void;
  saveSource?: 'backend' | 'local';
}) {
  const top = result.targets[0];
  const second = result.targets[1];
  const strongestEvidence = [...result.targets].sort(
    (a, b) => evidenceScore(b.evidence_confidence) - evidenceScore(a.evidence_confidence),
  )[0]?.company ?? '—';
  const mostBlockers = [...result.targets].sort((a, b) => b.blockers.length - a.blockers.length)[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* Fallback notice */}
      {result.fallback_used && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
          Backend marked this comparison as partial. Treat ranking as provisional until each target has a full evidence screen.
        </div>
      )}

      {/* Public-source disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
        Public-source screen only. Financials and document evidence must be verified before IC/client use.
      </div>

      {/* Saved to Cockpit notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>
          {saveSource === 'backend'
            ? 'Saved to Cockpit'
            : 'Saved locally · create an account to sync across devices'}
        </span>
        <a
          href="/cockpit"
          className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          onClick={e => { e.preventDefault(); window.location.href = '/cockpit'; }}
        >
          Open Cockpit →
        </a>
      </div>

      {/* Comparison verdict */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Comparison verdict</p>
        </div>
        <div className="px-5 py-4">
          {top && second ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{top.company}</span> ranks first because it has stronger evidence confidence and fewer blocker signals in the preview screen.{' '}
              <span className="font-semibold text-foreground">{second.company}</span> remains reviewable, but needs more proof around{' '}
              {second.blockers.length > 0 ? second.blockers.slice(0, 2).join(', ').toLowerCase() : 'ARR quality, revenue mix and AI defensibility'}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Ranking complete. See targets below.</p>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Best first target',    value: result.most_ic_ready,     color: 'text-green-400' },
          { label: 'Strongest evidence',   value: strongestEvidence,        color: 'text-blue-400' },
          { label: 'Highest AI risk',      value: result.highest_ai_risk,   color: 'text-red-400' },
          { label: 'Biggest diligence gap',
            value: mostBlockers && mostBlockers.blockers.length > 0
              ? `${mostBlockers.company}: ${mostBlockers.blockers[0]}`
              : result.most_evidence_gaps,
            color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{card.label}</p>
            <p className={cn('text-sm font-semibold leading-snug', card.color)}>{card.value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card p-3 col-span-2 lg:col-span-1">
          <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Best next action</p>
          <p className="text-xs text-foreground leading-snug">{result.best_next_action}</p>
        </div>
      </div>

      {/* Ranked targets */}
      <div className="space-y-4">
        {result.targets.map((t: CompareTargetResult) => (
          <div
            key={t.company}
            className={cn(
              'rounded-lg border p-5 transition-colors',
              t.rank === 1
                ? 'border-green-500/25 bg-green-500/[0.03]'
                : t.recommendation_level === 'red'
                  ? 'border-border/60 bg-card/40 opacity-80'
                  : 'border-border bg-card/60',
            )}
          >
            {/* Card header */}
            <div className="flex items-start gap-4">
              <div className={cn(
                'flex items-center justify-center rounded-full shrink-0 font-bold text-sm w-9 h-9',
                rankBadgeStyle(t.rank),
              )}>
                {t.rank === 1 ? <Trophy className="w-4 h-4" /> : `#${t.rank}`}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                  <p className="text-base font-bold text-foreground leading-snug">{t.company}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {chip(t.recommendation_level, t.recommendation)}
                    {chip(riskLevel(t.ai_replica_risk), `AI risk: ${t.ai_replica_risk}`)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{t.rank_reason}</p>
                {t.url && (
                  <a
                    href={t.url.startsWith('http') ? t.url : `https://${t.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors mt-1"
                  >
                    {t.url} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-border/60" />

            {/* Detail grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Strategic fit</p>
                <p className="text-xs text-foreground leading-snug">{t.strategic_fit}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Evidence confidence</p>
                <p className="text-xs text-foreground">{t.evidence_confidence}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">AI replica risk</p>
                {chip(riskLevel(t.ai_replica_risk), t.ai_replica_risk)}
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Main blockers</p>
                <p className="text-xs text-muted-foreground leading-snug">{t.blockers.length > 0 ? t.blockers[0] : 'None identified'}</p>
              </div>
            </div>

            {/* Blockers */}
            {t.blockers.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Diligence gaps ({t.blockers.length})
                </p>
                <ul className="space-y-1">
                  {t.blockers.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next action */}
            <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/60 mr-1.5">Next action:</span>
                <span className="text-xs text-muted-foreground">{t.next_action}</span>
              </div>
              {t.recommendation_level !== 'red' && (
                <Link
                  href="/run"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                >
                  Run full screen →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Locked premium features */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Available in private beta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: 'Drill-down screens', desc: 'Run a full URL-only or document-assisted screen on any ranked target directly from the comparison.' },
            { title: 'Full IC memo (PDF)', desc: 'Export a structured acquisition memo for any target: financials, evidence register and AI assessment.' },
            { title: 'Evidence comparison matrix', desc: 'Side-by-side evidence quality scores, conflict flags and source rankings across all targets.' },
            { title: 'PowerPoint IC pack', desc: 'Ready-to-present slide deck for the IC: ranked targets, fit scores, risk flags and recommended next action.' },
            { title: 'Save to Deal Cockpit', desc: 'Add any target to your pipeline, set IC status and track progress across the team.' },
            { title: 'Historical pipeline view', desc: 'See all previous comparisons, archived by deal, fund and date, with saved IC decisions.' },
          ].map(f => (
            <div key={f.title} className="rounded-lg border border-border bg-card/40 p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                <LockIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-0.5">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug mb-2">{f.desc}</p>
                <Link
                  href="/request-pilot"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  onClick={() => console.log('[analytics] clicked_request_private_beta_compare_locked')}
                >
                  Request private beta access <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-5">
        <p className="text-sm font-semibold text-foreground mb-1">Run a full screen on your top target.</p>
        <p className="text-xs text-muted-foreground mb-4">
          A URL-only screen provides evidence cards, AI replica risk, strategic fit and IC readiness. Document-assisted analysis is available in private beta.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/run"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors"
            onClick={() => console.log('[analytics] clicked_run_from_compare_result')}
          >
            Run screen <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/request-pilot"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground"
            onClick={() => console.log('[analytics] clicked_request_beta_compare_cta')}
          >
            Request private beta access
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_compare_result')}
          >
            Book a 30-minute intro <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Run another */}
      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          ← Run another comparison
        </button>
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Open Deal Cockpit
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompareTargetsPage() {
  const [phase, setPhase]             = useState<Phase>('form');
  const [buyer, setBuyer]             = useState('');
  const [buyerThesis, setBuyerThesis] = useState('');
  const [companies, setCompanies]     = useState<CompanyRow[]>([
    EMPTY_COMPANY(),
    EMPTY_COMPANY(),
  ]);
  const [progress, setProgress] = useState<ProgressStage[]>(
    PROGRESS_STEPS.map(label => ({ label, status: 'queued' })),
  );
  const [result, setResult] = useState<CompareResult | null>(null);
  const [saveSource, setSaveSource] = useState<'backend' | 'local' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    // Reset progress
    const fresh: ProgressStage[] = PROGRESS_STEPS.map(label => ({ label, status: 'queued' }));
    setProgress(fresh);
    setResult(null);
    setError(null);
    setPhase('loading');

    // Provision backend workspace on first run (no-op if already done; silent on failure)
    await createBackendAccount(buyer, buyerThesis).catch(() => null);
    // Start API call — include workspace IDs when available for backend persistence
    const workspaceId = getWorkspaceId();
    const userId = getUserId();
    const apiPromise = compareCompanies({
      buyer,
      buyer_thesis: buyerThesis,
      companies: companies.filter(c => c.name.trim()).map(c => ({
        name: c.name,
        url: c.url,
        jurisdiction: c.jurisdiction,
      })),
      ...(workspaceId && userId
        ? { workspace_id: workspaceId, user_id: userId, save_to_cockpit: true }
        : {}),
    }).then(
      data => ({ data, error: null as Error | null }),
      err => ({ data: null as CompareResult | null, error: err instanceof Error ? err : new Error('Compare request failed.') }),
    );

    // Animate progress steps (~1400ms each)
    const updated = [...fresh];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'running' };
      setProgress([...updated]);
      await new Promise<void>(r => setTimeout(r, 1300 + Math.random() * 400));
      updated[i] = { ...updated[i], status: 'complete' };
      setProgress([...updated]);
    }

    // Await API result (should already be resolved)
    try {
      const { data: apiResult, error: apiError } = await apiPromise;
      if (apiError || !apiResult) throw apiError ?? new Error('Compare request failed.');
      setResult(apiResult);
      // Save each target to local run history so the Deal Cockpit shows them
      try { saveCompareRun(apiResult); } catch { /* storage not available */ }
      setSaveSource(apiResult.saved_to_cockpit ? 'backend' : 'local');
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare request failed.');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('form');
    setResult(null);
    setError(null);
    setProgress(PROGRESS_STEPS.map(label => ({ label, status: 'queued' })));
  }

  const pageHeader = (
    <div className="w-full border-b border-border bg-card/30">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">Target comparison</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
          Compare software acquisition targets.
        </h1>
        <p className="text-base text-muted-foreground">
          Rank targets by recommendation, strategic fit, evidence confidence, AI risk and next action.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col w-full">
      {pageHeader}

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* Beta notice */}
        <div className="mb-6 bg-primary/5 border border-primary/20 text-muted-foreground px-4 py-3 rounded-md flex items-center gap-3 text-sm">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">PRIVATE BETA</span>
          Public-source preview. Evidence checked. Gaps flagged.
        </div>

        {phase === 'form' && (
          <>
            <div className="mb-8 rounded-lg border border-border bg-card/60 px-5 py-4">
              <p className="text-sm font-semibold text-foreground mb-1">Compare two or more real screened targets.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter known company websites below. Frontier OS will call the backend compare endpoint and render only returned evidence, claims, blockers and next actions.
              </p>
            </div>

            <CompareForm
              buyer={buyer}             setBuyer={setBuyer}
              buyerThesis={buyerThesis} setBuyerThesis={setBuyerThesis}
              companies={companies}     setCompanies={setCompanies}
              onSubmit={handleSubmit}
            />
          </>
        )}

        {phase === 'loading' && <CompareLoading stages={progress} />}

        {phase === 'result' && result && (
          <CompareResultView result={result} onReset={reset} saveSource={saveSource ?? 'local'} />
        )}

        {phase === 'result' && !result && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Building recommendation…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="w-full max-w-xl mx-auto rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Compare request could not complete.</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {error || 'The backend compare endpoint did not return a usable response.'}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
                >
                  Edit targets
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <BetaCTA
        title="Want to test this on your own pipeline?"
        body="Run a sample screen, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Run screen"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="compare_targets_bottom"
      />
    </div>
  );
}

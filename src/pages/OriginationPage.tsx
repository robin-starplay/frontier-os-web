import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, Search, Target, ChevronRight, CheckCircle2,
  Loader2, AlertCircle, Info,
} from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';
import { saveUrlRun } from '@/lib/runHistory';
import { getBackendBaseUrl } from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';

// ─── Illustrative example output (shown above form as reference only) ──────────
// These are hardcoded example targets used ONLY to illustrate what origination
// output looks like. They are never shown as the result of a live run.

const EXAMPLE_TARGETS = [
  {
    rank: 1, company: 'Cerillion plc', sector: 'Telecoms BSS/OSS', arr: '£18M',
    verdict: 'Screen now', level: 'green', website: 'cerillion.com',
    fit_score: '8/10',
    why_fits: 'Mission-critical BSS/OSS; high switching costs; recurring revenue in public filings',
    missing_evidence: 'ARR bridge, SaaS vs services split',
    ai_risk: 'Low',
    next_action: 'Run URL screen',
  },
  {
    rank: 2, company: 'Checkit plc', sector: 'Workforce workflow', arr: '£14M',
    verdict: 'Request financials', level: 'amber', website: 'checkit.net',
    fit_score: '6/10',
    why_fits: 'Recurring workflow SaaS; field-service automation with low churn narrative',
    missing_evidence: 'ARR quality, revenue mix, AI defensibility not established',
    ai_risk: 'Medium',
    next_action: 'Request Financials',
  },
  {
    rank: 3, company: 'LedgerWorks Billing', sector: 'Finance automation', arr: '£9M',
    verdict: 'Request financials', level: 'amber', website: 'ledgerworks.io',
    fit_score: '5/10',
    why_fits: 'Finance automation SaaS with B2B billing focus; EBITDA expansion potential',
    missing_evidence: 'Customer concentration, ARR reconciliation, AI moat unclear',
    ai_risk: 'Medium-high',
    next_action: 'Request Financials',
  },
];

const EXAMPLE_REJECTED = [
  {
    company: 'VerticalOps CRM GmbH',
    reason: 'Registry block — insufficient public filing data available for this jurisdiction to support UK/DACH buyer thesis assessment.',
  },
  {
    company: 'Illustrative Target Co.',
    reason: 'AI risk hold — high replica risk with no moat evidence identified. Would require significant AI diligence before progressing.',
  },
];

const LEVEL_CLASSES: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red:   'bg-red-500/10   text-red-400   border-red-500/20',
};

// ─── Origination API call ─────────────────────────────────────────────────────

interface OriginationRequest {
  sector:     string;
  geography:  string;
  arr_range:  string;
  rationale:  string;
}

type OriginationResult = Record<string, unknown>;

async function runOrigination(req: OriginationRequest): Promise<OriginationResult> {
  const base = getBackendBaseUrl();
  const url  = base ? `${base}/api/origination/run` : '/api/origination/run';
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<OriginationResult>;
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

  // Normalise candidate list — backend may call this field anything
  const candidates = (
    (data.candidates as unknown[] | undefined) ??
    (data.target_ideas as unknown[] | undefined) ??
    (data.targets as unknown[] | undefined) ??
    []
  ) as Record<string, unknown>[];

  const isPreview  = !!data.preview || !!data.is_preview || candidates.length === 0;
  const summary    = data.thesis_summary    as string | undefined;
  const rationale  = data.match_rationale   as string | undefined;
  const nextActArr = data.next_actions      as unknown[] | undefined;
  const evidGaps   = data.evidence_gaps     as unknown[] | undefined;
  const limitations= data.limitations      as string | undefined;
  const rejected   = (data.rejected_targets as Record<string, unknown>[] | undefined) ?? [];

  function safeStr(v: unknown): string {
    return v != null ? String(v) : '';
  }

  return (
    <div className="space-y-4">
      {/* Preview notice when backend returns limited/placeholder result */}
      {isPreview && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary/80">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Origination preview generated. Validate targets and evidence before outreach.
          </span>
        </div>
      )}

      {/* Thesis summary */}
      {summary && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Thesis summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Candidate targets */}
      {candidates.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Candidate targets ({candidates.length})
            </p>
            <span className="text-[10px] font-mono text-muted-foreground/60">Public signals only · not verified</span>
          </div>
          <div className="divide-y divide-border">
            {candidates.map((c, i) => {
              const name    = safeStr(c.company ?? c.name ?? c.company_name ?? `Target ${i + 1}`);
              const sector  = safeStr(c.sector ?? c.vertical ?? '');
              const arr     = safeStr(c.arr ?? c.revenue ?? c.arr_range ?? '');
              const verdict = safeStr(c.verdict ?? c.recommendation ?? '');
              const fit     = safeStr(c.fit_score ?? c.score ?? '');
              const risk    = safeStr(c.ai_risk ?? c.risk ?? '');
              const fits    = safeStr(c.why_fits ?? c.rationale ?? c.match_rationale ?? '');
              const missing = safeStr(c.missing_evidence ?? c.evidence_gaps ?? '');
              const action  = safeStr(c.next_action ?? '');
              const website = safeStr(c.website ?? '');
              const lvlRaw  = safeStr(c.level ?? c.recommendation_level ?? 'amber').toLowerCase();
              const lvl     = lvlRaw in LEVEL_CLASSES ? lvlRaw : 'amber';
              return (
                <div key={i} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-mono text-muted-foreground/50">#{i + 1}</span>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    {verdict && (
                      <span className={`inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border ${LEVEL_CLASSES[lvl]}`}>
                        {verdict}
                      </span>
                    )}
                  </div>
                  {(sector || arr) && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {[sector, arr ? `ARR ${arr}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-xs">
                    {fit && (
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">Fit score</p>
                        <p className="font-semibold text-foreground">{fit}</p>
                      </div>
                    )}
                    {risk && (
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">AI risk</p>
                        <p className="font-medium text-muted-foreground">{risk}</p>
                      </div>
                    )}
                    {fits && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">Why it fits</p>
                        <p className="text-muted-foreground leading-snug">{fits}</p>
                      </div>
                    )}
                  </div>
                  {missing && (
                    <p className="text-xs text-amber-400/70 mb-2">
                      <span className="font-mono uppercase tracking-wide text-[10px]">Missing evidence</span>
                      {' '}{missing}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {website ? (
                      <Link
                        href={`/run?company=${encodeURIComponent(name)}&website=${encodeURIComponent(website)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                      >
                        Run screen →
                      </Link>
                    ) : (
                      <Link
                        href="/run"
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                      >
                        Run screen →
                      </Link>
                    )}
                    {action && (
                      <span className="text-[11px] text-muted-foreground/60">{action}</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground/40 mt-2">
                    Source: Public signals only · Status: Signal, not verified
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match rationale */}
      {rationale && (
        <div className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Match rationale</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{rationale}</p>
        </div>
      )}

      {/* Evidence gaps */}
      {evidGaps && evidGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400/70 mb-2">Evidence gaps</p>
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Recommended next actions</p>
          <ol className="space-y-1.5">
            {nextActArr.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 mt-0.5">
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
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
              Excluded targets ({rejected.length}) — why they were excluded
            </p>
            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform ${showRejected ? 'rotate-90' : ''}`} />
          </button>
          {showRejected && (
            <div className="divide-y divide-border/40">
              {rejected.map((r, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground/60 mb-0.5">
                    {safeStr(r.company ?? r.name ?? `Target ${i + 1}`)}
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
      {limitations && (
        <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed px-1">
          {limitations}
        </p>
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
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          Run another origination screen
        </button>
        <Link
          href="/run"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Run URL screen
        </Link>
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Deal Cockpit
        </Link>
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
  const [arr,       setArr      ] = useState('');
  const [rationale, setRationale] = useState('');
  const [state,     setState    ] = useState<FormState>({ kind: 'idle' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: 'submitting' });
    try {
      const data = await runOrigination({
        sector,
        geography: geo,
        arr_range: arr,
        rationale,
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
            Origination preview is temporarily unavailable. Try Run screen or book an intro.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
          >
            Try again
          </button>
          <Link
            href="/run"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
          >
            Run URL screen <ArrowRight className="w-3 h-3" />
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
          >
            Book intro
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
            className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          ARR / revenue range
        </label>
        <input
          type="text"
          value={arr}
          onChange={e => setArr(e.target.value)}
          placeholder="e.g. £2M–£20M ARR"
          className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Caveat */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Private beta preview · Public-source signals only · Results require manual review before outreach or IC use.
      </p>

      <button
        type="submit"
        disabled={state.kind === 'submitting'}
        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state.kind === 'submitting' ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running origination screen…</>
        ) : (
          <>Run origination screen <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </button>
    </form>
  );
}

// ─── Illustrative example targets (above form — clearly labelled) ─────────────

function IllustrativeExampleTable() {
  const [saved, setSaved]           = useState<Record<number, boolean>>({});
  const [selected, setSelected]     = useState<number[]>([]);
  const [showRejected, setShowRejected] = useState(false);

  function toggleSelect(rank: number) {
    setSelected(prev =>
      prev.includes(rank) ? prev.filter(r => r !== rank) : [...prev, rank],
    );
  }

  function handleSave(t: typeof EXAMPLE_TARGETS[number]) {
    try {
      saveUrlRun(
        {
          status:               'partial',
          data_mode:            'Origination · illustrative example',
          company:              t.company,
          recommendation:       t.verdict,
          recommendation_level: t.level === 'green' ? 'green' : t.level === 'amber' ? 'amber' : 'red',
          ic_readiness:         t.level === 'green' ? 'Ready' : 'Partial',
          valuation_readiness:  `ARR ~${t.arr}`,
          strategic_fit_label:  t.sector,
          evidence_confidence:  'Low',
          ai_replica_risk:      t.ai_risk,
          ai_moat:              '',
          next_action:          t.next_action,
          strategic_fit:        { score: String(t.fit_score), why_fits: [t.why_fits], why_not: [], assumptions: [], risks: [], diligence_questions: [] },
          evidence_cards:       [],
          ai_disruption:        { replica_risk: t.ai_risk, replica_risk_level: t.level === 'green' ? 'green' : t.level === 'amber' ? 'amber' : 'red', moat_evidence: '', inference_economics: '', product_expansion: '', opex_improvement: '', diligence_questions: [] },
        },
        t.website,
      );
    } catch { /* storage not available */ }
    setSaved(prev => ({ ...prev, [t.rank]: true }));
  }

  const compareUrl = selected.length > 0
    ? `/compare?companies=${encodeURIComponent(
        selected
          .map(r => EXAMPLE_TARGETS.find(t => t.rank === r)?.company ?? '')
          .filter(Boolean)
          .join(','),
      )}`
    : '/compare';

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Illustrative example output · not live results
          </p>
          <span className="text-[10px] font-mono text-muted-foreground">UK vertical SaaS / £5M–£25M ARR</span>
        </div>

        <div className="divide-y divide-border">
          {EXAMPLE_TARGETS.map(t => (
            <div key={t.rank} className="p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${t.company}`}
                  className="shrink-0 accent-primary mt-0.5"
                  checked={selected.includes(t.rank)}
                  onChange={() => toggleSelect(t.rank)}
                />
                <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0 mt-0.5 w-5">#{t.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">{t.company}</p>
                    <span className={`inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${LEVEL_CLASSES[t.level]}`}>
                      {t.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.sector} · ARR {t.arr}</p>
                </div>
              </div>

              <div className="ml-8 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">Fit score</p>
                  <p className="text-xs font-semibold text-foreground">{t.fit_score}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">AI risk</p>
                  <p className={`text-xs font-medium ${
                    t.ai_risk === 'Low' ? 'text-green-400'
                    : t.ai_risk === 'Medium' ? 'text-blue-400'
                    : 'text-amber-400'
                  }`}>{t.ai_risk}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-0.5">Why it fits</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t.why_fits}</p>
                </div>
              </div>

              {t.missing_evidence && (
                <div className="ml-8 mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400/70 mb-0.5">Missing evidence</p>
                  <p className="text-xs text-muted-foreground">{t.missing_evidence}</p>
                </div>
              )}

              <div className="ml-8 flex flex-wrap items-center gap-2">
                <Link
                  href="/run"
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                >
                  Run screen →
                </Link>
                <button
                  type="button"
                  onClick={() => toggleSelect(t.rank)}
                  className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded border transition-colors whitespace-nowrap ${
                    selected.includes(t.rank)
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {selected.includes(t.rank) ? '✓ In compare' : 'Add to Compare'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(t)}
                  disabled={saved[t.rank]}
                  className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded border transition-colors whitespace-nowrap ${
                    saved[t.rank]
                      ? 'border-green-500/20 bg-green-500/5 text-green-400 cursor-default'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {saved[t.rank]
                    ? <><CheckCircle2 className="w-3 h-3" /> Saved</>
                    : 'Save to Cockpit'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground/50 font-mono italic">
            Illustrative example only · not live origination output
          </p>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <Link
                href={compareUrl}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-7 px-3 rounded-md transition-colors text-foreground"
              >
                Compare {selected.length} selected <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            <Link
              href="/cockpit"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Open Cockpit →
            </Link>
          </div>
        </div>
      </div>

      {/* Excluded example targets — collapsible */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRejected(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-3 bg-card/40 text-left hover:bg-card/60 transition-colors"
        >
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Excluded example targets ({EXAMPLE_REJECTED.length}) — why they were excluded
          </p>
          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform ${showRejected ? 'rotate-90' : ''}`} />
        </button>
        {showRejected && (
          <div className="divide-y divide-border/40">
            {EXAMPLE_REJECTED.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground/60 mb-0.5">{r.company}</p>
                  <p className="text-xs text-muted-foreground/60 leading-snug">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AVAILABLE_NOW = [
  {
    href:  '/run',
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
    desc:  'Run a public-source target-discovery screen from a buyer thesis.',
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
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Origination</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PRIVATE BETA
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Find acquisition targets from a buyer thesis.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Describe your sector, geography, size criteria and strategic rationale. Frontier OS
            searches its registry and evidence network to surface ranked candidates — with evidence
            confidence and AI risk pre-scored for each.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-10">

        {/* Workflow steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Search className="w-4 h-4" />, step: '1', title: 'Enter buyer thesis', desc: 'Sector, geography, revenue range and strategic rationale.' },
            { icon: <Target className="w-4 h-4" />, step: '2', title: 'Frontier OS searches', desc: 'Registry scan + evidence pre-screen of matching candidates.' },
            { icon: <ChevronRight className="w-4 h-4" />, step: '3', title: 'Ranked target list', desc: 'Evidence confidence, AI risk and recommended next action for each.' },
          ].map(({ icon, step, title, desc }) => (
            <div key={step} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[11px] font-bold font-mono">
                  {step}
                </span>
                <span className="text-primary">{icon}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Illustrative example output */}
        <IllustrativeExampleTable />

        {/* Live origination thesis form */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-0.5">
              Origination thesis
            </p>
            <p className="text-xs text-muted-foreground">
              Describe your buyer thesis and run a public-source target-discovery screen.
            </p>
          </div>
          <div className="p-5">
            <OriginationForm />
          </div>
        </div>

        {/* Available now in private beta */}
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">Available now in private beta</p>
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
        primaryHref="/run?mode=sample"
        secondaryLabel="Compare targets"
        secondaryHref="/compare"
        eventName="origination_bottom"
      />
    </div>
  );
}

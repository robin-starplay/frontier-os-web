import React from 'react';
import { Link } from 'wouter';
import { BrainCircuit, AlertCircle, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';
import { BookIntroButton } from '@/components/BookIntroButton';
import { BetaCTA } from '@/components/BetaCTA';
import { SemanticBadge } from '@/components/SemanticBadge';
import {
  AI_TARGET,
  AI_DILIGENCE_QUESTIONS,
} from '@/data/aiDisruptionData';

// ─── score summary scorecard ──────────────────────────────────────────────────

type ScoreStatus = 'medium-high' | 'unproven' | 'medium' | 'unknown' | 'low' | 'high';

interface ScorecardItem {
  label: string;
  value: string;
  status: ScoreStatus;
}

const SCORECARD: ScorecardItem[] = [
  { label: 'AI replica risk',          value: 'Medium-high', status: 'medium-high' },
  { label: 'AI moat evidence',         value: 'Unproven',    status: 'unproven'    },
  { label: 'AI opportunity',           value: 'Medium',      status: 'medium'      },
  { label: 'Innovation capacity',      value: 'Unknown',     status: 'unknown'     },
  { label: 'Inference economics risk', value: 'Unknown',     status: 'unknown'     },
  { label: 'Overall confidence',       value: 'Medium',      status: 'medium'      },
];

const SCORE_CHIP: Record<ScoreStatus, string> = {
  'medium-high': 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  'unproven':    'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
  'medium':      'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  'unknown':     'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
  'low':         'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',
  'high':        'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
};

// ─── evidence board (5 cards) ─────────────────────────────────────────────────

type EvidenceCardStatus = 'Claimed' | 'Medium-high' | 'Unproven' | 'Unknown' | 'Mixed';

interface EvidenceBoardCard {
  title: string;
  status: EvidenceCardStatus;
  statusColor: string;
  evidenceLine: string;
  verifyNext: string[];
}

const EVIDENCE_BOARD: EvidenceBoardCard[] = [
  {
    title: 'AI adoption evidence',
    status: 'Claimed',
    statusColor: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
    evidenceLine: 'Workflow assistant with AI claims mentioned on product page. No usage, adoption or revenue proof found.',
    verifyNext: [
      'Request live feature list from product team',
      'Confirm AI modules in customer contracts',
      'Obtain AI adoption metrics (DAU/MAU on AI features)',
    ],
  },
  {
    title: 'Could this workflow be replicated?',
    status: 'Medium-high',
    statusColor: 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
    evidenceLine: 'Generic workflow UI, limited proprietary data evidence. AI-native entrant replication exposure is elevated.',
    verifyNext: [
      'Assess proprietary dataset depth and uniqueness',
      'Map customer integration dependencies',
      'Test switching friction with customer reference calls',
    ],
  },
  {
    title: 'What proof supports an AI moat?',
    status: 'Unproven',
    statusColor: 'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
    evidenceLine: 'No proprietary model, feedback loop or domain-specific dataset disclosed. Embedded workflow is a claim, not verified.',
    verifyNext: [
      'Request AI roadmap and model training detail',
      'Confirm whether proprietary data improves model output',
      'Review AI-related IP and patent filings',
    ],
  },
  {
    title: 'What could model usage do to gross margin?',
    status: 'Unknown',
    statusColor: 'bg-muted/40 text-muted-foreground border-border',
    evidenceLine: 'AI feature cost structure not disclosed. Inference COGS and gross margin drag unknown.',
    verifyNext: [
      'Request per-customer monthly inference cost breakdown',
      'Confirm AI pricing (bundled vs. paid module)',
      'Model gross margin sensitivity to AI cost growth',
    ],
  },
  {
    title: 'P&L impact',
    status: 'Mixed',
    statusColor: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
    evidenceLine: 'Revenue expansion potential noted. Services cannibalisation and inference COGS drag unquantified. EBITDA impact uncertain.',
    verifyNext: [
      'Quantify services revenue at risk from AI automation',
      'Obtain AI module revenue and margin contribution',
      'Model inference cost scenarios vs pricing power',
    ],
  },
];

// ─── evidence panels (detailed) ───────────────────────────────────────────────

type DetailStatus = 'Verified' | 'Claim' | 'Unknown' | 'Diligence';

interface EvidenceSignal {
  label: string;
  status: DetailStatus;
  note: string;
}

const EVIDENCE_PANELS: { title: string; signals: EvidenceSignal[] }[] = [
  {
    title: 'Product AI signals',
    signals: [
      { label: 'AI assistant mentioned on product page', status: 'Claim',    note: 'No usage, adoption or pricing proof' },
      { label: 'AI module separately priced',            status: 'Unknown',  note: 'Not disclosed publicly' },
      { label: 'Live AI features deployed to customers', status: 'Unknown',  note: 'Requires product and customer diligence' },
      { label: 'AI in core workflow vs add-on',          status: 'Unknown',  note: 'Architecture unclear from public sources' },
    ],
  },
  {
    title: 'Tech stack and architecture',
    signals: [
      { label: 'SaaS delivery confirmed',        status: 'Claim',    note: 'Website claim, not filed' },
      { label: 'Proprietary model or fine-tune', status: 'Unknown',  note: 'No evidence of owned model' },
      { label: 'Third-party AI dependency',      status: 'Unknown',  note: 'Provider not disclosed' },
      { label: 'API integrations depth',         status: 'Unknown',  note: 'Integration list not verified' },
    ],
  },
  {
    title: 'People and innovation capacity',
    signals: [
      { label: '~300 employees (LinkedIn estimate)',  status: 'Claim',    note: 'Aggregator source — Tier 6' },
      { label: 'Technical / engineering headcount',   status: 'Unknown',  note: 'Not disclosed' },
      { label: 'AI or ML roles identified',           status: 'Unknown',  note: 'No verified AI team evidence' },
      { label: 'R&D spend',                           status: 'Unknown',  note: 'Not broken out in filings' },
    ],
  },
  {
    title: 'Market and competitive pressure',
    signals: [
      { label: 'Vertical software category identified', status: 'Verified', note: 'Confirmed from filings' },
      { label: 'AI-native competitor presence',         status: 'Unknown',  note: 'No competitor analysis in public sources' },
      { label: 'Customer switching evidence',           status: 'Unknown',  note: 'Requires customer reference calls' },
      { label: 'Market growth trajectory',              status: 'Claim',    note: 'Management claim — not independently verified' },
    ],
  },
];

const CHIP: Record<DetailStatus, string> = {
  Verified:  'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',
  Claim:     'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  Unknown:   'bg-muted/40 text-muted-foreground border-border',
  Diligence: 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
};

const ICON: Record<DetailStatus, React.ElementType> = {
  Verified:  CheckCircle2,
  Claim:     AlertCircle,
  Unknown:   HelpCircle,
  Diligence: AlertCircle,
};

const ICON_COLOR: Record<DetailStatus, string> = {
  Verified:  'text-green-500',
  Claim:     'text-amber-500',
  Unknown:   'text-muted-foreground',
  Diligence: 'text-red-500',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AIDisruptionPage() {
  return (
    <div className="flex-1 flex flex-col w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-semibold tracking-normal text-primary">AI disruption</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 max-w-2xl leading-tight">
            Does the software acquisition thesis survive AI?
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-5">
            Frontier OS tests AI replica risk, AI moat evidence, inference economics and P&L impact before valuation uplift is assumed.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Indicative analysis: <span className="text-foreground font-medium">{AI_TARGET.name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-[9px] py-[5px] text-xs font-semibold leading-none text-[var(--semantic-claim-text)]">
              <AlertCircle className="w-3 h-3" />
              Private beta · sample data, not real diligence
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 w-full space-y-10">

        {/* ── Executive AI verdict card ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-primary mb-0.5">Executive AI verdict</p>
              <p className="text-sm font-semibold text-foreground">Illustrative Target Co.</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">Sample data</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: 'AI thesis',        value: 'Not yet proven',        tone: 'partial' as const },
              { label: 'Replica risk',     value: 'Medium-high',           tone: 'partial' as const },
              { label: 'Moat evidence',    value: 'Unproven',              tone: 'unknown' as const },
              { label: 'P&L impact',       value: 'Potential upside, cost unknown', tone: 'unknown' as const },
              { label: 'AI moat evidence', value: 'Unproven',              tone: 'unknown' as const },
              { label: 'Investor action',  value: 'Verify live AI usage, data rights, model costs and customer willingness to pay.', tone: null },
            ].map(({ label, value, tone }) => (
              <div key={label} className="px-6 py-5 flex flex-col gap-2">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">{label}</p>
                {tone ? (
                  <SemanticBadge tone={tone} className="self-start">{value}</SemanticBadge>
                ) : (
                  <p className="text-sm text-foreground leading-snug">{value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── AI score summary ── */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">AI score summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SCORECARD.map(({ label, value, status }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <span className={`inline-flex self-start text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${SCORE_CHIP[status]}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI evidence board ── */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">AI evidence board</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {EVIDENCE_BOARD.map((card) => (
              <div key={card.title} className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/10">
                  <span className="text-sm font-semibold text-foreground leading-snug">{card.title}</span>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${card.statusColor}`}>
                    {card.status}
                  </span>
                </div>
                <div className="px-5 py-4 flex-1 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.evidenceLine}</p>
                  <div>
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-2">Verify next</p>
                    <ul className="space-y-1.5">
                      {card.verifyNext.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-primary shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="text-xs text-muted-foreground leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Missing proof callout ── */}
        <div className="flex items-start gap-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-semibold text-amber-700 mb-2">Missing proof becomes a diligence question</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Frontier OS does not infer an AI moat from marketing language. Every claim without a Tier 1 or Tier 2 source is classified as a claim or unknown, not a verified fact. AI upside should not increase the base valuation until management proves live monetised AI modules, inference cost control and measurable customer adoption.
            </p>
          </div>
        </div>

        {/* ── AI value and risk summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-5">
            <p className="text-[10px] font-semibold tracking-normal text-green-700 mb-4">Potential AI value</p>
            <div className="space-y-2.5">
              {[
                'Product expansion: Add AI-native capabilities that increase the addressable market.',
                'Operating leverage: Automate support, onboarding and implementation work.',
                'Customer productivity: Reduce implementation time and accelerate time to value.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                  <span className="text-sm text-foreground leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-[10px] font-semibold tracking-normal text-red-700 mb-4">Potential AI risk</p>
            <div className="space-y-2.5">
              {[
                'Workflow replication: AI-native entrants may reproduce core functionality at lower cost.',
                'Services revenue pressure: Automation may reduce billable implementation work.',
                'Inference costs: Uncontrolled model usage may limit gross margin expansion.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  <span className="text-sm text-foreground leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detailed evidence panels ── */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Detailed evidence panels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EVIDENCE_PANELS.map(({ title, signals }) => (
              <div key={title} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border bg-muted/10">
                  <span className="text-sm font-semibold text-foreground">{title}</span>
                </div>
                <div className="divide-y divide-border/50">
                  {signals.map(({ label, status, note }) => {
                    const Icon = ICON[status];
                    return (
                      <div key={label} className="flex items-start gap-3 px-5 py-3.5">
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ICON_COLOR[status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm text-foreground leading-snug">{label}</p>
                            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${CHIP[status]}`}>{status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI diligence questions ── */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-5 pb-4 border-b border-border">AI diligence questions</h2>
          <ol className="space-y-3">
            {AI_DILIGENCE_QUESTIONS.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono text-primary shrink-0 mt-0.5 w-5">{i + 1}.</span>
                <span className="text-sm text-muted-foreground leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <p className="text-sm text-muted-foreground italic">
            All scores are generated from sample data. Professional judgement and source review required before any investment decision.
          </p>
          <Link
            href="/run"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md shrink-0 transition-colors"
          >
            Screen company <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <BetaCTA
        title="Want to test AI defensibility across your targets?"
        body="Screen a sample company, request private beta access, or book a 30-minute intro to discuss AI replica risk and moat evidence in your workflow."
        primaryLabel="Request private beta access"
        primaryHref="/request-pilot"
        eventName="ai_disruption_bottom"
      />
    </div>
  );
}

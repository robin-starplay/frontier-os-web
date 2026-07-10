import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';
import { BookIntroButton } from '@/components/BookIntroButton';
import { BetaCTA } from '@/components/BetaCTA';
import { DocumentReviewPanel } from '@/components/DocumentReviewPanel';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

// ─── source hierarchy (6 tiers) ───────────────────────────────────────────────

const TIERS = [
  {
    tier: 1,
    label: 'Official filings',
    desc: 'Highest authority. Overrides all other sources in conflict resolution.',
    examples: 'Companies House, SEC EDGAR, Handelsregister',
    dot: 'bg-green-500',
    bar: 'w-full',
  },
  {
    tier: 2,
    label: 'Audited annual reports',
    desc: 'Auditor-approved figures. Enters IC memo as fact with standard caveats.',
    examples: 'Statutory accounts, audited consolidated P&L and balance sheet',
    dot: 'bg-green-400',
    bar: 'w-5/6',
  },
  {
    tier: 3,
    label: 'Uploaded documents',
    desc: 'Management-provided material. Claims require verification against Tier 1–2.',
    examples: 'CIM, board packs, management accounts, investor presentations',
    dot: 'bg-blue-400',
    bar: 'w-4/6',
  },
  {
    tier: 4,
    label: 'Company website',
    desc: 'Self-reported marketing content. Treated as claim, not fact.',
    examples: 'Product pages, feature descriptions, case studies, blog posts',
    dot: 'bg-amber-400',
    bar: 'w-3/6',
  },
  {
    tier: 5,
    label: 'Press',
    desc: 'Third-party reporting. Corroborating but not authoritative.',
    examples: 'Tech press, trade publications, LinkedIn announcements',
    dot: 'bg-amber-500',
    bar: 'w-2/6',
  },
  {
    tier: 6,
    label: 'Aggregators',
    desc: 'Estimates and summaries. Lowest authority — used for context only.',
    examples: 'Crunchbase, PitchBook estimates, news digests',
    dot: 'bg-muted-foreground',
    bar: 'w-1/6',
  },
];

// ─── example evidence table (5 rows) ─────────────────────────────────────────

interface EvidenceRow {
  field: string;
  value: string;
  status: string;
  statusColor: string;
  confidence: string;
  confidenceColor: string;
  note?: string;
}

const EXAMPLE_ROWS: EvidenceRow[] = [
  {
    field: 'Revenue',
    value: '—',
    status: 'Unknown',
    statusColor: 'bg-muted/40 text-muted-foreground border-border',
    confidence: 'Unverified',
    confidenceColor: 'text-muted-foreground',
    note: 'Revenue not confirmed from official filings — shown as unknown until a Tier 1 source is indexed',
  },
  {
    field: 'ARR',
    value: '—',
    status: 'Unknown',
    statusColor: 'bg-muted/40 text-muted-foreground border-border',
    confidence: 'Blocking gap',
    confidenceColor: 'text-red-700',
    note: 'Not filed or disclosed — blocks valuation readiness',
  },
  {
    field: 'Adjusted EBITDA',
    value: '[illustrative]',
    status: 'Caveated',
    statusColor: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
    confidence: 'Medium',
    confidenceColor: 'text-amber-700',
    note: 'Non-GAAP — requires statutory reconciliation',
  },
  {
    field: 'AI assistant',
    value: 'Claimed',
    status: 'Claim',
    statusColor: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
    confidence: 'Medium',
    confidenceColor: 'text-amber-700',
    note: 'Product page only — no usage, adoption or revenue proof',
  },
  {
    field: 'Customer concentration',
    value: 'Unknown',
    status: 'Unknown',
    statusColor: 'bg-muted/40 text-muted-foreground border-border',
    confidence: 'High severity',
    confidenceColor: 'text-red-700',
    note: 'No data from any source — blocking gap for IC',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function EvidenceWorkflowPage() {
  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>Evidence workflow</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight max-w-xl">
            Why the evidence workflow matters.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            Frontier OS is not a chatbot. It ranks sources, separates claims from facts, and turns missing evidence into diligence questions.
          </p>
        </div>
      </div>

      {/* Before / after panel */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <SectionLabel>Before and after</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-3">What the workflow changes</h2>
        <p className="text-base text-muted-foreground mb-10 max-w-xl">
          The same target, two views: what a deck says, and what Frontier OS produces from ranked evidence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-7">
            <p className="text-[10px] font-semibold tracking-normal text-red-700 mb-5">Before Frontier OS — deck says</p>
            <div className="space-y-4">
              {[
                { label: 'Revenue',            value: '£50m' },
                { label: 'AI assistant',       value: 'Live' },
                { label: 'Recurring revenue',  value: 'Strong' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground/70 pt-2 leading-snug border-t border-red-500/10 mt-4">
                Source: management deck. No source hierarchy applied. Claims not separated from facts.
              </p>
            </div>
          </div>

          {/* After */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-7">
            <p className="text-[10px] font-semibold tracking-normal text-green-700 mb-5">After Frontier OS — evidence workflow</p>
            <div className="space-y-3">
              {[
                { label: 'Revenue',            value: 'Conflict detected — figures differ between Tier 1 and Tier 3', chip: 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]', chipLabel: 'Conflict' },
                { label: 'AI assistant',       value: 'Claim, not verified adoption — product page only', chip: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]', chipLabel: 'Claim' },
                { label: 'Recurring revenue',  value: 'ARR definition missing — blocks valuation readiness', chip: 'bg-muted/40 text-muted-foreground border-border', chipLabel: 'Unknown' },
              ].map(({ label, value, chip, chipLabel }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${chip}`}>{chipLabel}</span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{value}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-green-500/10 mt-2">
                <p className="text-xs text-foreground font-medium mb-1">Next action</p>
                <p className="text-xs text-muted-foreground leading-snug">Request ARR bridge, AI usage data and customer concentration before IC.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source hierarchy — 6 tiers */}
      <div className="w-full bg-card/30 border-y border-border py-14">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionLabel>Source ranking</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground mb-3">Source hierarchy</h2>
          <p className="text-base text-muted-foreground mb-10 max-w-xl">
            Every input is assigned a tier. When two sources conflict, the higher tier wins and the conflict is flagged for human review.
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            {TIERS.map(({ tier, label, desc, examples, dot, bar }, idx) => (
              <div
                key={tier}
                className={`flex items-start gap-5 px-6 py-5 ${idx < TIERS.length - 1 ? 'border-b border-border' : ''}`}
              >
                {/* Rank + dot */}
                <div className="flex items-center gap-3 shrink-0 w-12 pt-0.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                  <span className="text-sm font-mono font-bold text-foreground">{tier}</span>
                </div>
                {/* Label + desc */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{desc}</p>
                </div>
                {/* Bar + examples */}
                <div className="hidden md:flex flex-col gap-1.5 items-end w-56 shrink-0 pt-0.5">
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                    <div className={`h-full bg-primary/40 rounded-full ${bar}`} />
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-snug text-right">{examples}</p>
                </div>
              </div>
            ))}
            <div className="px-6 py-3.5 bg-muted/10 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Higher tier overrides lower tier in conflict resolution. Conflicts are never silently merged — they are retained and flagged.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example evidence register */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <SectionLabel>Live example</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-3">Example company — evidence register</h2>
        <p className="text-base text-muted-foreground mb-10 max-w-xl">
          Five fields from the same target, showing how each receives a status and a confidence label.
        </p>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-12 bg-muted/30 px-5 py-3 border-b border-border">
            <div className="col-span-3 text-[10px] font-semibold tracking-normal text-muted-foreground">Field</div>
            <div className="col-span-2 text-[10px] font-semibold tracking-normal text-muted-foreground">Value</div>
            <div className="col-span-3 text-[10px] font-semibold tracking-normal text-muted-foreground">Status</div>
            <div className="col-span-4 text-[10px] font-semibold tracking-normal text-muted-foreground">Confidence / note</div>
          </div>
          <div className="divide-y divide-border/50 bg-card">
            {EXAMPLE_ROWS.map(({ field, value, status, statusColor, confidence, confidenceColor, note }) => (
              <div key={field} className="grid grid-cols-12 px-5 py-4 items-start gap-2">
                <div className="col-span-3">
                  <p className="text-sm font-medium text-foreground">{field}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-mono text-foreground">{value}</span>
                </div>
                <div className="col-span-3">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${statusColor}`}>
                    {status}
                  </span>
                </div>
                <div className="col-span-4">
                  <span className={`text-xs font-semibold ${confidenceColor}`}>{confidence}</span>
                  {note && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {EXAMPLE_ROWS.map(({ field, value, status, statusColor, confidence, confidenceColor, note }) => (
            <div key={field} className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{field}</p>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${statusColor}`}>{status}</span>
              </div>
              {value && value !== '—' && <p className="text-sm font-mono text-foreground">{value}</p>}
              <div>
                <span className={`text-xs font-semibold ${confidenceColor}`}>{confidence}</span>
                {note && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contradiction example */}
      <div className="w-full bg-card/30 border-y border-border py-14">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionLabel>Conflict handling</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground mb-3">How conflicts are handled</h2>
          <p className="text-base text-muted-foreground mb-10 max-w-xl">
            When two sources disagree, Frontier OS does not pick a winner silently. It retains both values, records the conflict, and requires human review before IC.
          </p>

          {/* Contradiction card */}
          <div className="rounded-xl border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] p-6 max-w-2xl">
            <div className="flex items-start gap-3 mb-5">
              <AlertCircle className="w-5 h-5 text-[var(--semantic-claim-text)] shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-[var(--semantic-claim-text)] mb-1">Conflict detected — Revenue</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Two sources report different revenue figures for the same period.
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-normal mb-0.5">Tier 3 — Management pack</p>
                  <p className="text-base font-mono font-semibold text-foreground">Revenue £50m</p>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)] shrink-0">Claim</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-normal mb-0.5">Tier 1 — Official filing</p>
                  <p className="text-base font-mono font-semibold text-foreground">Revenue [Tier 1 filing figure]</p>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)] shrink-0">Tier 1</span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-5 py-4">
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Decision</p>
              <p className="text-sm text-foreground leading-relaxed">
                Do not overwrite. Retain as conflict. Management pack figure differs from the Tier 1 official filing.
                Reconcile in diligence before IC.
              </p>
            </div>
          </div>

          {/* Confidence propagation */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <SectionLabel>Confidence propagation</SectionLabel>
              <h3 className="text-xl font-bold text-foreground mb-5">How confidence flows</h3>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {[
                  { from: 'Tier 1 source', result: 'High confidence — enters IC as fact' },
                  { from: 'Tier 2 non-GAAP figure', result: 'Medium confidence — enters IC as caveated' },
                  { from: 'Tier 4 claim', result: 'Low confidence — enters IC as claim requiring verification' },
                  { from: 'Missing data', result: 'Unknown — becomes diligence question' },
                  { from: 'Conflict between tiers', result: 'Flagged — human review required before IC' },
                ].map(({ from, result }) => (
                  <div key={from} className="grid grid-cols-5 px-5 py-4 gap-3 items-start">
                    <span className="col-span-2 text-sm text-muted-foreground">{from}</span>
                    <span className="col-span-3 text-sm text-foreground leading-snug">{result}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Blocking gaps</SectionLabel>
              <h3 className="text-xl font-bold text-foreground mb-5">How unknowns become diligence output</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                A blocking gap is a required metric with no evidence. It does not produce an error — it produces a diligence request.
              </p>
              <div className="space-y-3">
                {[
                  { gap: 'ARR not filed', blocks: 'Valuation readiness', action: 'Request ARR bridge and SaaS/services split' },
                  { gap: 'Customer concentration unknown', blocks: 'IC readiness', action: 'Request customer schedule or top-10 concentration data' },
                  { gap: 'AI moat unproven', blocks: 'AI valuation uplift', action: 'Request AI roadmap, adoption data and inference cost structure' },
                ].map(({ gap, blocks, action }) => (
                  <div key={gap} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-red-700">{gap}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5 pl-6">Blocks: {blocks}</p>
                    <p className="text-sm text-foreground pl-6">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="text-base font-semibold text-foreground mb-1">See the registry sources behind Tier 1 data</p>
            <p className="text-sm text-muted-foreground">Official registry coverage by jurisdiction.</p>
          </div>
          <Link href="/registry-coverage" className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md shrink-0 transition-colors">
            Registry coverage <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Document-assisted review prototype */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-10">
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-4">
          Document-assisted review prototype
        </p>
        <DocumentReviewPanel />
      </div>

      <BetaCTA
        title="Bring evidence ranking into your screening process."
        body="Run a sample screen to see how Frontier OS separates verified facts, claims and unknowns before IC."
        primaryLabel="Run screen"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="evidence_bottom"
      />
    </div>
  );
}

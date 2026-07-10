import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  CheckCircle2, Lock, AlertTriangle, ChevronRight, ArrowRight, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookIntroButton } from '@/components/BookIntroButton';
import { BetaCTA } from '@/components/BetaCTA';
import { SemanticBadge, type LegacyBadgeLevel } from '@/components/SemanticBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Level = Exclude<LegacyBadgeLevel, 'muted'>;

function chip(level: Level, label: string) {
  return <SemanticBadge tone={level}>{label}</SemanticBadge>;
}

// ─── 1. Workflow stages ───────────────────────────────────────────────────────

interface Stage {
  id: number;
  label: string;
  description: string;
  output: string;
  note?: string;
}

const WORKFLOW_STAGES: Stage[] = [
  {
    id: 1,
    label: 'Target intake',
    description: 'Target URL submitted. Frontier OS resolves the entity, confirms Companies House registration, identifies the primary trading subsidiary, and indexes ownership structure across four source tiers.',
    output: 'Entity: Illustrative Target Co. · CR: 08421934 · Jurisdiction: England & Wales · Primary subsidiary confirmed · 4 sources indexed',
  },
  {
    id: 2,
    label: 'URL-only screen',
    description: '8-stage automated screen against public registry and web evidence. Produces a recommendation, IC readiness status, valuation readiness assessment, AI disruption score and a prioritised next-actions list.',
    output: 'Recommendation: Request Financials · IC readiness: Partial · Valuation: Blocked pending ARR bridge · AI replica risk: Medium-high · 3 blocking gaps',
  },
  {
    id: 3,
    label: 'Document-assisted review',
    description: 'CIM, ARR bridge and customer contract documents ingested. Claims extracted from each document and cross-referenced against public and registry evidence. Conflicts and verification gaps are flagged for diligence.',
    output: 'ARR claim confirmed as management estimate only — not audited. SaaS/services split: 78/22. Customer concentration: top 3 = 41% revenue.',
    note: 'Document upload is shown as a sample workflow. No files are processed on this page.',
  },
  {
    id: 4,
    label: 'Evidence registry',
    description: 'All evidence ranked by source tier. Verified facts separated from claims, assumptions and unknowns. Blocking gaps identified and prioritised for the diligence tracker.',
    output: '24 evidence items · 9 verified · 8 claims · 4 assumptions · 3 unknowns · 3 blocking gaps identified',
  },
  {
    id: 5,
    label: 'AI disruption assessment',
    description: 'AI replica risk scored against available evidence. Moat evidence reviewed from public sources. Inference economics estimated. Product expansion potential and OPEX improvement modelled for the buyer thesis.',
    output: 'Replica risk: Medium-high · Moat: Unproven · Inference economics: Unknown (not disclosed) · Expansion potential: Adjacent workflow verticals',
  },
  {
    id: 6,
    label: 'Buyer thesis fit',
    description: 'Target scored against four buyer mandate types: PE add-on, vertical roll-up, corporate development and independent sponsor. Each thesis surfaces what fits, what blocks and the priority diligence question.',
    output: 'PE add-on: 72 / 100 · Vertical roll-up: 65 / 100 · Corp dev: 58 / 100 · Independent sponsor: 48 / 100',
  },
  {
    id: 7,
    label: 'Deal Cockpit update',
    description: 'Target added to the Deal Cockpit pipeline. Recommendation, evidence confidence, IC readiness, valuation readiness and next actions synced automatically. Decision log updated.',
    output: 'Target added · Status: Request Financials · Evidence confidence: Medium · Decision log: 2 entries',
  },
  {
    id: 8,
    label: 'IC pack and tracker export',
    description: 'PowerPoint IC pack and Excel diligence tracker generated from the same analysis. Full evidence register and board memo available for download. All outputs reference source evidence.',
    output: 'IC pack: Illustrative_IC_Pack.pptx · Diligence tracker: Illustrative_Tracker.xlsx · Evidence register: 24 items · Board memo: 1 page',
    note: 'Export is shown as a sample workflow. No real files are generated on this page.',
  },
];

// ─── 2. Sample documents ──────────────────────────────────────────────────────

const SAMPLE_DOCS = [
  { name: 'CIM.pdf',                          type: 'pdf',  size: '2.4 MB', detail: '47 pages' },
  { name: 'ARR_bridge.xlsx',                  type: 'xlsx', size: '184 KB', detail: 'Management pack' },
  { name: 'Customer_contracts.pdf',            type: 'pdf',  size: '5.1 MB', detail: '128 pages' },
  { name: 'Product_security_summary.pdf',      type: 'pdf',  size: '890 KB', detail: '12 pages' },
];

// ─── 3. Cockpit targets ───────────────────────────────────────────────────────

const COCKPIT_TARGETS = [
  {
    company: 'Illustrative Target Co.',   jurisdiction: 'UK',
    recommendation: 'Request Financials',      recLevel: 'amber' as Level,
    icReadiness: 'Partial',
    valuationReadiness: 'Blocked',
    aiRisk: 'Medium-high',                     aiLevel: 'amber' as Level,
    confidence: 'Medium',                      confLevel: 'amber' as Level,
    nextAction: 'Request ARR definition, SaaS/services split and customer concentration from management.',
  },
  {
    company: 'LedgerWorks Billing Ltd.',       jurisdiction: 'UK',
    recommendation: 'Request Financials',      recLevel: 'amber' as Level,
    icReadiness: 'Partial',
    valuationReadiness: 'Caveated',
    aiRisk: 'Low',                             aiLevel: 'green' as Level,
    confidence: 'High',                        confLevel: 'green' as Level,
    nextAction: 'Request ARR bridge and SaaS/services split before IC committee.',
  },
  {
    company: 'VerticalOps CRM GmbH',           jurisdiction: 'DE',
    recommendation: 'Pass',                    recLevel: 'red' as Level,
    icReadiness: 'Blocked',
    valuationReadiness: 'Blocked',
    aiRisk: 'High',                            aiLevel: 'red' as Level,
    confidence: 'Low',                         confLevel: 'grey' as Level,
    nextAction: 'Confirm Handelsregister filings — registry data is blocking IC readiness.',
  },
  {
    company: 'DataRoomOps Ltd.',               jurisdiction: 'UK',
    recommendation: 'Monitor',                 recLevel: 'blue' as Level,
    icReadiness: 'Blocked',
    valuationReadiness: 'Blocked',
    aiRisk: 'Medium',                          aiLevel: 'blue' as Level,
    confidence: 'Medium',                      confLevel: 'amber' as Level,
    nextAction: 'Re-screen in Q3 once management accounts are filed.',
  },
];

// ─── 4. Comparison table ──────────────────────────────────────────────────────

const COMPARE_TARGETS = ['Illustrative Co.', 'LedgerWorks', 'VerticalOps'];

const COMPARE_ROWS: { label: string; vals: string[]; levels?: Level[] }[] = [
  {
    label: 'Strategic fit',
    vals: ['Adjacent — further diligence required', 'Strong — core mandate fit', 'Poor — jurisdiction and AI risk block'],
  },
  {
    label: 'Evidence quality',
    vals: ['Medium — 9/24 verified', 'High — 18/21 verified', 'Low — 4/17 verified'],
    levels: ['amber', 'green', 'red'],
  },
  {
    label: 'AI disruption risk',
    vals: ['Medium-high', 'Low', 'High'],
    levels: ['amber', 'green', 'red'],
  },
  {
    label: 'ARR evidence',
    vals: ['Claimed — unaudited', '£12.4m — Companies House', 'Unknown — no public data'],
    levels: ['amber', 'green', 'red'],
  },
  {
    label: 'EBITDA evidence',
    vals: ['Not disclosed', '£2.1m — filings', 'Not disclosed'],
    levels: ['red', 'green', 'red'],
  },
  {
    label: 'Blocking gaps',
    vals: ['3 — ARR, AI moat, EBITDA', '1 — Customer concentration', '4 — Registry, ARR, AI, EBITDA'],
    levels: ['amber', 'green', 'red'],
  },
  {
    label: 'Next action',
    vals: ['Request financials', 'Advance to IC', 'Pass — re-evaluate Q3'],
    levels: ['amber', 'green', 'red'],
  },
];

// ─── 5. Buyer theses ──────────────────────────────────────────────────────────

const BUYER_THESES = [
  {
    buyer: 'PE add-on',
    score: 72,
    fits: ['Recurring revenue model', 'UK jurisdiction — mandate match', 'Sub-£50m ARR — buy-and-build range'],
    blocks: ['AI moat unproven', 'ARR definition unclear', 'No EBITDA disclosure'],
    question: 'Does management have audited ARR and adjusted EBITDA that supports a 7–10× revenue multiple?',
  },
  {
    buyer: 'Vertical roll-up',
    score: 65,
    fits: ['Workflow automation adjacency', 'SaaS-first model'],
    blocks: ['Customer concentration: top 3 = 41% revenue', 'AI layer not independently validated'],
    question: 'Can the AI workflow layer integrate with the acquirer\'s existing product suite without a full rebuild?',
  },
  {
    buyer: 'Corporate development',
    score: 58,
    fits: ['Strategic adjacency to acquirer workflow tools'],
    blocks: ['Synergies not independently underwritten', 'ARR bridge absent from filings'],
    question: 'What is the credible synergy case and does it survive the ARR definition gap?',
  },
  {
    buyer: 'Independent sponsor',
    score: 48,
    fits: ['Deal size in financing range'],
    blocks: ['AI defensibility risk', 'EBITDA not disclosed', 'Valuation blocked'],
    question: 'What leverage is achievable without confirmed EBITDA? What are lender conditions on AI product claims?',
  },
];

// ─── 6. Export cards ──────────────────────────────────────────────────────────

const EXPORT_CARDS = [
  {
    emoji: '📊',
    title: 'PowerPoint IC pack',
    desc: 'Slide deck covering recommendation, strategic fit, evidence quality, AI disruption analysis, diligence gaps and next actions. Formatted for IC committee presentation.',
    filename: 'Illustrative_IC_Pack.pptx',
  },
  {
    emoji: '📋',
    title: 'Excel diligence tracker',
    desc: 'Structured tracker mapping each evidence item, gap, question and owner. Formatted for deal team and external advisor collaboration.',
    filename: 'Illustrative_Diligence_Tracker.xlsx',
  },
  {
    emoji: '📁',
    title: 'Full evidence register',
    desc: 'Complete register of all 24 evidence items with source tier, confidence score, verification status and conflict notes.',
    filename: 'Illustrative_Evidence_Register.xlsx',
  },
  {
    emoji: '📄',
    title: 'Board memo export',
    desc: 'One-page memo summarising recommendation, key risks, blocking gaps and required next actions for governance approval.',
    filename: 'Illustrative_Board_Memo.pdf',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformDemoPage() {
  const [activeStage, setActiveStage] = useState<number | null>(1);

  return (
    <div className="flex-1 flex flex-col w-full">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 text-center">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">
            Private beta · sample data
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            From target URL to IC pack.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-2 leading-relaxed">
            A sample Team / Platform workflow showing how Frontier OS supports software acquisition screening,
            evidence quality, AI disruption analysis and diligence planning.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 mb-8">
            Team / Platform · 100 deal analyses per month · Private beta pricing on request
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/request-pilot"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
            >
              Request private beta access
            </Link>
            <BookIntroButton
              eventName="clicked_book_intro_platform_hero"
              variant="outline"
              label="Book a 30-minute intro"
              className="h-10 px-6"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 w-full space-y-16">

        {/* ── 2. Workflow timeline ─────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Workflow</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">Team / Platform workflow preview</h2>
          <p className="text-sm text-muted-foreground mb-6">
            See how a team would move from target screening to IC pack, using private beta sample data.
          </p>

          <div className="space-y-2">
            {WORKFLOW_STAGES.map((stage) => {
              const isOpen = activeStage === stage.id;
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'rounded-lg border transition-colors overflow-hidden',
                    isOpen ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/50 hover:bg-card',
                  )}
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => setActiveStage(isOpen ? null : stage.id)}
                    aria-expanded={isOpen}
                  >
                    {/* stage number */}
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 tabular-nums',
                      isOpen
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground',
                    )}>
                      {stage.id}
                    </span>
                    {/* label */}
                    <span className="flex-1 text-sm font-semibold text-foreground">{stage.label}</span>
                    {/* status chip */}
                    <SemanticBadge tone="positive" className="hidden sm:inline-flex gap-1 px-1.5 py-0.5 text-[10px] font-mono shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Complete
                    </SemanticBadge>
                    <ChevronRight className={cn(
                      'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
                      isOpen && 'rotate-90',
                    )} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pl-13 space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed pl-9">{stage.description}</p>
                      <div className="ml-9 rounded-md border border-primary/20 bg-background/60 px-3 py-2.5">
                        <p className="text-[10px] font-semibold tracking-normal text-primary mb-1.5">Sample output</p>
                        <p className="text-xs text-foreground font-mono leading-relaxed">{stage.output}</p>
                      </div>
                      {stage.note && (
                        <p className="ml-9 text-[11px] font-mono text-muted-foreground/60">{stage.note}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Document-assisted workflow preview ────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Document-assisted</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">Document-assisted workflow</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a CIM, ARR bridge, customer contracts or other diligence documents. Frontier OS extracts claims,
            cross-references against public and registry evidence, and flags conflicts for the diligence tracker.
          </p>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* upload zone header */}
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Document intake</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Illustrative Target Co.</span>
            </div>

            {/* file list */}
            <div className="divide-y divide-border">
              {SAMPLE_DOCS.map((doc) => (
                <div key={doc.name} className="px-5 py-3.5 flex items-center gap-4">
                  {/* file type badge */}
                  <div className={cn(
                    'w-9 h-9 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 border',
                    doc.type === 'pdf'
                      ? 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]'
                      : 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',
                  )}>
                    {doc.type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.size} · {doc.detail}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-700 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Processed
                  </span>
                </div>
              ))}
            </div>

            {/* footer notice */}
            <div className="px-5 py-3 border-t border-border bg-muted/10 text-center">
              <p className="text-[11px] font-mono text-muted-foreground/60">
                Document upload is shown as a sample workflow. No files are processed on this page.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. Deal Cockpit preview ──────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Deal Cockpit</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">Pipeline overview</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Screened targets are added to the Deal Cockpit automatically. Track IC readiness, evidence confidence,
            AI risk and next actions across your pipeline in one place.
          </p>

          <div className="rounded-lg border border-border overflow-hidden">
            {/* column headers — desktop */}
            <div
              className="hidden md:grid px-4 py-2.5 bg-muted/30 border-b border-border text-[10px] font-semibold tracking-normal text-muted-foreground"
              style={{ gridTemplateColumns: '1fr 150px 80px 100px 90px' }}
            >
              <span>Company</span>
              <span>Recommendation</span>
              <span>IC ready</span>
              <span>AI risk</span>
              <span>Confidence</span>
            </div>

            {COCKPIT_TARGETS.map((t) => (
              <div key={t.company} className="border-b border-border last:border-0 bg-card hover:bg-muted/10 transition-colors">
                <div className="px-4 py-3.5">
                  {/* desktop */}
                  <div
                    className="hidden md:grid items-start gap-4 w-full"
                    style={{ gridTemplateColumns: '1fr 150px 80px 100px 90px' }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug">{t.company}</p>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {t.jurisdiction}
                      </span>
                    </div>
                    <div className="pt-0.5">{chip(t.recLevel, t.recommendation)}</div>
                    <div className="pt-0.5"><span className="text-xs text-foreground">{t.icReadiness}</span></div>
                    <div className="pt-0.5">{chip(t.aiLevel, t.aiRisk)}</div>
                    <div className="pt-0.5">{chip(t.confLevel, t.confidence)}</div>
                  </div>
                  {/* mobile */}
                  <div className="md:hidden space-y-1.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{t.company}</p>
                      {chip(t.recLevel, t.recommendation)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded text-[10px]">{t.jurisdiction}</span>
                      <span>IC: {t.icReadiness}</span>
                      <span>AI risk: {t.aiRisk}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground leading-snug">
                    <span className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mr-1.5">Next action:</span>
                    {t.nextAction}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-mono text-muted-foreground/60 mt-3 text-center">
            Private beta · sample data ·{' '}
            <Link href="/cockpit?mode=sample" className="text-primary hover:underline">
              View full sample cockpit
            </Link>
          </p>
        </section>

        {/* ── 5. Target comparison preview ─────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Comparison</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">Target comparison</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Compare screened targets side by side across strategic fit, evidence quality, AI disruption risk and
            blocking gaps. Supports IC committee preparation.
          </p>

          <div className="rounded-lg border border-border overflow-x-auto">
            {/* header row */}
            <div
              className="grid bg-muted/30 border-b border-border"
              style={{ gridTemplateColumns: '140px repeat(3, 1fr)', minWidth: '600px' }}
            >
              <div className="px-4 py-3 text-[10px] font-semibold tracking-normal text-muted-foreground">Dimension</div>
              {COMPARE_TARGETS.map((t) => (
                <div key={t} className="px-4 py-3 text-xs font-semibold text-foreground">{t}</div>
              ))}
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={cn('grid border-b border-border/50 last:border-0', i % 2 === 0 ? 'bg-card' : 'bg-muted/5')}
                style={{ gridTemplateColumns: '140px repeat(3, 1fr)', minWidth: '600px' }}
              >
                <div className="px-4 py-3 text-[11px] font-mono text-muted-foreground leading-snug self-start pt-3">
                  {row.label}
                </div>
                {row.vals.map((v, vi) => (
                  <div key={vi} className="px-4 py-3">
                    {row.levels
                      ? chip(row.levels[vi], v)
                      : <p className="text-xs text-foreground leading-snug">{v}</p>
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Buyer thesis preview ──────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Buyer thesis</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">Buyer thesis fit</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The same target screen changes depending on buyer mandate. Frontier OS scores fit for each buyer type,
            surfaces what blocks each thesis, and generates the priority diligence question.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUYER_THESES.map((thesis) => (
              <div key={thesis.buyer} className="rounded-lg border border-border bg-card p-5 space-y-4">
                {/* buyer + score */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Buyer type</p>
                    <p className="text-sm font-bold text-foreground">{thesis.buyer}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-primary/30 bg-primary/5 shrink-0">
                    <span className="text-xl font-bold text-primary leading-none">{thesis.score}</span>
                    <span className="text-[9px] font-mono text-muted-foreground mt-0.5">/100</span>
                  </div>
                </div>

                {/* what fits */}
                <div>
                  <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">What fits</p>
                  <ul className="space-y-1">
                    {thesis.fits.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-700 shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* what blocks */}
                <div>
                  <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">What blocks</p>
                  <ul className="space-y-1">
                    {thesis.blocks.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* next diligence question */}
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">
                    Next diligence question
                  </p>
                  <p className="text-xs text-foreground leading-snug italic">"{thesis.question}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. IC pack and export preview ────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Exports</p>
          <h2 className="text-xl font-bold text-foreground mb-1.5">IC pack and export preview</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Team / Platform includes full export capability. PowerPoint IC pack, Excel diligence tracker, full
            evidence register and board memo — all generated from the same analysis run.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_CARDS.map((card) => (
              <div key={card.title} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
                {/* title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl leading-none">{card.emoji}</span>
                    <p className="text-sm font-bold text-foreground">{card.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>

                {/* locked filename preview */}
                <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-md border border-border bg-muted/20">
                  <span className="text-[11px] font-mono text-muted-foreground truncate">{card.filename}</span>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </div>

                {/* CTAs */}
                <div className="space-y-2 mt-auto">
                  <p className="text-[10px] font-mono text-primary">Included in Team / Platform</p>
                  <Link
                    href="/request-pilot"
                    className="w-full inline-flex items-center justify-center h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors px-3"
                  >
                    Request private beta access
                  </Link>
                  <BookIntroButton
                    eventName={`clicked_book_intro_export_${card.title.replace(/\s+/g, '_')}`}
                    variant="ghost"
                    label="Book intro"
                    showIcon={false}
                    className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-mono text-muted-foreground/60 mt-4 text-center">
            No real PPTX or Excel files are generated on this page. Exports are shown as a sample workflow.
          </p>
        </section>

        {/* ── 8. Pricing tie-in ─────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Pricing</p>
          <h2 className="text-xl font-bold text-foreground mb-6">Team / Platform tier</h2>

          <div className="max-w-sm rounded-xl border border-primary/30 bg-card ring-1 ring-primary/20 p-6">
            {/* header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-bold text-foreground">Team / Platform</p>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                  Private beta
                </span>
              </div>
              <p className="text-xl font-bold text-foreground">Pricing on request</p>
              <p className="text-xs text-muted-foreground mt-0.5">Private beta pricing</p>
            </div>

            {/* features */}
            <div className="space-y-2 mb-6">
              {[
                '100 deal analyses per month',
                'All document-assisted workflows',
                'Deal Cockpit, comparison, buyer thesis',
                'PowerPoint IC pack',
                'Excel diligence tracker',
                'Full exports',
              ].map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="space-y-2">
              <Link
                href="/request-pilot"
                className="w-full inline-flex items-center justify-center h-9 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
              >
                Request private beta access
              </Link>
              <BookIntroButton
                eventName="clicked_book_intro_platform_pricing"
                variant="ghost"
                label="Book a 30-minute intro"
                className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
              />
              <Link
                href="/pricing"
                className="block text-center text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors pt-1"
              >
                Compare all tiers <ArrowRight className="inline w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

      </div>

      <BetaCTA
        title="See this on your own pipeline."
        body="Request private beta access to run the Team / Platform workflow on your own acquisition targets."
        primaryLabel="Request private beta access"
        primaryHref="/request-pilot"
        secondaryLabel=""
        secondaryHref=""
        eventName="platform_demo_bottom"
      />
    </div>
  );
}

import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, XCircle, FileSearch, BarChart3, BrainCircuit, ClipboardList } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

// ─── 4 workflow blocks ────────────────────────────────────────────────────────

const WORKFLOW_BLOCKS = [
  {
    n: '01',
    icon: FileSearch,
    title: 'Source collection',
    body: 'Company website, filings, registry sources and uploaded documents where permitted.',
    detail: 'Each source is assigned a tier. Official filings are Tier 1. Websites are Tier 4. Aggregators are Tier 6. Higher tier wins in conflict resolution.',
  },
  {
    n: '02',
    icon: BarChart3,
    title: 'Evidence ranking',
    body: 'Facts, claims, assumptions and unknowns are classified by source quality and confidence.',
    detail: 'No claim is silently promoted to fact. Conflicts are retained and flagged for human review. Confidence propagates from source quality through each metric.',
  },
  {
    n: '03',
    icon: BrainCircuit,
    title: 'Investment interpretation',
    body: 'AI defensibility, software quality, valuation caveats and buyer fit are assessed.',
    detail: 'Replica risk, AI moat evidence, inference economics and P&L impact. Marketing claims are not treated as verified moat evidence.',
  },
  {
    n: '04',
    icon: ClipboardList,
    title: 'IC-ready output',
    body: 'The result is a recommendation, diligence gaps and next actions.',
    detail: 'IC readiness, valuation readiness, evidence register and diligence request list. The memo is an output. The evidence workflow is the product.',
  },
];

// ─── contrast data ────────────────────────────────────────────────────────────

const CONTRASTS = [
  {
    bad: 'Paste a company name, get an IC memo.',
    good: 'Screen the company. Rank the evidence. Identify what must be verified before IC.',
  },
  {
    bad: 'Treat management claims as facts.',
    good: 'Claims from decks and websites are separated from filings, official sources and verified facts.',
  },
  {
    bad: 'Produce a confident-sounding summary with no sources.',
    good: 'Propagate confidence from each source through the analysis. Low-confidence inputs produce caveated outputs.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>Product</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight max-w-xl">
            The memo is the output. The product is the evidence workflow behind it.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            Frontier OS turns public sources, filings, decks and buyer context into a structured acquisition screen. It separates verified facts from claims, applies a source hierarchy, flags conflicts and turns unknowns into a concrete diligence request list.
          </p>
        </div>
      </div>

      {/* 4 workflow blocks */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <SectionLabel>Workflow</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WORKFLOW_BLOCKS.map(({ n, icon: Icon, title, body, detail }) => (
            <div key={n} className="rounded-xl border border-border bg-card p-7 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">{n}</p>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                </div>
              </div>
              <p className="text-base text-foreground leading-relaxed">{body}</p>
              <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What it is / is not */}
      <div className="w-full bg-card/30 border-y border-border py-14">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-7">
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-5">What it is</p>
              <div className="space-y-3">
                {[
                  'Evidence-first screening workflow',
                  'Source hierarchy enforcement',
                  'Conflict and gap detection',
                  'AI defensibility assessment',
                  'Buyer-specific fit frame',
                  'Structured IC-ready output',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-7">
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-5">What it is not</p>
              <div className="space-y-3">
                {[
                  'A company research database',
                  'A chatbot wrapper',
                  'A one-shot memo generator',
                  'A data room replacement',
                  'A substitute for professional judgement',
                  'A guarantee of investment performance',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contrast — not an AI memo generator */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <SectionLabel>Differentiation</SectionLabel>
        <h2 className="text-2xl font-bold text-foreground mb-10">Why it is not an AI memo generator</h2>
        <div className="space-y-4">
          {CONTRASTS.map(({ bad, good }, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 rounded-xl border border-border overflow-hidden">
              <div className="flex items-start gap-4 px-6 py-5 bg-red-500/5 border-b md:border-b-0 md:border-r border-red-500/10">
                <XCircle className="w-5 h-5 text-red-700/50 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{bad}</p>
              </div>
              <div className="flex items-start gap-4 px-6 py-5 bg-green-500/5">
                <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{good}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-base font-semibold text-foreground mb-1">See the evidence workflow in detail</p>
            <p className="text-sm text-muted-foreground">How source ranking, confidence propagation and conflict detection work.</p>
          </div>
          <Link
            href="/evidence-workflow"
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md shrink-0 transition-colors"
          >
            Evidence workflow <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

    </div>
  );
}

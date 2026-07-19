import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Lock, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import type { BuyerPageData, ChipColor } from '@/data/buyerPages';
import { SemanticBadge } from '@/components/SemanticBadge';

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ text, color }: { text: string; color: ChipColor }) {
  return <SemanticBadge tone={color}>{text}</SemanticBadge>;
}

// ── Sample acquisition screen card ───────────────────────────────────────────

function SampleCard({ data }: { data: BuyerPageData }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-muted-foreground tracking-normal">
            Acquisition screen
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">Public-source preview</span>
      </div>

      {/* Target */}
      <div className="px-5 py-4 border-b border-border/60">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Target</p>
        <p className="text-base font-semibold text-foreground">{data.sampleCardTarget}</p>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {data.sampleRows.map((row, i) => (
          <div key={i} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-muted-foreground shrink-0">{row.label}</span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {row.chip && <Chip text={row.chip.text} color={row.chip.color} />}
              {row.value && (
                <span className={cn(
                  'text-sm text-right max-w-[280px]',
                  row.chip ? 'text-muted-foreground' : 'text-foreground font-medium',
                )}>
                  {row.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          Public-source preview · requires human review
        </span>
        <Link
          href="/app/run"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
        >
          Screen your own <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Bottom CTA band ───────────────────────────────────────────────────────────
// Intentionally standardised across all buyer pages per spec.

function CtaBand() {
  return (
    <div className="border-t border-border bg-card/30">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <p className="text-xl font-bold text-foreground mb-2">
              Want to test Frontier OS on your workflow?
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              Private beta. Outputs require human review and are labelled as such.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/app/run"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Screen company <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/request-pilot"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium border border-border hover:border-primary/40 text-foreground hover:text-primary transition-colors"
            >
              Request private beta access
            </Link>
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book a 30-minute intro
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main template ─────────────────────────────────────────────────────────────

export function BuyerLandingTemplate({ data }: { data: BuyerPageData }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 md:px-8">

        {/* ── 1. Hero ── */}
        <section className="pt-14 pb-12">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-4">
            {data.badge} · PRIVATE BETA
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight max-w-2xl mb-4">
            {data.headline}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-8">
            {data.subheadline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={data.primaryCtaHref}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {data.primaryCtaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {data.secondaryCtaLabel && data.secondaryCtaHref && (
              <Link
                href={data.secondaryCtaHref}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium border border-border hover:border-primary/40 text-foreground hover:text-primary transition-colors"
              >
                {data.secondaryCtaLabel}
              </Link>
            )}
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book a 30-minute intro
            </a>
          </div>
        </section>

        <div className="border-t border-border/60" />

        {/* ── 2. Pain points + 3. How Frontier OS helps ── */}
        <section className="py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Pain points */}
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-5">
              What this audience needs to know before IC
            </p>
            <ul className="space-y-3">
              {data.painPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 shrink-0 mt-2" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* How Frontier OS helps */}
          <div>
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-5">
              How Frontier OS helps
            </p>
            <ul className="space-y-3">
              {data.howHelps.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="border-t border-border/60" />

        {/* ── 4. Sample output card ── */}
        <section className="py-12">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-6">
            Sample acquisition screen · private beta
          </p>
          <div className="max-w-2xl">
            <SampleCard data={data} />
          </div>
        </section>

        <div className="border-t border-border/60" />

        {/* ── 5. Workflow steps ── */}
        <section className="py-12">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-8">
            Workflow
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.workflowSteps.map((step) => (
              <div key={step.number} className="rounded-lg border border-border bg-card/40 p-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                  {step.number}
                </span>
                <p className="text-sm font-semibold text-foreground mb-1">{step.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border/60" />

        {/* ── 6. Locked / private-beta features ── */}
        <section className="py-12">
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-6">
            Coming in private beta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.lockedFeatures.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/30 px-4 py-3 opacity-70"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Request private beta access to use these features as they become available.
          </p>
        </section>

      </div>

      {/* ── 7. Bottom CTA band ── */}
      <CtaBand />
    </div>
  );
}

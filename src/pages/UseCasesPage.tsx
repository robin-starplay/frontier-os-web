import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

interface UseCase {
  id: string;
  persona: string;
  shortDesc: string;
  pain: string;
  workflow: string;
  output: string;
  whyPay: string;
  firstAction: string;
}

const USE_CASES: UseCase[] = [
  {
    id: 'pe',
    persona: 'PE deal team',
    shortDesc: 'Too many teasers, inconsistent quality, gaps found late.',
    pain: 'Teasers arrive faster than they can be screened. Memo quality varies by analyst. Diligence gaps — customer concentration, ARR definition, AI defensibility — surface late in the process after money has been spent.',
    workflow: 'Company URL and any available deck → entity resolved → source hierarchy ranked → evidence classified → IC readiness assessed → diligence request list generated.',
    output: 'Caveated acquisition screen with classified evidence, IC readiness status, valuation caveats and a structured request list.',
    whyPay: 'Cuts teaser-to-IC-screen time. Reduces the risk of avoidable surprises surfacing in confirmatory diligence. Consistent evidence quality across the deal team.',
    firstAction: 'Run screen',
  },
  {
    id: 'rollup',
    persona: 'Software roll-up',
    shortDesc: 'Many targets, varying fit, synergy claims often weak.',
    pain: 'A roll-up acquirer runs dozens of screens per year. Strategic fit varies by target. Synergy claims are often generic and not validated against the specific platform or buyer thesis.',
    workflow: 'Target URL and buyer thesis → strategic fit assessed → AI defensibility check → diligence gaps surfaced → conditional fit view produced.',
    output: 'Conditional fit view showing what is verified, what is claimed, what is unknown and what must be confirmed before price discussion.',
    whyPay: 'Consistent fit assessment across all targets in the pipeline. Buyer-thesis-specific scoring, not generic deal metrics.',
    firstAction: 'Run screen',
  },
  {
    id: 'vc',
    persona: 'VC / growth investor',
    shortDesc: 'AI claims everywhere, moat evidence rare.',
    pain: 'Every growth-stage company now claims AI capability. Distinguishing real AI defensibility from marketing is slow and inconsistent across the investment team.',
    workflow: 'Company URL → AI signal extraction → replica risk assessment → AI moat evidence review → inference economics model → P&L impact assessment.',
    output: 'AI defensibility summary: what is verified, what is claimed, what is unknown, and what diligence questions would change the view.',
    whyPay: 'Structured AI disruption analysis at the speed of sourcing. Reduces risk of overpaying for AI narrative without AI moat.',
    firstAction: 'AI disruption cockpit',
  },
  {
    id: 'ib',
    persona: 'Investment bank / advisor',
    shortDesc: 'Buyer questions are predictable but prep is manual.',
    pain: 'Buyer diligence questions follow predictable patterns — ARR quality, customer concentration, AI defensibility, EBITDA adjustments. Preparing clean answers from client materials is time-intensive and inconsistent.',
    workflow: 'Client materials → evidence register → source hierarchy ranking → buyer-fit narrative → Q&A prep list.',
    output: 'Cleaner buyer Q&A preparation and diligence gap awareness before process launch.',
    whyPay: 'Faster sell-side process preparation. More consistent handling of predictable buyer questions across the deal team.',
    firstAction: 'View evidence workflow',
  },
  {
    id: 'corpdev',
    persona: 'Corp dev team',
    shortDesc: 'Internal acquisition discipline is inconsistent.',
    pain: 'Corporate development teams run multi-track acquisition programmes with varying depth of internal expertise. Evidence quality and IC memo consistency depend on who runs the screen.',
    workflow: 'Target URL → source ranking → evidence classification → strategic fit → IC readiness → acquisition screen draft.',
    output: 'Consistent acquisition screen format with evidence classification, confidence levels and a diligence request list.',
    whyPay: 'Repeatable process. Consistent output across the team regardless of individual analyst experience.',
    firstAction: 'Run screen',
  },
  {
    id: 'oppartner',
    persona: 'Operating partner',
    shortDesc: 'AI disruption risk is a new diligence discipline.',
    pain: 'Operating partners are now expected to assess AI risk for every portfolio addition. The question — can this product be replicated by AI, and does AI expand or compress the business — has no standard framework.',
    workflow: 'Target URL → AI signal extraction → replica risk → AI moat → inference economics → P&L impact → diligence questions.',
    output: 'AI defensibility summary with scored replica risk, moat evidence status and concrete diligence questions for technical and product review.',
    whyPay: 'A structured AI disruption framework applied consistently at the point of acquisition, not retrofitted post-close.',
    firstAction: 'AI disruption cockpit',
  },
];

const CTA_MAP: Record<string, string> = {
  'Run screen': '/run',
  'View evidence workflow': '/evidence-workflow',
  'AI disruption cockpit': '/ai-disruption',
};

export default function UseCasesPage() {
  const [active, setActive] = useState<string>(USE_CASES[0].id);
  const current = USE_CASES.find((u) => u.id === active)!;

  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>Use cases</SectionLabel>
          <h1 className="text-3xl font-bold text-foreground mb-3 leading-tight">
            Who uses Frontier OS and why.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Different buyers use acquisition screening differently. Each persona has a different workflow entry point, different evidence priority and different output format.
          </p>
        </div>
      </div>

      {/* Persona selector */}
      <div className="w-full border-b border-border bg-background sticky top-14 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-0 overflow-x-auto">
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                type="button"
                onClick={() => setActive(uc.id)}
                className={cn(
                  'px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  active === uc.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground/80'
                )}
              >
                {uc.persona}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active use case */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-2">
          <p className="text-xs text-muted-foreground italic mb-1">{current.shortDesc}</p>
          <h2 className="text-xl font-bold text-foreground">{current.persona}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Left column */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-semibold tracking-normal text-red-700/70 mb-2">Current pain</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.pain}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-semibold tracking-normal text-primary/60 mb-2">Workflow</p>
              <p className="text-sm text-foreground leading-relaxed">{current.workflow}</p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-semibold tracking-normal text-green-700/70 mb-2">Output</p>
              <p className="text-sm text-foreground leading-relaxed">{current.output}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-semibold tracking-normal text-amber-700/70 mb-2">Why they would pay</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.whyPay}</p>
            </div>
          </div>
        </div>

        {/* First action CTA */}
        <div className="mt-8 flex items-center gap-4">
          <Link
            href={CTA_MAP[current.firstAction] ?? '/run'}
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
          >
            {current.firstAction} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* All personas overview grid */}
      <div className="w-full bg-card/30 border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionLabel>Summary</SectionLabel>
          <h2 className="text-xl font-bold text-foreground mb-6">All personas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                type="button"
                onClick={() => { setActive(uc.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground mb-1">{uc.persona}</p>
                <p className="text-xs text-muted-foreground">{uc.shortDesc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

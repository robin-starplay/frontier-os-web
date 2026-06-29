import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BUYER_THESIS_TEMPLATES } from '@/data/mockData';
import { BetaCTA } from '@/components/BetaCTA';

// ─────────────────────────────────────────────────────────────────────────────

export default function BuyerThesisPage() {
  const [activeId, setActiveId] = useState(BUYER_THESIS_TEMPLATES[0].id);
  const active = BUYER_THESIS_TEMPLATES.find(t => t.id === activeId)!;

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 py-10">

      {/* header */}
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">Buyer Thesis</p>
        <h1 className="text-2xl font-bold text-foreground">Buyer thesis templates</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Each buyer type has a different screening logic — different objectives, evidence requirements and AI stance.
          Frontier OS assesses targets against the buyer thesis, not in isolation.
        </p>
      </div>

      {/* tab selector — scrollable */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-8">
        <div
          role="tablist"
          aria-label="Buyer thesis templates"
          className="flex gap-1 min-w-max border-b border-border pb-0"
        >
          {BUYER_THESIS_TEMPLATES.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeId === t.id}
              aria-controls={`tabpanel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActiveId(t.id)}
              className={cn(
                'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
                activeId === t.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* tab panel */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
      >

      {/* template detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* left: objective + AI stance + typical output */}
        <div className="lg:col-span-1 space-y-4">

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Objective</p>
            <p className="text-sm text-foreground leading-relaxed">{active.objective}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400">AI stance</p>
            <p className="text-sm text-foreground leading-relaxed">{active.aiStance}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Typical output</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{active.typicalOutput}</p>
          </div>
        </div>

        {/* right: rewards / penalises / required evidence */}
        <div className="lg:col-span-2 space-y-4">

          {/* rewards + penalises */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-green-400 mb-4">Rewards</p>
              <div className="space-y-2">
                {active.rewards.map(r => (
                  <div key={r} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs text-foreground leading-snug">{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-red-400 mb-4">Penalises</p>
              <div className="space-y-2">
                {active.penalises.map(p => (
                  <div key={p} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs text-foreground leading-snug">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* required evidence */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 mb-4">Required evidence</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {active.requiredEvidence.map((e, i) => (
                <div key={e} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 w-4 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-foreground leading-snug">{e}</span>
                </div>
              ))}
            </div>
          </div>

          {/* sample: vertical roll-up detail block */}
          {active.id === 'vertical-rollup' && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 mb-3">Sample screen — vertical roll-up</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Rewards',          value: 'Recurring revenue, durable niche, low churn, management independence.' },
                  { label: 'Penalises',         value: 'Customer concentration, custom services dependency, weak evidence, high AI replica risk.' },
                  { label: 'Required evidence', value: 'ARR, churn, customer concentration, revenue split, product architecture, ownership clarity.' },
                ].map(row => (
                  <div key={row.label} className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground pt-0.5">{row.label}</span>
                    <span className="text-xs text-foreground leading-snug">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>{/* /tabpanel */}

      <BetaCTA
        title="Want to test Frontier OS on your workflow?"
        body="Run a sample screen, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Run screen"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="buyer_thesis_bottom"
      />
    </div>
  );
}

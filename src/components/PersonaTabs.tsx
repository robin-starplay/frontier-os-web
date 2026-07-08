import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, DollarSign, ArrowRight } from 'lucide-react';

interface Persona {
  id: string;
  label: string;
  pain: string[];
  paysFor: string[];
  workflow: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'sponsor',
    label: 'Independent sponsor / searcher',
    pain: [
      'Limited analyst bandwidth',
      'Needs fast target screening',
      'Wants to avoid wasting management calls',
    ],
    paysFor: [
      'URL-only screen',
      'Deal memo draft',
      'Diligence request list',
    ],
    workflow: 'Target URL → public-source screen → request financials',
  },
  {
    id: 'corpdev',
    label: 'Software corp dev',
    pain: [
      'Many inbound and outbound targets',
      'Needs strategic fit against platform',
      'Needs a buyer-specific view, not a generic profile',
    ],
    paysFor: [
      'Strategic-fit scoring',
      'Build / buy / partner view',
      'Integration risk questions',
    ],
    workflow: 'Target + buyer URL → fit screen → IC readiness',
  },
  {
    id: 'pe',
    label: 'PE deal team',
    pain: [
      'Too many teasers, inconsistent memo quality',
      'Diligence gaps discovered too late',
      'Analysts re-typing the same structure each time',
    ],
    paysFor: [
      'Evidence-backed screening',
      'Document reconciliation',
      'IC memo and DD workplan',
    ],
    workflow: 'Teaser / CIM upload → evidence registry → caveated IC draft',
  },
  {
    id: 'op',
    label: 'Operating partner',
    pain: [
      'Needs value creation angle, not just financial profile',
      'Wants AI disruption and operating levers',
      'Needs post-close hypothesis from day one',
    ],
    paysFor: [
      'Software-M&A scorecard',
      'AI disruption lens',
      'Operating diligence questions',
    ],
    workflow: 'Target + platform thesis → operating risk / opportunity map',
  },
  {
    id: 'advisor',
    label: 'Boutique advisor',
    pain: [
      'Needs faster materials review for client prep',
      'Wants repeatable, defensible workflows',
      'Needs buyer-fit narratives quickly',
    ],
    paysFor: [
      'Memo acceleration',
      'Diligence issue spotting',
      'Buyer-specific positioning',
    ],
    workflow: 'Client docs → fact extraction → buyer-specific positioning',
  },
];

export function PersonaTabs() {
  const [activeId, setActiveId] = useState<string>('sponsor');
  const active = PERSONAS.find((p) => p.id === activeId)!;

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              activeId === p.id
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-semibold tracking-normal text-muted-foreground">Pain</h4>
          </div>
          <ul className="space-y-2">
            {active.pain.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-green-500" />
            <h4 className="text-xs font-semibold tracking-normal text-muted-foreground">Pays for</h4>
          </div>
          <ul className="space-y-2">
            {active.paysFor.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-lg bg-card border border-card-border shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold tracking-normal text-muted-foreground">Best first workflow</h4>
          </div>
          <p className="text-sm text-foreground font-medium leading-relaxed">{active.workflow}</p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground">Run this workflow in the sample screen →</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Layers, Database, BarChart3, BrainCircuit, Target, ClipboardList } from 'lucide-react';

interface Module {
  icon: React.ElementType;
  name: string;
  description: string;
  status: string;
  confidence: string;
  confidenceColor: string;
}

const MODULES: Module[] = [
  {
    icon: Layers,
    name: 'Source hierarchy',
    description:
      'Official filings are Tier 1. Audited reports Tier 2. Management decks and websites are Tier 4. Aggregator estimates are Tier 5. Tier overrides Tier in conflict resolution.',
    status: 'Active',
    confidence: 'High',
    confidenceColor: 'text-green-400',
  },
  {
    icon: Database,
    name: 'Evidence registry',
    description:
      'Each claim is classified as Verified fact, Claim, Assumption, Unknown, Conflict or Blocking gap. Classification drives what enters the IC memo and what becomes a diligence question.',
    status: 'Active',
    confidence: 'Medium',
    confidenceColor: 'text-amber-400',
  },
  {
    icon: BarChart3,
    name: 'Software scorecard',
    description:
      'ARR quality, SaaS vs services mix, adjusted EBITDA reconciliation, customer concentration and product defensibility. Each metric shows its source tier and confidence.',
    status: 'Active',
    confidence: 'Medium',
    confidenceColor: 'text-amber-400',
  },
  {
    icon: BrainCircuit,
    name: 'AI disruption',
    description:
      'Assesses replica risk, AI moat evidence, inference economics and P&L impact. Marketing claims are not treated as verified moat evidence. Gaps become diligence questions.',
    status: 'Active',
    confidence: 'Medium',
    confidenceColor: 'text-amber-400',
  },
  {
    icon: Target,
    name: 'Strategic fit',
    description:
      'The target is assessed against a buyer thesis — not in isolation. Fit mode, sector overlap, integration risk and synergy confidence are each given a status, not a headline score.',
    status: 'Active',
    confidence: 'Medium',
    confidenceColor: 'text-amber-400',
  },
  {
    icon: ClipboardList,
    name: 'Diligence gaps',
    description:
      'Unknowns and conflicts are not suppressed. They are converted into a structured request list — what to ask for, why it matters, and what it blocks in the current analysis.',
    status: 'Active',
    confidence: 'High',
    confidenceColor: 'text-green-400',
  },
];

export function WorkflowModules() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        return (
          <div key={mod.name} className="rounded-lg border border-border bg-card p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/10">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{mod.name}</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                {mod.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{mod.description}</p>

            {/* Confidence */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">Confidence</span>
              <span className={`text-[11px] font-semibold font-mono ${mod.confidenceColor}`}>{mod.confidence}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

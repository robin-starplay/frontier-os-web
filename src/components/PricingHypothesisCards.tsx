import React from 'react';
import { Link } from 'wouter';
import { Zap, FileCheck, Search, Target, GitMerge, ShieldAlert, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ValueCard {
  icon: LucideIcon;
  label: string;
}

const VALUE_CARDS: ValueCard[] = [
  { icon: Zap, label: 'Faster first-pass screening' },
  { icon: FileCheck, label: 'Better IC prep' },
  { icon: Search, label: 'Fewer missed diligence gaps' },
  { icon: Target, label: 'Buyer-specific strategic fit' },
  { icon: GitMerge, label: 'Document contradiction detection' },
  { icon: ShieldAlert, label: 'Software-specific risk lens' },
  { icon: RefreshCw, label: 'Repeatable acquisition workflow' },
];

const DELIVERABLES = [
  'Target screen',
  'Evidence register',
  'Strategic-fit view',
  'Valuation caveats',
  'Blocking gaps',
  'DD request list',
  'IC-ready summary',
];

export function PricingHypothesisCards() {
  return (
    <div className="space-y-12">
      {/* Value cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {VALUE_CARDS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Frontier OS is designed to move from free URL-only screens to paid deep screens, team workspaces and advisory workflow sprints.
      </p>

      {/* Deep Screen Sprint */}
      <div className="rounded-xl border border-card-border bg-card p-8 shadow-xs">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-normal text-primary mb-2">First paid workflow</p>
            <h3 className="text-2xl font-bold text-foreground mb-4">Deep Screen Sprint</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Before becoming another SaaS dashboard, Frontier OS can be used as an AI-enabled acquisition screen sprint: 3–5 targets, source-backed evidence, strategic-fit view, valuation caveats and diligence request list.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
              >
                Discuss a pilot workflow
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/run"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium border border-border bg-card hover:bg-muted/20 h-10 px-6 rounded-md transition-colors text-foreground"
              >
                Run screen
              </Link>
            </div>
          </div>

          <div className="w-full md:w-64 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground tracking-normal mb-3">Deliverables</p>
            <ul className="space-y-2">
              {DELIVERABLES.map((d) => (
                <li key={d} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

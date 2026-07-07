import React from 'react';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';

type ChipVariant = 'green' | 'amber' | 'red' | 'blue' | 'muted';

const CHIP: Record<ChipVariant, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red:   'bg-red-500/10   text-red-400   border-red-500/20',
  blue:  'bg-blue-500/10  text-blue-400  border-blue-500/20',
  muted: 'bg-muted/30     text-muted-foreground border-border',
};

function StatusChip({ label, variant }: { label: string; variant: ChipVariant }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${CHIP[variant]}`}>
      {label}
    </span>
  );
}

interface Row {
  label: string;
  value: string;
  chip?: { label: string; variant: ChipVariant };
}

const ROWS: Row[] = [
  { label: 'Company',             value: 'Illustrative Target Co.' },
  { label: 'Recommendation',      value: '',  chip: { label: 'Request Financials', variant: 'amber' } },
  { label: 'IC readiness',        value: '',  chip: { label: 'Partial', variant: 'amber' } },
  { label: 'Valuation readiness', value: 'Financial evidence required', chip: { label: 'Blocked', variant: 'red' } },
  { label: 'Strategic fit',       value: 'Adjacent',   chip: { label: 'Medium confidence', variant: 'blue' } },
  { label: 'AI replica risk',     value: '',  chip: { label: 'Medium-high', variant: 'amber' } },
];

const NEXT_ACTION =
  'Request ARR definition, SaaS / services revenue split, customer concentration schedule and AI feature usage data before IC.';

export function ProductSnapshot() {
  return (
    <div className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">
            Sample acquisition screen
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">Private beta · example screen</span>
      </div>

      {/* Data rows */}
      <div className="divide-y divide-border/50">
        {ROWS.map(({ label, value, chip }) => (
          <div key={label} className="grid grid-cols-5 px-5 py-3 items-center">
            <span className="col-span-2 text-xs font-medium text-muted-foreground">{label}</span>
            <div className="col-span-3 flex items-center gap-2 flex-wrap">
              {value && <span className="text-sm text-foreground font-medium">{value}</span>}
              {chip && <StatusChip label={chip.label} variant={chip.variant} />}
            </div>
          </div>
        ))}

        {/* Next action row */}
        <div className="grid grid-cols-5 px-5 py-3 items-start">
          <span className="col-span-2 text-xs font-medium text-muted-foreground pt-0.5">Next best action</span>
          <p className="col-span-3 text-sm text-foreground leading-snug">{NEXT_ACTION}</p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Static example — not a real company · URL-only mode · source checks shown separately</span>
        <Link
          href="/workflow"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View evidence workflow <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

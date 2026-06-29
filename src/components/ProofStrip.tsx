import React from 'react';
import { ShieldAlert, Lock, TrendingUp, Database, Target, Layers } from 'lucide-react';

const PROOF_POINTS = [
  { icon: ShieldAlert, label: 'AI replica risk' },
  { icon: Lock,        label: 'AI moat assessment' },
  { icon: TrendingUp,  label: 'Inference economics' },
  { icon: Database,    label: 'Registry-backed evidence' },
  { icon: Target,      label: 'Buyer-specific fit' },
  { icon: Layers,      label: 'Source hierarchy' },
];

export function ProofStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-10 pt-8 border-t border-border/40">
      {PROOF_POINTS.map(({ icon: Icon, label }, idx) => (
        <div key={label} className="flex items-center gap-2 text-muted-foreground">
          {idx > 0 && <span className="hidden sm:inline text-border mr-2">·</span>}
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

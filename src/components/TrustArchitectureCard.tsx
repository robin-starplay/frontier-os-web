import React from 'react';
import { Lock } from 'lucide-react';

const ISOLATION_LEVELS = [
  { label: 'Workspace', indent: 0 },
  { label: 'Company project', indent: 1 },
  { label: 'Analysis run', indent: 2 },
  { label: 'Document', indent: 3 },
  { label: 'Evidence record', indent: 4 },
  { label: 'Vector index', indent: 5 },
];

export function TrustArchitectureCard() {
  return (
    <div className="p-5 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Designed isolation model</h4>
      </div>
      <div className="space-y-1.5 mb-4">
        {ISOLATION_LEVELS.map(({ label, indent }) => (
          <div key={label} className="flex items-center gap-2" style={{ paddingLeft: `${indent * 10}px` }}>
            <div className="h-px w-4 bg-primary/30 shrink-0" />
            <span className="text-xs font-mono text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-primary/80 border-t border-primary/10 pt-3 font-medium">
        Default design: one evidence scope per company analysis.
      </p>
    </div>
  );
}

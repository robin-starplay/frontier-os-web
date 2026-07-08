import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type ReadinessStatus = 'ready' | 'partial' | 'planned';

interface ReadinessItem {
  label: string;
  status: ReadinessStatus;
  note?: string;
}

const ITEMS: ReadinessItem[] = [
  { label: 'URL-only screen',                  status: 'ready' },
  { label: 'Evidence registry',                status: 'ready' },
  { label: 'Source hierarchy',                 status: 'ready' },
  { label: 'AI disruption module',             status: 'ready' },
  { label: 'UK registry connector',            status: 'ready' },
  { label: 'US SEC connector',                 status: 'ready',   note: 'Public companies only' },
  { label: 'Germany manual connector',         status: 'partial', note: 'Manual intake; no automated retrieval' },
  { label: 'Document ingestion',               status: 'ready' },
  { label: 'Document reconciliation',          status: 'ready' },
  { label: 'Trust / security copy',            status: 'ready' },
  { label: 'Private beta sample data',          status: 'ready' },
  { label: 'No confidential docs in sample workflow', status: 'ready' },
];

const STATUS_CONFIG: Record<ReadinessStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  ready:   { label: 'Ready',   color: 'text-green-500',         icon: CheckCircle2, bg: 'bg-green-500/10' },
  partial: { label: 'Partial', color: 'text-amber-500',         icon: AlertCircle,  bg: 'bg-amber-500/10' },
  planned: { label: 'Planned', color: 'text-muted-foreground',  icon: Clock,        bg: 'bg-muted/20' },
};

const ready   = ITEMS.filter((i) => i.status === 'ready').length;
const partial = ITEMS.filter((i) => i.status === 'partial').length;
const planned = ITEMS.filter((i) => i.status === 'planned').length;

export function SoftLaunchReadiness() {
  return (
    <div>
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> {ready} ready
        </span>
        {partial > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border border-amber-500/20 px-3 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" /> {partial} partial
          </span>
        )}
        {planned > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/20 text-muted-foreground border border-border px-3 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {planned} planned
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;
          return (
            <div
              key={item.label}
              className={`flex items-start gap-3 rounded-lg border border-border p-3.5 ${cfg.bg}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                {item.note && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.note}</p>
                )}
              </div>
              <span className={`ml-auto text-[10px] font-mono font-semibold shrink-0 ${cfg.color}`}>
                {cfg.label.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';
import type { SemanticStatusVariant } from '@/lib/statusStyles';

interface MetricCardProps {
  label: string;
  value: string;
  source?: string;
  note?: string;
  tone?: Extract<SemanticStatusVariant, 'neutral' | 'warning' | 'positive'>;
  className?: string;
}

export function MetricCard({ label, value, source, note, tone = "neutral", className }: MetricCardProps) {
  const valueToneClass = {
    neutral: 'text-foreground',
    warning: 'text-[var(--semantic-claim-text)]',
    positive: 'text-[var(--semantic-verified-text)]',
  }[tone];

  return (
    <div className={cn("rounded-md border border-border bg-card p-4", className)}>
      <h4 className="text-xs font-medium text-muted-foreground mb-1">{label}</h4>
      <div className={cn("font-mono text-2xl font-bold mb-2", valueToneClass)}>
        {value}
      </div>
      {source && <p className="text-[10px] text-muted-foreground mb-1">Source: {source}</p>}
      {note && (
        <p className={cn("text-[10px] italic", tone === "warning" ? "text-[var(--semantic-claim-text)]" : "text-muted-foreground")}>
          {note}
        </p>
      )}
    </div>
  );
}

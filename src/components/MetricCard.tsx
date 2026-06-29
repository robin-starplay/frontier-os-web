import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  source?: string;
  note?: string;
  variant?: "default" | "warning" | "success";
  className?: string;
}

export function MetricCard({ label, value, source, note, variant = "default", className }: MetricCardProps) {
  return (
    <div className={cn("rounded-md border border-border bg-card p-4", className)}>
      <h4 className="text-xs font-medium text-muted-foreground mb-1">{label}</h4>
      <div className={cn(
        "font-mono text-2xl font-bold mb-2",
        variant === "warning" && "text-amber-500",
        variant === "success" && "text-green-500",
        variant === "default" && "text-foreground"
      )}>
        {value}
      </div>
      {source && <p className="text-[10px] text-muted-foreground mb-1">Source: {source}</p>}
      {note && (
        <p className={cn("text-[10px] italic", variant === "warning" ? "text-amber-500" : "text-muted-foreground")}>
          {note}
        </p>
      )}
    </div>
  );
}
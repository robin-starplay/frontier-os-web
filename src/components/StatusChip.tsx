import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = "verified" | "caveat" | "candidate" | "diligence" | "blocking" | "pending" | "running" | "completed" | "warning";

interface StatusChipProps {
  status: string;
  variant: StatusVariant;
  className?: string;
}

export function StatusChip({ status, variant, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold",
        {
          "border-green-500/20 bg-green-500/10 text-green-500": variant === "verified" || variant === "completed",
          "border-amber-500/20 bg-amber-500/10 text-amber-500": variant === "caveat" || variant === "diligence" || variant === "warning",
          "border-blue-500/20 bg-blue-500/10 text-blue-500": variant === "candidate",
          "border-red-500/20 bg-red-500/10 text-red-500": variant === "blocking",
          "border-muted bg-muted/50 text-muted-foreground": variant === "pending",
          "border-blue-500/30 bg-blue-500/10 text-blue-500 animate-pulse": variant === "running",
        },
        className
      )}
    >
      {variant === "running" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status}
    </span>
  );
}
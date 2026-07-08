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
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
        {
          "border-green-200 bg-green-50 text-green-700": variant === "verified" || variant === "completed",
          "border-amber-200 bg-amber-50 text-amber-700": variant === "caveat" || variant === "diligence" || variant === "warning",
          "border-blue-200 bg-blue-50 text-blue-700": variant === "candidate",
          "border-red-200 bg-red-50 text-red-700": variant === "blocking",
          "border-muted bg-muted/50 text-muted-foreground": variant === "pending",
          "border-blue-200 bg-blue-50 text-blue-700 animate-pulse": variant === "running",
        },
        className
      )}
    >
      {variant === "running" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status}
    </span>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: "low" | "moderate" | "high" | "critical";
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const displayLabel = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold",
        {
          "border-green-500/20 bg-green-500/10 text-green-500": level === "low",
          "border-amber-500/20 bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)]": level === "moderate",
          "border-red-500/20 bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)]": level === "high",
          "border-red-600 bg-red-600/20 text-red-500 font-bold": level === "critical",
        },
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
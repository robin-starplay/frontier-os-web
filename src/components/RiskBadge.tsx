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
          "border-amber-500/20 bg-amber-500/10 text-amber-500": level === "moderate",
          "border-red-500/20 bg-red-500/10 text-red-500": level === "high",
          "border-red-600 bg-red-600/20 text-red-500 font-bold": level === "critical",
        },
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
import React from 'react';
import { cn } from '@/lib/utils';
import { semanticBadgeClass } from '@/components/SemanticBadge';

interface RiskBadgeProps {
  level: "low" | "moderate" | "high" | "critical";
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const displayLabel = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={cn(
        semanticBadgeClass(level === "low" ? "positive" : level === "moderate" ? "warning" : "danger", "px-2 py-0.5"),
        level === "critical" && "font-bold",
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

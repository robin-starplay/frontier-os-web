import React from 'react';
import { cn } from '@/lib/utils';
import { semanticBadgeClass } from '@/components/SemanticBadge';

interface ConfidenceBadgeProps {
  confidence: "low" | "medium" | "high";
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        semanticBadgeClass(confidence === "high" ? "positive" : confidence === "medium" ? "warning" : "unknown", "px-2 py-0.5"),
        className
      )}
    >
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  );
}

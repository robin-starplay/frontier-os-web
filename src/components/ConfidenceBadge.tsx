import React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: "low" | "medium" | "high";
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        {
          "bg-gray-500/10 text-gray-500": confidence === "low",
          "bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)]": confidence === "medium",
          "bg-green-500/10 text-green-500": confidence === "high",
        },
        className
      )}
    >
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  );
}
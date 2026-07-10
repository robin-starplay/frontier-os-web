import React from 'react';
import { cn } from '@/lib/utils';
import { semanticBadgeClass, type SemanticBadgeTone } from '@/components/SemanticBadge';

export type StatusVariant = "verified" | "caveat" | "candidate" | "diligence" | "blocking" | "pending" | "running" | "completed" | "warning";

interface StatusChipProps {
  status: string;
  variant: StatusVariant;
  className?: string;
}

export function StatusChip({ status, variant, className }: StatusChipProps) {
  const tone: SemanticBadgeTone = (
    variant === 'verified' || variant === 'completed' ? 'positive' :
    variant === 'caveat' || variant === 'diligence' || variant === 'warning' ? 'warning' :
    variant === 'candidate' || variant === 'running' ? 'info' :
    variant === 'blocking' ? 'danger' :
    'unknown'
  );
  return (
    <span
      className={cn(
        semanticBadgeClass(tone, undefined, status),
        variant === 'running' && 'animate-pulse',
        className
      )}
    >
      {variant === "running" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status}
    </span>
  );
}

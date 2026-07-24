import React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, LoaderCircle } from 'lucide-react';
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
  const Icon = variant === 'verified' || variant === 'completed'
    ? CheckCircle2
    : variant === 'blocking' || variant === 'warning'
      ? AlertTriangle
      : variant === 'running'
        ? LoaderCircle
        : CircleHelp;
  return (
    <span
      className={cn(
        semanticBadgeClass(tone, undefined, status),
        className
      )}
      role="status"
      aria-label={`${status} status`}
    >
      <Icon className={cn('h-3 w-3', variant === 'running' && 'animate-spin')} aria-hidden="true" />
      {status}
    </span>
  );
}

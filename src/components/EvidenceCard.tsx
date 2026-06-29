import React from 'react';
import { cn } from '@/lib/utils';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatusChip, StatusVariant } from './StatusChip';

interface EvidenceCardProps {
  field: string;
  value: string;
  source: string;
  confidence: "low" | "medium" | "high";
  status: StatusVariant;
  className?: string;
}

/**
 * Sources too weak to support a green "Verified" card.
 * Last-resort defence — callers should also use safeEvidenceStatus before passing status.
 */
const WEAK_CARD_SOURCES = new Set([
  '', '—', '-', '--', 'n/a', 'none', 'not filed', 'not disclosed', 'unknown',
]);

export function EvidenceCard({ field, value, source, confidence, status, className }: EvidenceCardProps) {
  // ── Last-resort defensive rendering ────────────────────────────────────────
  // Even if a caller passes status="verified", downgrade it when the source is
  // weak (empty/generic) or confidence is not high. This prevents any code path
  // from accidentally rendering a green verified card for unsubstantiated data.
  let effectiveStatus: StatusVariant = status;
  let displayLabel = status.charAt(0).toUpperCase() + status.slice(1);

  if (status === 'verified') {
    const src = (source ?? '').trim().toLowerCase();
    const weakSource = WEAK_CARD_SOURCES.has(src);
    const weakConfidence = confidence !== 'high';

    if (weakSource) {
      effectiveStatus = 'pending';
      displayLabel = 'Not verified in this run';
    } else if (weakConfidence) {
      effectiveStatus = 'candidate';
      displayLabel = 'Claim';
    }
  }
  // ── End defensive rendering ─────────────────────────────────────────────────

  const statusColors: Record<StatusVariant, string> = {
    verified:  "bg-green-500",
    caveat:    "bg-amber-500",
    candidate: "bg-blue-500",
    diligence: "bg-amber-500",
    blocking:  "bg-red-500",
    pending:   "bg-muted",
    running:   "bg-blue-500",
    completed: "bg-green-500",
    warning:   "bg-amber-500",
  };

  return (
    <div className={cn("relative flex items-center overflow-hidden rounded-md border border-border bg-card p-4 shadow-sm", className)}>
      <div className={cn("absolute bottom-0 left-0 top-0 w-1", statusColors[effectiveStatus])} />
      <div className="ml-2 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{field}</p>
        <p className="font-mono text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">Source: {source || 'Not verified in this run'}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusChip status={displayLabel} variant={effectiveStatus} />
        <ConfidenceBadge confidence={confidence} />
      </div>
    </div>
  );
}
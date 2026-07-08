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
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium leading-none",
        {
          "border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)]": variant === "verified" || variant === "completed",
          "border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)]": variant === "caveat" || variant === "diligence" || variant === "warning",
          "border-[var(--semantic-info-border)] bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)]": variant === "candidate",
          "border-[var(--semantic-blocker-border)] bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)]": variant === "blocking",
          "border-[var(--semantic-unknown-border)] bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)]": variant === "pending",
          "border-[var(--semantic-info-border)] bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] animate-pulse": variant === "running",
        },
        className
      )}
    >
      {variant === "running" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status}
    </span>
  );
}

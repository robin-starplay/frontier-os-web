import React from 'react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-[var(--semantic-info-text)] bg-[var(--semantic-info-bg)] border-[var(--semantic-info-border)]',
  success: 'text-[var(--semantic-verified-text)] bg-[var(--semantic-verified-bg)] border-[var(--semantic-verified-border)]',
  warning: 'text-[var(--semantic-claim-text)] bg-[var(--semantic-claim-bg)] border-[var(--semantic-claim-border)]',
  muted: 'text-[var(--semantic-unknown-text)] bg-[var(--semantic-unknown-bg)] border-[var(--semantic-unknown-border)]',
};

export function TrustBadge({ label, value, variant = 'default', className }: TrustBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium leading-none",
      variantStyles[variant],
      className
    )}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

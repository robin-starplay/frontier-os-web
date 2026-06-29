import React from 'react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  success: 'text-green-500 bg-green-500/10 border-green-500/20',
  warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  muted: 'text-muted-foreground bg-muted/30 border-border',
};

export function TrustBadge({ label, value, variant = 'default', className }: TrustBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono",
      variantStyles[variant],
      className
    )}>
      <span className="opacity-60 uppercase tracking-wide">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

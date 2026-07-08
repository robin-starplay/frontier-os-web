import React from 'react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-green-700 bg-green-50 border-green-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  muted: 'text-muted-foreground bg-muted/30 border-border',
};

export function TrustBadge({ label, value, variant = 'default', className }: TrustBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]",
      variantStyles[variant],
      className
    )}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

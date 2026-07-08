import React from 'react';
import { cn } from '@/lib/utils';
import { semanticBadgeClass } from './SemanticBadge';

interface TrustBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: semanticBadgeClass('info'),
  success: semanticBadgeClass('verified'),
  warning: semanticBadgeClass('partial'),
  muted: semanticBadgeClass('unknown'),
};

export function TrustBadge({ label, value, variant = 'default', className }: TrustBadgeProps) {
  return (
    <div className={cn(
      variantStyles[variant],
      className
    )}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';
import { semanticBadgeClass, type SemanticBadgeTone } from './SemanticBadge';

interface TrustBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
  className?: string;
}

const variantTone: Record<string, SemanticBadgeTone> = {
  default: 'info',
  success: 'positive',
  warning: 'warning',
  muted: 'neutral',
};

export function TrustBadge({ label, value, variant = 'default', className }: TrustBadgeProps) {
  return (
    <div className={cn(
      semanticBadgeClass(variantTone[variant], undefined, value || label),
      className
    )}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

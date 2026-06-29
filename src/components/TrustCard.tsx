import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface TrustCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  iconColor?: string;
}

export function TrustCard({ icon: Icon, title, body, className, iconColor = 'text-primary' }: TrustCardProps) {
  return (
    <div className={cn(
      "flex flex-col p-5 rounded-lg bg-card border border-card-border hover:border-primary/30 transition-colors",
      className
    )}>
      <div className={cn("h-8 w-8 rounded bg-primary/10 flex items-center justify-center mb-3 shrink-0", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1.5">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

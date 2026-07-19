import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useAccess, type GateReason } from '@/contexts/AccessContext';

interface LockedSectionProps {
  title: string;
  description: string;
  reason: GateReason;
  /** Optional preview items to show grayed out */
  preview?: string[];
}

export function LockedSection({ title, description, reason, preview }: LockedSectionProps) {
  const { openGate } = useAccess();

  return (
    <div className="rounded-lg border border-border border-dashed bg-muted/10 overflow-hidden">
      {/* Preview rows — blurred placeholder */}
      {preview && preview.length > 0 && (
        <div className="px-4 py-3 border-b border-border/50 space-y-2 select-none pointer-events-none">
          {preview.map((item, i) => (
            <div key={i} className="flex items-center gap-3 blur-[3px] opacity-40">
              <div className="w-24 h-2.5 rounded bg-muted-foreground/20" />
              <div className="flex-1 h-2.5 rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      )}

      {/* Lock CTA */}
      <button
        type="button"
        onClick={() => openGate(reason)}
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/20 transition-colors text-left group"
        aria-label={`Request access to ${title}`}
      >
        <div className="w-8 h-8 rounded-full border border-border bg-muted/30 flex items-center justify-center shrink-0 group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">
          <Lock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
      </button>
    </div>
  );
}

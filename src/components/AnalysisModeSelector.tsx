import React from 'react';
import { Globe, FolderOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type AnalysisMode = 'safe-start' | 'private-doc' | 'hybrid';

interface ModeConfig {
  id: AnalysisMode;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeClass: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'safe-start',
    icon: Globe,
    title: 'Safe Start',
    subtitle: 'Public URLs only',
    description: 'Best for first screens and early market mapping. No confidential documents required.',
    badge: 'Lowest friction',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  },
  {
    id: 'private-doc',
    icon: FolderOpen,
    title: 'Private Document Review',
    subtitle: 'Upload diligence materials',
    description: 'Analyse management packs, CIMs, annual reports and board decks inside a company-scoped workspace.',
    badge: 'Higher confidence',
    badgeClass: 'bg-green-500/10 text-green-700 border-green-500/20',
  },
  {
    id: 'hybrid',
    icon: Layers,
    title: 'Hybrid Diligence',
    subtitle: 'Public sources + documents',
    description: 'Combine filings, websites, registry data and uploaded documents to reconcile claims and surface diligence gaps.',
    badge: 'Most complete',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  },
];

interface AnalysisModeSelectorProps {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}

export function AnalysisModeSelector({ value, onChange }: AnalysisModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex flex-col p-4 rounded-lg border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/10"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "h-8 w-8 rounded flex items-center justify-center shrink-0",
                isSelected ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn(
                "text-[9px] font-semibold tracking-normal px-1.5 py-0.5 rounded border ml-2",
                mode.badgeClass
              )}>
                {mode.badge}
              </span>
            </div>
            <p className={cn("text-sm font-semibold mb-0.5", isSelected ? "text-foreground" : "text-foreground/80")}>
              {mode.title}
            </p>
            <p className="text-xs text-muted-foreground mb-2">{mode.subtitle}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}

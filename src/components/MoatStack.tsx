import React from 'react';
import { BookOpen, Layers, Target, BarChart2, Cpu, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Module {
  icon: LucideIcon;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  iconBg: string;
}

const MODULES: Module[] = [
  {
    icon: BookOpen,
    number: 1,
    title: 'Evidence Registry',
    subtitle: 'Facts, claims, assumptions, unknowns and conflicts.',
    description: 'Every material point is classified before it reaches the memo.',
    accent: 'border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'bg-blue-500/10 text-blue-400',
  },
  {
    icon: Layers,
    number: 2,
    title: 'Source Hierarchy',
    subtitle: 'Official filings outrank lower-confidence claims.',
    description: 'Registry data, audited accounts, uploaded documents, websites and aggregators are ranked explicitly.',
    accent: 'border-green-500/30 hover:border-green-500/60',
    iconBg: 'bg-green-500/10 text-green-500',
  },
  {
    icon: Target,
    number: 3,
    title: 'Buyer-Specific Fit',
    subtitle: 'Good company is not the same as good acquisition.',
    description: 'Strategic fit is assessed against the buyer, platform, thesis and integration logic.',
    accent: 'border-primary/30 hover:border-primary/60',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    icon: BarChart2,
    number: 4,
    title: 'Software-M&A Scorecard',
    subtitle: 'Built for software acquisition judgement.',
    description: 'ARR quality, services mix, adjusted EBITDA, customer concentration, product defensibility and implementation risk.',
    accent: 'border-violet-500/30 hover:border-violet-500/60',
    iconBg: 'bg-violet-500/10 text-violet-400',
  },
  {
    icon: Cpu,
    number: 5,
    title: 'AI Disruption Lens',
    subtitle: 'Is the software asset becoming easier to replicate?',
    description: 'Flags AI-native substitution risk, workflow defensibility and potential rebuildability exposure.',
    accent: 'border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'bg-amber-500/10 text-amber-500',
  },
  {
    icon: AlertTriangle,
    number: 6,
    title: 'Diligence Gap Engine',
    subtitle: 'What do we need before IC?',
    description: 'Turns uncertainty into specific data requests, DD questions and next actions.',
    accent: 'border-red-500/30 hover:border-red-500/60',
    iconBg: 'bg-red-500/10 text-red-400',
  },
];

export function MoatStack() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        return (
          <div
            key={mod.number}
            className={cn(
              "relative flex flex-col p-5 rounded-lg bg-card border transition-colors",
              mod.accent
            )}
          >
            <div className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground/40 tabular-nums">
              {String(mod.number).padStart(2, '0')}
            </div>
            <div className={cn("h-9 w-9 rounded flex items-center justify-center mb-4 shrink-0", mod.iconBg)}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{mod.title}</h4>
            <p className="text-xs text-primary/70 font-medium mb-2">{mod.subtitle}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
          </div>
        );
      })}
    </div>
  );
}

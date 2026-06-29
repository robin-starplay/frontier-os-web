import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapPhase {
  id: string;
  label: string;
  color: string;
  headerBg: string;
  icon: typeof CheckCircle2;
  items: string[];
}

const PHASES: RoadmapPhase[] = [
  {
    id: 'now',
    label: 'Now',
    color: 'text-green-500',
    headerBg: 'bg-green-500/10 border-green-500/30',
    icon: CheckCircle2,
    items: [
      'URL-only screens',
      'Source hierarchy',
      'Evidence registry',
      'IC readiness',
      'Software-M&A scorecard',
    ],
  },
  {
    id: 'next',
    label: 'Next',
    color: 'text-primary',
    headerBg: 'bg-primary/10 border-primary/30',
    icon: Circle,
    items: [
      'International registry connectors',
      'Document reconciliation',
      'Buyer thesis templates',
      'AI disruption module',
      'Frontend / backend API integration',
    ],
  },
  {
    id: 'later',
    label: 'Later',
    color: 'text-muted-foreground',
    headerBg: 'bg-muted/30 border-border',
    icon: Clock,
    items: [
      'Custom workflow templates',
      'Team workspaces',
      'Audit trails',
      'Recurring monitoring',
      'User feedback loop on facts',
      'Benchmark database',
    ],
  },
];

export function MoatRoadmap() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PHASES.map((phase) => {
        const Icon = phase.icon;
        return (
          <div key={phase.id} className="rounded-lg bg-card border border-border overflow-hidden">
            <div className={cn("flex items-center gap-2 px-5 py-3 border-b", phase.headerBg)}>
              <Icon className={cn("h-4 w-4", phase.color)} />
              <span className={cn("text-sm font-semibold", phase.color)}>{phase.label}</span>
            </div>
            <ul className="p-5 space-y-3">
              {phase.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", phase.id === 'now' ? 'bg-green-500' : phase.id === 'next' ? 'bg-primary' : 'bg-muted-foreground/40')} />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

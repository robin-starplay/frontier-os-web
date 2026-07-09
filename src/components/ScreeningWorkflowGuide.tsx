import { Link } from 'wouter';
import { CheckCircle2, GitCompare, LayoutDashboard, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScreeningWorkflowStep = 'originate' | 'run' | 'cockpit' | 'compare';

type StepConfig = {
  id: ScreeningWorkflowStep;
  label: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Search;
};

const STEPS: StepConfig[] = [
  {
    id: 'originate',
    label: 'Originate',
    description: 'Build or paste a source-backed target universe.',
    href: '/app/origination',
    cta: 'Open origination',
    icon: Search,
  },
  {
    id: 'run',
    label: 'Run screen',
    description: 'Screen each company URL individually to collect evidence.',
    href: '/app/run',
    cta: 'Run screen',
    icon: ShieldCheck,
  },
  {
    id: 'cockpit',
    label: 'Save to Cockpit',
    description: 'Keep screened targets, decisions and next actions.',
    href: '/app/cockpit',
    cta: 'Open Cockpit',
    icon: LayoutDashboard,
  },
  {
    id: 'compare',
    label: 'Compare',
    description: 'Compare screened candidates side by side.',
    href: '/app/compare',
    cta: 'Compare targets',
    icon: GitCompare,
  },
];

export function ScreeningWorkflowGuide({
  active,
  className,
  compact = false,
}: {
  active: ScreeningWorkflowStep;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-card shadow-xs', className)}>
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground">Screening workflow</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Originate leads, screen one company at a time, save evidence, then compare screened targets.
        </p>
      </div>
      <div className={cn(
        'grid gap-0 divide-y divide-border',
        compact ? 'md:grid-cols-4 md:divide-y-0 md:divide-x' : 'sm:grid-cols-2 lg:grid-cols-4 sm:divide-y-0 sm:divide-x',
      )}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === active;
          const isCompleted = STEPS.findIndex(item => item.id === active) > index;
          return (
            <div
              key={step.id}
              className={cn(
                'px-4 py-3',
                isActive ? 'bg-primary/5' : 'bg-transparent',
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                  isActive
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : isCompleted
                      ? 'border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)]'
                      : 'border-border bg-background text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  {isActive && <p className="text-[10px] font-semibold text-primary">Current step</p>}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              {!isActive && (
                <Link
                  href={step.href}
                  className="mt-2 inline-flex text-xs font-medium text-primary hover:text-primary/80"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

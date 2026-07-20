import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, GitCompare, LayoutDashboard, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScreeningWorkflowStep = 'originate' | 'run' | 'cockpit' | 'compare';

type StepConfig = {
  id: ScreeningWorkflowStep;
  label: string;
  accessibleLabel: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Search;
};

const STEPS: StepConfig[] = [
  {
    id: 'originate',
    label: 'Originate',
    accessibleLabel: 'Originate — Open workflow step',
    description: 'Build or paste a source-backed target universe.',
    href: '/app/origination',
    cta: 'Open origination',
    icon: Search,
  },
  {
    id: 'run',
    label: 'Screen',
    accessibleLabel: 'Screen — Open workflow step',
    description: 'Screen one company URL to collect evidence.',
    href: '/app/run',
    cta: 'Screen company',
    icon: ShieldCheck,
  },
  {
    id: 'cockpit',
    label: 'Cockpit',
    accessibleLabel: 'Save to Cockpit — Open workflow step',
    description: 'Keep screened targets, decisions and next actions.',
    href: '/app/cockpit',
    cta: 'Open Cockpit',
    icon: LayoutDashboard,
  },
  {
    id: 'compare',
    label: 'Compare',
    accessibleLabel: 'Compare — Open workflow step',
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
  originationAvailable = false,
}: {
  active?: ScreeningWorkflowStep;
  className?: string;
  compact?: boolean;
  originationAvailable?: boolean;
}) {
  return (
    <div className={cn('surface-raised overflow-hidden rounded-2xl', className)}>
      <div className="border-b border-border/70 px-6 py-6 text-center md:px-8 md:py-8">
        <p className="page-eyebrow mb-2">Screening workflow</p>
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Origination → Screen → Cockpit → Compare
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Move from a source-backed target universe to evidence-led screening, decision tracking and comparable candidates.
        </p>
      </div>
      <div className={cn('relative grid gap-0 divide-y divide-border px-2 py-3 md:divide-y-0 md:px-4 md:py-5', compact ? 'md:grid-cols-4' : 'md:grid-cols-4')}>
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[3.75rem] hidden h-px bg-border md:block" />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === active;
          const isCompleted = STEPS.findIndex(item => item.id === active) > index;
          return (
            <Link
              key={step.id}
              href={step.href}
              aria-label={step.accessibleLabel}
              className={cn(
                'group relative flex min-h-48 flex-col items-center rounded-xl px-5 py-5 text-center transition-colors hover:bg-accent/35 md:px-6 md:py-6',
                isActive ? 'surface-selected border-0 shadow-none' : 'bg-transparent',
              )}
            >
              <span className={cn(
                  'relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-sm transition-transform group-hover:scale-105',
                  isActive
                    ? 'border-primary/25 bg-primary/[0.08] text-primary'
                    : isCompleted
                      ? 'border-border bg-muted/40 text-muted-foreground'
                      : 'border-border bg-background text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </span>
              <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Step {index + 1}
              </span>
              <p className="mt-1 text-base font-semibold text-foreground">{step.label}</p>
              {isActive && <p className="mt-1 text-[11px] font-semibold text-primary">Current step</p>}
              <p className="mt-2 max-w-52 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              {step.id === 'originate' && originationAvailable && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex rounded-full border border-[var(--semantic-info-border)] bg-[var(--semantic-info-bg)] px-2 py-1 text-[11px] font-semibold leading-none text-[var(--semantic-info-text)]">
                    Targets available
                  </span>
                </div>
              )}
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-primary">
                {isActive ? 'Continue here' : step.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

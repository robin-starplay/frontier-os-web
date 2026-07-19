import React from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FolderKanban,
  GitCompare,
  HelpCircle,
  LockKeyhole,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { semanticBadgeClass } from '@/components/SemanticBadge';
import { ScreeningWorkflowGuide } from '@/components/ScreeningWorkflowGuide';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="page-eyebrow mb-2">{children}</p>;
}

function Badge({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'verified' | 'claim' | 'blocker' | 'info' | 'unknown';
}) {
  const tones = {
    verified: 'verified',
    claim:    'partial',
    blocker:  'blocker',
    info:     'info',
    unknown:  'unknown',
  } as const;

  return <span className={semanticBadgeClass(tones[tone])}>{children}</span>;
}

const EXPECTATIONS = [
  'Origination returns leads and research sources unless confirmed company websites are available.',
  'Screen creates the evidence-first acquisition screen for one company website at a time.',
  'Cockpit stores screened targets, recommendations, blockers and next actions.',
  'Compare works best with screened Cockpit targets; manual quick compare is a public-source preview.',
];

const SAMPLE_SCREENS = [
  {
    title: 'Origination lead',
    badge: 'Lead',
    tone: 'unknown' as const,
    icon: Radar,
    rows: [
      ['Status', 'Website needs confirmation'],
      ['Evidence', 'Source mention only'],
      ['Next action', 'Confirm official company website'],
    ],
  },
  {
    title: 'Evidence screen',
    badge: 'Screened',
    tone: 'info' as const,
    icon: FileSearch,
    rows: [
      ['Verified facts', 'Source-backed public evidence'],
      ['Company claims', 'Document values kept as claims'],
      ['Blockers', 'Revenue quality not verified'],
    ],
  },
  {
    title: 'Cockpit target',
    badge: 'Saved',
    tone: 'verified' as const,
    icon: FolderKanban,
    rows: [
      ['Recommendation', 'Request financials'],
      ['Evidence confidence', 'Partial'],
      ['Next action', 'Request ARR bridge'],
    ],
  },
  {
    title: 'Compare screened targets',
    badge: 'Compare-ready',
    tone: 'verified' as const,
    icon: GitCompare,
    rows: [
      ['Inputs', 'Saved Cockpit targets'],
      ['Mode', 'Side-by-side preview'],
      ['Best use', 'After individual screens'],
    ],
  },
];

const TRUST_BULLETS = [
  'No fabricated revenue, ARR or customer counts.',
  'Document-derived values are company claims unless externally verified.',
  'Verified facts require source metadata.',
  'Unknowns and blockers are surfaced instead of hidden.',
];

const AVAILABLE_NOW = [
  'Website-only screen',
  'Website + non-confidential PDF',
  'Deal Cockpit',
  'Manual quick compare',
  'Target ranking with known targets',
];

const LIMITED = [
  'Live origination discovery',
  'Deep AI risk workflow',
  'Exports / team workflows',
  'Confidential document workflows',
];

function SampleCard({
  sample,
}: {
  sample: typeof SAMPLE_SCREENS[number];
}) {
  const Icon = sample.icon;
  return (
    <div className="surface-raised flex min-h-72 flex-col overflow-hidden rounded-xl p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="min-w-0 text-base font-semibold leading-snug text-foreground">{sample.title}</h3>
        </div>
        <Badge tone={sample.tone}>{sample.badge}</Badge>
      </div>
      <div className="surface-flat flex-1 overflow-hidden rounded-lg">
        {sample.rows.map(([label, value], index) => (
          <div
            key={label}
            className={`flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-5 ${index > 0 ? 'border-t border-border/70' : ''}`}
          >
            <p className="shrink-0 font-medium text-muted-foreground sm:w-32">{label}</p>
            <p className="min-w-0 break-words font-semibold leading-snug text-foreground sm:text-right">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvailabilityCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'verified' | 'claim';
}) {
  return (
    <div className="surface-raised rounded-xl p-6">
      <Badge tone={tone}>{title}</Badge>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex-1">
      <section className="border-b border-border bg-card/35">
        <div className="app-container py-16 lg:py-20">
          <div className="max-w-4xl">
            <SectionLabel>How it works</SectionLabel>
            <h1 className="page-title max-w-3xl">
              How Frontier OS works
            </h1>
            <p className="page-subtitle mt-5">
              Move from target discovery to evidence-backed screening, saved decisions and target comparison.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/run"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Screen a company <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/app/origination"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/70"
              >
                Start with Origination
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-12">
        <ScreeningWorkflowGuide />
      </section>

      <section className="border-y border-border bg-muted/35">
        <div className="app-container py-12">
          <div className="mb-8">
            <SectionLabel>What users should expect</SectionLabel>
            <h2 className="section-title">Clear workflow states, not inflated certainty.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {EXPECTATIONS.map((item) => (
              <div key={item} className="surface-raised flex min-h-24 items-start gap-3 rounded-xl p-5">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="app-container grid gap-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-raised rounded-xl p-7">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <SectionLabel>Trust rules</SectionLabel>
            <h2 className="section-title mb-5">Built for evidence, not guesswork.</h2>
            <div className="space-y-3">
              {TRUST_BULLETS.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <AvailabilityCard title="Available now" tone="verified" items={AVAILABLE_NOW} />
            <AvailabilityCard title="Private beta / limited" tone="claim" items={LIMITED} />
          </div>
        </div>
      </section>

      <section className="app-container py-12">
        <div className="surface-raised rounded-xl p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <SectionLabel>Next step</SectionLabel>
              <h2 className="section-title">Start with a known target or build a source-backed universe.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Use Origination for leads and source-backed target ranking, then screen companies individually before saving and comparing.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/app/run"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Screen a company <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/app/origination"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/70"
              >
                Start with Origination
              </Link>
              <a
                href={BOOK_INTRO_URL || '/request-pilot'}
                target={BOOK_INTRO_URL ? '_blank' : undefined}
                rel={BOOK_INTRO_URL ? 'noopener noreferrer' : undefined}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              >
                Request access <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/35">
        <div className="app-container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Confidential document workflows remain limited in the public preview.
            </p>
          </div>
          <Link href="/trust" className="text-sm font-semibold text-primary hover:underline">
            Review trust model
          </Link>
        </div>
      </section>
    </div>
  );
}

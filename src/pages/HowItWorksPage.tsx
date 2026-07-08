import React from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  GitCompare,
  HelpCircle,
  ListChecks,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { semanticBadgeClass } from '@/components/SemanticBadge';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-primary mb-2">{children}</p>;
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

  return (
    <span className={semanticBadgeClass(tones[tone])}>
      {children}
    </span>
  );
}

function StepCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function OutputCard({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  tone: 'verified' | 'claim' | 'blocker' | 'info' | 'unknown';
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <Badge tone={tone}>{title}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ProductAreaCard({
  icon: Icon,
  title,
  body,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {badge && <Badge tone="unknown">{badge}</Badge>}
      </div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function MockShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="flex items-center justify-between border-b border-border bg-muted/45 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge tone="unknown">Synthetic example</Badge>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InputMock() {
  const rows = [
    ['Company', '[Company name]'],
    ['Website', '[Website URL]'],
    ['Document', 'Non-confidential PDF'],
    ['Buyer thesis', 'Optional'],
  ];

  return (
    <MockShell title="Input screen">
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {value}
            </div>
          </div>
        ))}
        <div className="pt-1">
          <div className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            Run evidence-first screen
          </div>
        </div>
      </div>
    </MockShell>
  );
}

function EvidenceMock() {
  const cards = [
    ['Recommendation', 'Request financials', 'claim' as const],
    ['IC readiness', 'Partial', 'claim' as const],
    ['Evidence confidence', 'Medium', 'info' as const],
    ['AI replica risk', 'Medium', 'claim' as const],
    ['Main blocker', 'Revenue quality not yet verified', 'blocker' as const],
    ['Next action', 'Request ARR bridge and customer concentration', 'info' as const],
  ];

  return (
    <MockShell title="Evidence screen">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-snug text-foreground">{value}</p>
              <Badge tone={tone}>{label === 'Main blocker' ? 'Blocker' : label === 'Evidence confidence' ? 'Info' : 'Needs review'}</Badge>
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function CockpitMock() {
  const rows = [
    ['Target', 'Example target'],
    ['Status', 'Needs review'],
    ['Evidence', 'Partial'],
    ['Blocker', 'Financial evidence required'],
    ['Next action', 'Request management accounts'],
  ];

  return (
    <MockShell title="Cockpit">
      <div className="rounded-lg border border-border">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className={`grid grid-cols-[110px_1fr] gap-3 px-3 py-3 text-sm ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <p className="font-medium text-muted-foreground">{label}</p>
            <p className="font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

const OUTPUTS = [
  {
    icon: BadgeCheck,
    title: 'Verified facts',
    body: 'Source-backed public information with URL or filing evidence.',
    tone: 'verified' as const,
  },
  {
    icon: FileText,
    title: 'Company claims',
    body: 'Statements extracted from documents or websites. Useful, but not independently verified.',
    tone: 'claim' as const,
  },
  {
    icon: HelpCircle,
    title: 'Unknowns',
    body: 'Important gaps where evidence is missing or unclear.',
    tone: 'unknown' as const,
  },
  {
    icon: TriangleAlert,
    title: 'Diligence blockers',
    body: 'Issues that stop the target from being IC-ready.',
    tone: 'blocker' as const,
  },
  {
    icon: ListChecks,
    title: 'Next questions',
    body: 'Questions to ask management, advisors or internal deal teams.',
    tone: 'info' as const,
  },
  {
    icon: ClipboardList,
    title: 'Documents to request',
    body: 'A practical diligence request list.',
    tone: 'info' as const,
  },
];

const PRODUCT_AREAS = [
  {
    icon: Building2,
    title: 'Run',
    body: 'Screen a known company using website-only or website + document.',
  },
  {
    icon: FolderKanban,
    title: 'Cockpit',
    body: 'Save reviewed companies and track recommendation, evidence confidence, blockers and next action.',
  },
  {
    icon: GitCompare,
    title: 'Compare',
    body: 'Compare shortlisted targets side by side.',
    badge: 'Preview',
  },
  {
    icon: Radar,
    title: 'Origination',
    body: 'Private-beta workflow for source-backed target discovery. Frontier OS does not invent targets.',
    badge: 'Private beta',
  },
  {
    icon: Sparkles,
    title: 'AI Risk',
    body: 'Assess AI replica risk and defensibility signals.',
    badge: 'Preview',
  },
  {
    icon: LockKeyhole,
    title: 'Request Pilot',
    body: 'Request private beta access or book an intro.',
  },
];

const TRUST_BULLETS = [
  'No fabricated revenue, ARR or customer counts.',
  'Document-derived values are treated as company claims unless externally verified.',
  'Verified facts require source metadata.',
  'Unknowns and blockers are surfaced instead of hidden.',
  'Confidential document workflows are not enabled in the public preview.',
];

export default function HowItWorksPage() {
  return (
    <div className="flex-1">
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-18">
          <div>
            <SectionLabel>How it works</SectionLabel>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-foreground md:text-5xl">
              How Frontier OS works
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Turn a company website and one non-confidential document into an evidence-first acquisition screen, with verified facts, company claims, unknowns, blockers and next diligence questions separated clearly.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/run"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Run a screen <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/request-pilot"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/70"
              >
                Request private beta access
              </Link>
            </div>
          </div>
          <EvidenceMock />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <SectionLabel>Three-step workflow</SectionLabel>
        <h2 className="mb-8 text-2xl font-bold text-foreground">From target input to diligence next actions.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            number="1"
            title="Start with a company"
            body="Enter a public company website. Add a buyer thesis if you want the screen tailored to a platform, fund or strategic acquisition angle."
          />
          <StepCard
            number="2"
            title="Add one non-confidential document"
            body="Upload a pitch deck, teaser, investor overview or annual report. Frontier OS extracts document claims and keeps them separate from verified public-source facts."
          />
          <StepCard
            number="3"
            title="Review the acquisition screen"
            body="See recommendation, IC readiness, evidence confidence, AI replica risk, main blockers, next questions and documents to request."
          />
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <SectionLabel>What the screen separates</SectionLabel>
          <h2 className="mb-8 text-2xl font-bold text-foreground">Evidence categories stay visible.</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {OUTPUTS.map((item) => (
              <OutputCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <SectionLabel>Product areas</SectionLabel>
        <h2 className="mb-8 text-2xl font-bold text-foreground">Where each workflow fits.</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_AREAS.map((item) => (
            <ProductAreaCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Sample screens</SectionLabel>
              <h2 className="text-2xl font-bold text-foreground">What users should expect to see.</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Sample screens use synthetic examples. Real runs only show evidence returned by the backend.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <InputMock />
            <EvidenceMock />
            <CockpitMock />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-border bg-card p-7 shadow-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <SectionLabel>Trust and safety</SectionLabel>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Built for evidence, not guesswork</h2>
          <div className="space-y-3">
            {TRUST_BULLETS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-7 shadow-sm">
          <SectionLabel>Feature availability</SectionLabel>
          <h2 className="mb-6 text-2xl font-bold text-foreground">What is live today.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)] p-5">
              <Badge tone="verified">Available now</Badge>
              <ul className="mt-4 space-y-2 text-sm text-[var(--semantic-verified-text)]">
                <li>Website-only screen</li>
                <li>Website + non-confidential PDF</li>
                <li>Deal Cockpit</li>
                <li>Pricing / request pilot</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] p-5">
              <Badge tone="claim">Private beta / limited</Badge>
              <ul className="mt-4 space-y-2 text-sm text-[var(--semantic-claim-text)]">
                <li>Live origination</li>
                <li>Deep AI Risk workflow</li>
                <li>Exports / team workflows</li>
                <li>Confidential document workflows</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <SectionLabel>Next step</SectionLabel>
            <h2 className="text-2xl font-bold text-foreground">Ready to screen a known company?</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app/run"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Run a screen <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={BOOK_INTRO_URL || '/request-pilot'}
              target={BOOK_INTRO_URL ? '_blank' : undefined}
              rel={BOOK_INTRO_URL ? 'noopener noreferrer' : undefined}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/70"
            >
              Book intro
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Search, GitCompare, Layers, MessageSquare } from 'lucide-react';
import { BookIntroButton } from '@/components/BookIntroButton';
import { BetaCTA } from '@/components/BetaCTA';
import { hasLocalWorkspaceSession } from '@/lib/trialAccount';
import { getFeedbackMailto } from '@/components/SendFeedbackButton';
import { useOptionalUser } from '@/lib/optionalClerk';
import { SemanticBadge, type LegacyBadgeLevel } from '@/components/SemanticBadge';
import { ScreeningWorkflowGuide } from '@/components/ScreeningWorkflowGuide';

// ─── Large acquisition screen card ───────────────────────────────────────────

type ChipVariant = LegacyBadgeLevel;

function Chip({ label, variant }: { label: string; variant: ChipVariant }) {
  return <SemanticBadge tone={variant}>{label}</SemanticBadge>;
}

const SCREEN_ROWS: { label: string; value?: string; chip?: { label: string; variant: ChipVariant }; bold?: boolean }[] = [
  { label: 'Recommendation',      chip: { label: 'Request Financials', variant: 'amber' } },
  { label: 'IC readiness',        chip: { label: 'Partial', variant: 'amber' } },
  { label: 'Valuation readiness', value: 'Financial evidence required', chip: { label: 'Blocked', variant: 'red' } },
  { label: 'AI replica risk',     chip: { label: 'Medium-high', variant: 'amber' } },
  { label: 'AI moat evidence',    chip: { label: 'Unproven', variant: 'muted' } },
  { label: 'Next action',         value: 'Request ARR definition, SaaS/services split, customer concentration and AI feature usage data.', bold: true },
];

/** "Screen your own →" link in the hero card — auth-aware. */
function RunYourOwnLink() {
  const { isLoaded, isSignedIn } = useOptionalUser();
  const hasWorkspace = (isLoaded && isSignedIn) || hasLocalWorkspaceSession();
  const href = hasWorkspace ? '/app/run' : '/create-workspace';
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      Screen your own <ArrowRight className="w-3 h-3" />
    </Link>
  );
}

/** Start a real company screen, using workspace creation when needed. */
function ReviewerStartButton() {
  const { isLoaded, isSignedIn } = useOptionalUser();
  const hasWorkspace = (isLoaded && isSignedIn) || hasLocalWorkspaceSession();
  const href = hasWorkspace ? '/app/run' : '/create-workspace';
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-md transition-colors"
    >
      Screen a company <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

function AcquisitionScreenCard() {
  return (
    <div className="w-full rounded-xl border border-card-border bg-card overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-muted-foreground">
            Acquisition screen
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">Public-source preview</span>
      </div>

      {/* Company name */}
      <div className="px-5 py-4 border-b border-border/60">
        <p className="text-xs font-medium text-muted-foreground mb-1">Target</p>
        <p className="text-base font-semibold text-foreground">Target company</p>
      </div>

      {/* Data rows */}
      <div className="divide-y divide-border/40">
        {SCREEN_ROWS.map(({ label, value, chip, bold }) => (
          <div key={label} className="px-5 py-4 flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0 min-w-[140px]">{label}</span>
            <div className="flex items-center gap-2 flex-wrap justify-end text-right">
              {chip && <Chip label={chip.label} variant={chip.variant} />}
              {value && (
                <span className={`text-sm ${bold ? 'text-foreground leading-snug text-right' : 'text-foreground'}`}>
                  {value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">URL-only mode · 8 stages · 24 evidence items</span>
        <RunYourOwnLink />
      </div>
    </div>
  );
}

// ─── Who it is for ────────────────────────────────────────────────────────────

interface Persona {
  title: string;
  desc: string;
  action: string;
  href: string;
}

const PERSONAS: Persona[] = [
  {
    title: 'PE deal teams',
    desc: 'Screen targets faster. See IC readiness, valuation blockers and diligence questions before spending analyst time.',
    action: 'Screen company',
    href: '/app/run',
  },
  {
    title: 'Software roll-ups',
    desc: 'Compare targets against a buyer thesis. Identify fit, integration risk and AI replica exposure.',
    action: 'Screen company',
    href: '/app/run',
  },
  {
    title: 'VC / growth investors',
    desc: 'Test whether AI claims are real, whether the product has defensibility, and where inference economics could affect margin.',
    action: 'View AI disruption',
    href: '/ai-disruption',
  },
  {
    title: 'Investment banks / advisors',
    desc: 'Prepare buyer Q&A, evidence gap maps and sell-side diligence narratives without treating claims as facts.',
    action: 'View evidence workflow',
    href: '/evidence-workflow',
  },
  {
    title: 'Operating partners',
    desc: 'Find where AI can expand revenue, reduce OPEX or create product risk across software assets.',
    action: 'View AI disruption',
    href: '/ai-disruption',
  },
  {
    title: 'Corp dev teams',
    desc: 'Assess strategic fit, adjacency logic and what must be verified before internal approval.',
    action: 'Screen company',
    href: '/app/run',
  },
];

// ─── What it checks ───────────────────────────────────────────────────────────

const MODULES = [
  { name: 'Source hierarchy',   desc: 'Official filings outrank decks, websites, press and aggregators.' },
  { name: 'Evidence registry',  desc: 'Facts, claims, assumptions and unknowns are separated.' },
  { name: 'AI defensibility',   desc: 'Replica risk, AI moat evidence and inference economics are tested.' },
  { name: 'Software scorecard', desc: 'Revenue quality, services mix, EBITDA caveats and product risk are flagged.' },
  { name: 'Buyer-specific fit', desc: 'The target is assessed against a buyer thesis, not generic attractiveness.' },
  { name: 'Diligence gaps',     desc: 'Uncertainty becomes a concrete request list.' },
];

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  'URL-only first',
  'Company-isolated workspaces',
  'Documents optional',
  'Claims are not treated as facts',
  'Delete when done',
];

// ─────────────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center w-full">

      {/* ══════════════════════════════════════════════ HERO */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: headline + CTAs */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 text-foreground leading-tight">
              Software acquisition screening before diligence gets expensive.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
              Frontier OS helps investors screen software targets, separate verified facts from claims, assess AI defensibility, compare buyer-thesis fit and track next actions in a Deal Cockpit.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Link
                href="/app/run"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-7 rounded-md group transition-colors"
              >
                Screen company
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/request-pilot"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-7 rounded-md transition-colors text-foreground"
              >
                Request private beta access
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Public-source preview. Outputs are decision support. Human review required.
            </p>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              View Team workflow <ArrowRight className="w-3 h-3" />
            </Link>
            <BookIntroButton
              eventName="clicked_book_intro_home_hero"
              variant="outline"
              label="Book a 30-minute intro"
              showIcon={true}
              className="h-9 px-4 text-sm"
            />
          </div>

          {/* Right: acquisition screen card */}
          <div>
            <AcquisitionScreenCard />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ REVIEWER GUIDE */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-4">
        <div className="rounded-xl border border-border bg-muted/40 p-3 md:p-4">
          <div className="rounded-lg border border-card-border bg-card p-5 md:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start gap-8">

            {/* Left: title + CTA */}
            <div className="md:w-64 shrink-0">
              <p className="text-xs font-semibold text-primary mb-2">3-minute review</p>
              <h2 className="text-xl font-bold text-foreground mb-2">Start a focused company screen</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Enter a real company website and review only the public-source evidence returned by the screen.
              </p>
              <ReviewerStartButton />
            </div>

            {/* Right: steps */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  n: 1,
                  label: 'Screen a company website',
                  detail: 'Public-source evidence',
                },
                {
                  n: 2,
                  label: 'Compare screened targets',
                  detail: 'Use saved, screened companies',
                },
                {
                  n: 3,
                  label: 'Open Deal Cockpit',
                  detail: 'See IC readiness and next actions',
                },
                {
                  n: 4,
                  label: 'Send feedback',
                  detail: 'Takes 3 minutes. Helps us prioritise.',
                  isFeedback: true,
                },
              ].map(({ n, label, detail, isFeedback }) => (
                <div key={n} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="w-6 h-6 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{n}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      {isFeedback && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/50" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ WORKFLOW STRIP */}
      <div className="w-full border-y border-border bg-card/20 py-16">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
          <ScreeningWorkflowGuide />
        </div>
      </div>

      {/* ══════════════════════════════════════════════ SCREEN ONE · COMPARE MANY */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16">
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Core features</p>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">Screen one target. Compare many.</h2>
        <p className="text-base text-muted-foreground mb-10 max-w-2xl">
          Frontier OS is not just a report generator. Screen URL-only acquisition targets, compare targets against a buyer thesis, and build a pipeline of evidence-backed next actions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            {
              icon: <Search className="w-5 h-5 text-primary" />,
              title: 'Screen a company',
              desc: 'Input a company URL and get an IC-readiness view: recommendation, strategic fit, AI risk, evidence confidence and diligence blockers.',
              href: '/run',
              action: 'Screen company',
            },
            {
              icon: <GitCompare className="w-5 h-5 text-primary" />,
              title: 'Compare targets',
              desc: 'Rank 2–5 companies by strategic fit, evidence quality, AI replica risk and blockers. See which target is most IC-ready at a glance.',
              href: '/compare',
              action: 'Compare screened targets',
              highlight: true,
            },
            {
              icon: <Layers className="w-5 h-5 text-primary" />,
              title: 'Build deal cockpit',
              desc: 'Save screened targets into a pipeline, track IC readiness, evidence quality and next actions across your deal team.',
              href: '/cockpit',
              action: 'View Deal Cockpit',
            },
          ].map(({ icon, title, desc, href, action, highlight }) => (
            <div
              key={title}
              className={`rounded-xl border p-6 flex flex-col gap-4 ${
                highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground mb-2">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
              <Link
                href={href}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  highlight
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {action} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
        <div>
          <Link
            href="/compare"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Compare screened targets
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ WHO IT IS FOR */}
      <div className="w-full bg-card/40 border-y border-border py-16">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Who uses it</p>
          <h2 className="text-2xl font-bold text-foreground mb-10">Who it is for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PERSONAS.map(({ title, desc, action, href }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
                <p className="text-base font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {action} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ WHAT IT CHECKS */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16">
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Modules</p>
        <h2 className="text-2xl font-bold text-foreground mb-10">What it checks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map(({ name, desc }) => (
            <div key={name} className="rounded-xl border border-border bg-card p-6">
              <p className="text-base font-semibold text-foreground mb-2">{name}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/product"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How each module works <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ TRUST STRIP + FINAL CTA */}
      <div className="w-full bg-card/40 border-t border-border py-14">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-primary mb-4">Data handling</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5 mb-4">
                {TRUST_ITEMS.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/trust"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Trust and data handling <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="shrink-0">
              <p className="text-sm text-muted-foreground mb-3">Screen a software target and see what must be verified before IC.</p>
              <Link
                href="/app/run"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-7 rounded-md transition-colors"
              >
                Screen company <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════ DOCUMENT REVIEW TEASER */}
      <div className="w-full border-t border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
          <div className="rounded-lg border border-border bg-card/30 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-foreground">Document-assisted review</p>
                <span className="text-[10px] font-medium border border-primary/30 text-primary/80 rounded px-1.5 py-0.5 bg-primary/5">
                  Document-assisted
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                Preview extraction of claims, metrics and diligence questions from non-confidential PDFs.
              </p>
            </div>
            <Link
              href="/app/evidence"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground"
            >
              Try in workspace <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <BetaCTA
        title="Want to test Frontier OS on your workflow?"
        body="Screen a company, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Screen company"
        primaryHref="/app/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="landing_page_bottom"
      />
    </div>
  );
}

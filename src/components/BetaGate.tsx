import React from 'react';
import { Link, useLocation } from 'wouter';
import { SignUpButton, SignInButton } from '@clerk/react';
import {
  Lock,
  AlertCircle,
  FileText,
  BarChart3,
  Shield,
  FileSpreadsheet,
  Presentation,
  Table2,
  BookOpen,
} from 'lucide-react';
import { clerkEnabled } from '@/lib/optionalClerk';
import { createBackendAccount, ensureTrialAccount } from '@/lib/trialAccount';
import { SemanticBadge, type LegacyBadgeLevel } from '@/components/SemanticBadge';

interface BetaGateProps {
  /**
   * Which protected page this gate is on.
   * Determines the context-specific "View sample …" secondary CTA
   * and the static sample preview rendered below the gate.
   */
  page?: 'run' | 'cockpit';
}

// ── Shared chip helper ────────────────────────────────────────────────────────
type ChipColour = Exclude<LegacyBadgeLevel, 'muted'>;
function Chip({ colour, label }: { colour: ChipColour; label: string }) {
  return <SemanticBadge tone={colour}>{label}</SemanticBadge>;
}

// ── Locked feature card ───────────────────────────────────────────────────────
function LockedCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 opacity-60 select-none">
      <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <Icon className="w-4 h-4 text-muted-foreground" />
      <p className="text-xs font-medium text-muted-foreground text-center leading-snug">{label}</p>
      <p className="text-[10px] text-muted-foreground/60 text-center leading-snug">
        Create a free beta account to use this on your own targets.
      </p>
    </div>
  );
}

// ── /run gate preview ─────────────────────────────────────────────────────────
function RunPreview() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-16 space-y-10 text-left">

      {/* Section header */}
      <div>
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Sample preview</p>
        <h2 className="text-lg font-bold text-foreground mb-1">What the sample screen shows</h2>
        <p className="text-sm text-muted-foreground">
          A preview of the acquisition screen using private beta example data.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Recommendation',      value: 'Request Financials',          colour: 'amber' as ChipColour },
          { label: 'IC readiness',         value: 'Partial',                     colour: 'grey'  as ChipColour },
          { label: 'Valuation readiness',  value: 'Financial evidence required', colour: 'red'   as ChipColour },
          { label: 'Strategic fit',        value: 'Medium',                      colour: 'blue'  as ChipColour },
          { label: 'AI replica risk',      value: 'Medium-high',                 colour: 'amber' as ChipColour },
          { label: 'Evidence quality',     value: 'Caveated',                    colour: 'grey'  as ChipColour },
        ].map(({ label, value, colour }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3.5 space-y-2">
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">{label}</p>
            <Chip colour={colour} label={value} />
          </div>
        ))}
      </div>

      {/* Analysis panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Strategic Fit */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Strategic Fit</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">Vertical SaaS, multi-year contracts, low churn reported</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">Revenue split not verified by independent source</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">Customer concentration above typical PE threshold</p>
            </div>
          </div>
        </div>

        {/* AI Disruption */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">AI Disruption</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">Core workflow replicable by foundation-model agent within 24–36 months</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">Data moat present but not independently verified</p>
            </div>
          </div>
          <Chip colour="amber" label="Medium-high" />
        </div>

        {/* Evidence Quality */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Evidence Quality</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Chip colour="green" label="Verified" />
              <p className="text-xs text-muted-foreground">Companies House CR</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip colour="grey"  label="Caveat"   />
              <p className="text-xs text-muted-foreground">Revenue from website claims</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip colour="red"   label="Blocking" />
              <p className="text-xs text-muted-foreground">Financial data not filed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blocking gaps */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-700" />
          <p className="text-[10px] font-semibold tracking-normal text-red-700">Blocking Gaps</p>
        </div>
        <ul className="space-y-2">
          {[
            'Revenue mix not independently verified',
            'SaaS vs services split not confirmed by independent source',
            'Customer concentration not disclosed',
          ].map(gap => (
            <li key={gap} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-xs text-foreground leading-snug">{gap}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Locked feature cards */}
      <div>
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-3">
          Included in private beta account
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <LockedCard icon={BookOpen}       label="Document-assisted review" />
          <LockedCard icon={Table2}         label="Save to Deal Cockpit" />
          <LockedCard icon={BarChart3}      label="Compare targets" />
          <LockedCard icon={Presentation}   label="PowerPoint IC pack" />
          <LockedCard icon={FileSpreadsheet} label="Excel diligence tracker" />
        </div>
      </div>

    </div>
  );
}

// ── /cockpit gate preview ─────────────────────────────────────────────────────
const SAMPLE_TARGETS = [
  {
    company:     'LedgerWorks Billing Ltd.',
    jurisdiction:'UK',
    rec:         'Request Financials',
    recColour:   'amber' as ChipColour,
    icReady:     'Partial',
    icColour:    'grey'  as ChipColour,
    valuation:   'Caveated',
    valColour:   'grey'  as ChipColour,
    aiRisk:      'Low',
    aiColour:    'green' as ChipColour,
    confidence:  'High',
    confColour:  'green' as ChipColour,
    nextAction:  'Request revenue evidence',
  },
  {
    company:     'Illustrative Target Co.',
    jurisdiction:'UK',
    rec:         'Monitor',
    recColour:   'blue'  as ChipColour,
    icReady:     'Partial',
    icColour:    'grey'  as ChipColour,
    valuation:   'Caveated',
    valColour:   'grey'  as ChipColour,
    aiRisk:      'Medium-high',
    aiColour:    'amber' as ChipColour,
    confidence:  'Medium',
    confColour:  'amber' as ChipColour,
    nextAction:  'Technical diligence session',
  },
  {
    company:     'VerticalOps GmbH',
    jurisdiction:'DE',
    rec:         'Pass',
    recColour:   'red'   as ChipColour,
    icReady:     'Blocked',
    icColour:    'red'   as ChipColour,
    valuation:   'Blocked',
    valColour:   'red'   as ChipColour,
    aiRisk:      'Low',
    aiColour:    'green' as ChipColour,
    confidence:  'Medium',
    confColour:  'amber' as ChipColour,
    nextAction:  'Confirm Handelsregister filings',
  },
  {
    company:     'DataRoomOps Inc.',
    jurisdiction:'US',
    rec:         'Request Financials',
    recColour:   'amber' as ChipColour,
    icReady:     'Not started',
    icColour:    'grey'  as ChipColour,
    valuation:   'Pending',
    valColour:   'grey'  as ChipColour,
    aiRisk:      'Medium',
    aiColour:    'blue'  as ChipColour,
    confidence:  'Medium',
    confColour:  'amber' as ChipColour,
    nextAction:  'Schedule intro call',
  },
];

const LOCKED_ACTIONS = [
  'Compare selected',
  'Add decision',
  'Export IC screen',
  'Mark as monitor',
  'Request financials',
];

function CockpitPreview() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-16 space-y-10 text-left">

      {/* Section header */}
      <div>
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Sample preview</p>
        <h2 className="text-lg font-bold text-foreground mb-1">What the Deal Cockpit shows</h2>
        <p className="text-sm text-muted-foreground">
          A sample pipeline view for tracking screened software targets.
        </p>
      </div>

      {/* Target table — desktop */}
      <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {['Company', 'Recommendation', 'IC Ready', 'Valuation', 'AI Risk', 'Confidence', 'Next action'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-normal text-muted-foreground font-normal whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SAMPLE_TARGETS.map(t => (
              <tr key={t.company} className="bg-card hover:bg-muted/10 transition-colors">
                <td className="px-3 py-3">
                  <p className="font-medium text-foreground leading-snug">{t.company}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{t.jurisdiction}</p>
                </td>
                <td className="px-3 py-3"><Chip colour={t.recColour}  label={t.rec}       /></td>
                <td className="px-3 py-3"><Chip colour={t.icColour}   label={t.icReady}   /></td>
                <td className="px-3 py-3"><Chip colour={t.valColour}  label={t.valuation} /></td>
                <td className="px-3 py-3"><Chip colour={t.aiColour}   label={t.aiRisk}    /></td>
                <td className="px-3 py-3"><Chip colour={t.confColour} label={t.confidence}/></td>
                <td className="px-3 py-3 text-muted-foreground">{t.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Target cards — mobile */}
      <div className="sm:hidden space-y-3">
        {SAMPLE_TARGETS.map(t => (
          <div key={t.company} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div>
              <p className="font-medium text-foreground text-sm">{t.company}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{t.jurisdiction}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { lbl: 'Recommendation',     chip: <Chip colour={t.recColour}  label={t.rec}        /> },
                { lbl: 'IC Ready',           chip: <Chip colour={t.icColour}   label={t.icReady}    /> },
                { lbl: 'Valuation',          chip: <Chip colour={t.valColour}  label={t.valuation}  /> },
                { lbl: 'AI Risk',            chip: <Chip colour={t.aiColour}   label={t.aiRisk}     /> },
                { lbl: 'Confidence',         chip: <Chip colour={t.confColour} label={t.confidence} /> },
              ].map(({ lbl, chip }) => (
                <div key={lbl}>
                  <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">{lbl}</p>
                  {chip}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Next: {t.nextAction}</p>
          </div>
        ))}
      </div>

      {/* Priority next actions */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Priority Next Actions</p>
        <ul className="space-y-2.5">
          {[
            { company: 'LedgerWorks',  action: 'Request revenue split and services breakdown before IC.' },
            { company: 'Illustrative Target',  action: 'Verify live AI usage, model costs and customer adoption. Technical diligence session required.' },
            { company: 'VerticalOps',  action: 'Confirm German Handelsregister filings. Registry data blocking IC readiness.' },
          ].map(({ company, action }) => (
            <li key={company} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <p className="text-xs text-foreground leading-snug">
                <span className="font-semibold">{company}:</span> {action}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Locked action row */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Actions</p>
        <div className="flex flex-wrap gap-2">
          {LOCKED_ACTIONS.map(action => (
            <button
              key={action}
              disabled
              title="Create a free beta account to use cockpit actions."
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/20 text-xs text-muted-foreground/50 cursor-not-allowed select-none"
            >
              <Lock className="w-3 h-3" />
              {action}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          Create a free beta account to use cockpit actions.
        </p>
      </div>

    </div>
  );
}

// ── BetaGate ──────────────────────────────────────────────────────────────────

/**
 * Shown to signed-out users who navigate to a protected route (/run, /compare, /cockpit).
 * Uses Clerk's SignUpButton / SignInButton so clicks are handled by the configured Clerk flow.
 * Static example previews stay hidden until source-backed demo runs are available.
 */
export function BetaGate({ page }: BetaGateProps) {
  const [, setLocation] = useLocation();

  async function handleLocalWorkspace() {
    ensureTrialAccount();
    await createBackendAccount().catch(() => null);
    setLocation('/app/run');
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 pt-16 pb-24">

      {/* ── Gate block ── */}
      <div className="flex flex-col items-center text-center">

        {/* Lock icon */}
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Lock className="w-5 h-5 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 max-w-lg leading-tight">
          Create a free beta account to run your own screen.
        </h1>

        {/* Body */}
        <p className="text-base text-muted-foreground max-w-md mb-8 leading-relaxed">
          A free beta account lets you run URL-only analysis on your own targets.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">

          {/* Primary — Clerk sign-up or no-login reviewer workspace */}
          {clerkEnabled ? (
            <SignUpButton mode="redirect">
              <button
                type="button"
                className="inline-flex items-center justify-center h-10 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors cursor-pointer"
              >
                Create free beta account
              </button>
            </SignUpButton>
          ) : (
            <button
              type="button"
              onClick={handleLocalWorkspace}
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors cursor-pointer"
            >
              Continue with private beta workspace
            </button>
          )}

          {/* Secondary — context-specific sample preview link */}
          {page === 'run' && (
            <Link
              href="/app/run"
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium border border-border text-foreground hover:border-primary/40 hover:bg-accent/20 rounded-md transition-colors"
            >
              Start a company screen
            </Link>
          )}
          {page === 'cockpit' && (
            <Link
              href="/app/cockpit"
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium border border-border text-foreground hover:border-primary/40 hover:bg-accent/20 rounded-md transition-colors"
            >
              Open deal cockpit
            </Link>
          )}

          {/* Tertiary — sign in */}
          {clerkEnabled && (
            <SignInButton mode="redirect">
              <button
                type="button"
                className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                Sign in
              </button>
            </SignInButton>
          )}

        </div>
      </div>

    </div>
  );
}

import React from 'react';
import { Link } from 'wouter';
import { Lock, FileText, BarChart2, Presentation, ClipboardList, ArrowRight } from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';

// ─── Export types ─────────────────────────────────────────────────────────────

const EXPORTS = [
  {
    icon:  <FileText className="w-5 h-5" />,
    title: 'IC memo PDF',
    desc:  'Full single-target acquisition screen formatted as an Investment Committee memo. Includes recommendation, evidence summary, risk flags and next actions.',
    plan:  'Team plan',
    available: false,
  },
  {
    icon:  <ClipboardList className="w-5 h-5" />,
    title: 'Evidence register',
    desc:  'Complete fact / claim / unknown table for a screened target, exportable as CSV for offline diligence workflows.',
    plan:  'Team plan',
    available: false,
  },
  {
    icon:  <Presentation className="w-5 h-5" />,
    title: 'PowerPoint IC pack',
    desc:  'Slide-ready IC presentation with recommendation, strategic fit radar, AI risk assessment and priority diligence checklist. Includes company and market context.',
    plan:  'Team plan',
    available: false,
  },
  {
    icon:  <BarChart2 className="w-5 h-5" />,
    title: 'Priority diligence checklist',
    desc:  'Ranked list of open evidence questions, blockers and verification tasks — formatted for a diligence workstream tracker.',
    plan:  'Team plan',
    available: false,
  },
  {
    icon:  <FileText className="w-5 h-5" />,
    title: 'Comparable transaction set',
    desc:  'Filtered set of comparable M&A transactions from the Frontier OS registry, with deal type, sector and size range.',
    plan:  'Enterprise',
    available: false,
  },
  {
    icon:  <ClipboardList className="w-5 h-5" />,
    title: 'Cockpit CSV export',
    desc:  'Export your full pipeline table — all saved runs, statuses, next actions and AI risk ratings — as a spreadsheet.',
    plan:  'Team plan',
    available: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExportsPage() {
  return (
    <div className="flex-1 flex flex-col w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Exports</p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted/40 text-muted-foreground border border-border">
              <Lock className="w-2.5 h-2.5" /> Locked · Team plan
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Export your acquisition screens.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Exports are available on the Team plan. Generate IC memos, evidence registers,
            PowerPoint IC packs and diligence checklists directly from your saved screens.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-8">

        {/* Plan notice */}
        <div className="flex items-start gap-3 px-5 py-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Exports require the Team plan.</p>
            <p className="text-sm text-muted-foreground">
              Private beta members currently on the free tier can run URL screens and compare targets.
              Exports and advanced IC pack generation will be available on the Team plan.
            </p>
            <Link href="/request-pilot" className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Request private beta upgrade <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Document-assisted review belongs in Run, not Exports */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground mb-1">Run a document-assisted screen first.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Website + document review is part of the acquisition screen workflow. Exports are generated later from saved Cockpit runs.
          </p>
          <Link
            href="/app/run?mode=document"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Run a document-assisted screen first <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Export list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXPORTS.map(exp => (
            <div key={exp.title} className="rounded-lg border border-border bg-card p-5 opacity-60">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground/60">{exp.icon}</span>
                  <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded shrink-0">
                  <Lock className="w-2.5 h-2.5" /> {exp.plan}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{exp.desc}</p>
            </div>
          ))}
        </div>

        {/* How exports work */}
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">How exports work</p>
          <div className="space-y-3">
            {[
              'Exports are generated from your saved Deal Cockpit runs — no re-processing required.',
              "IC memos and PowerPoint packs are formatted to your fund\u2019s template on the Enterprise plan.",
              'Evidence registers include confidence levels and source attribution for every claim.',
              'All exports are labelled as private beta outputs and require human review before use in IC.',
            ].map(point => (
              <div key={point} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BetaCTA
        title="Want access to exports?"
        body="Exports are available on the Team plan. Request a private beta upgrade to unlock IC memo PDF, evidence register and PowerPoint IC pack."
        primaryLabel="Request upgrade"
        primaryHref="/request-pilot"
        secondaryLabel="View pricing"
        secondaryHref="/pricing"
        eventName="exports_bottom"
      />
    </div>
  );
}

import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, MessageSquare, HelpCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';

// ─── Section data ─────────────────────────────────────────────────────────────

const EVIDENCE_TIERS = [
  {
    icon: <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />,
    label: 'Verified facts',
    color: 'border-green-500/20 bg-green-500/[0.03]',
    badge: 'green',
    description:
      'Claims corroborated by official registry sources, audited filings or primary data. Carry the highest evidentiary weight in any IC pack.',
    examples: [
      'Revenue confirmed in audited accounts at Companies House or SEC EDGAR',
      'Incorporation date and legal entity verified against official registry',
      'EBITDA figure cross-referenced across two independent filing sources',
      'Patent grant confirmed in the relevant national database',
    ],
  },
  {
    icon: <MessageSquare className="w-4 h-4 text-amber-700 shrink-0" />,
    label: 'Company claims',
    color: 'border-amber-500/20 bg-amber-500/[0.03]',
    badge: 'amber',
    description:
      'Statements made by the company in marketing, pitch materials or press releases — not independently corroborated. Must be verified before IC reliance.',
    examples: [
      '"£14m ARR" stated on company website without a filing source',
      '"120 enterprise customers" referenced in a blog post',
      '"AI-powered platform" — capability asserted but not tested or verified',
      'Market size figure cited from a vendor-commissioned report',
    ],
  },
  {
    icon: <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />,
    label: 'Unknowns',
    color: 'border-border bg-card/30',
    badge: 'grey',
    description:
      'Evidence not found in public sources. Not a negative signal — many important metrics are not public. Flags what must be confirmed in diligence.',
    examples: [
      'Customer concentration — no public disclosure',
      'Gross margin — not available in public filings',
      'ARR composition (new vs. expansion vs. churn) — not disclosed',
      'Key-person dependency — not assessable from public sources alone',
    ],
  },
  {
    icon: <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />,
    label: 'Diligence blockers',
    color: 'border-red-500/20 bg-red-500/[0.03]',
    badge: 'red',
    description:
      'Specific gaps that would prevent an IC recommendation from being made without further evidence. Prioritised for diligence workstream.',
    examples: [
      'Revenue figure from company claim not corroborated in any filing',
      'AI replica risk rated High — requires technical architecture review',
      'Missing ARR definition — SaaS revenue quality cannot be confirmed',
      'Retention rate unknown — limits LTV / CAC assessment',
    ],
  },
];

const WHY_MATTERS = [
  {
    title: 'IC packs built on unverified claims create liability',
    body: 'When a recommendation relies on company-stated revenue or customer counts without a primary source, the IC pack carries hidden risk. Frontier OS surfaces this explicitly.',
  },
  {
    title: 'Diligence is expensive — screen first',
    body: 'Full legal, financial and technical diligence on a target that later reveals a structural blocker wastes 6–12 weeks. Evidence ranking identifies those blockers before the mandate begins.',
  },
  {
    title: 'Evidence confidence determines IC readiness',
    body: 'A target with all key metrics verified in public filings is IC-ready faster. A target with high confidence gaps needs diligence scoping before IC.',
  },
  {
    title: 'AI-generated summaries are not evidence',
    body: 'Frontier OS does not summarise. It extracts, ranks and labels evidence by source type. Every fact shown in the output has a source attribution.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicEvidencePage() {
  return (
    <div className="flex-1 flex flex-col w-full">

      {/* ── Hero ── */}
      <div className="w-full border-b border-border bg-card/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-3">Evidence workflow</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 max-w-2xl leading-tight">
            Separate verified facts from claims before diligence gets expensive.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Frontier OS ranks every evidence item by source type — official filing, company claim, or
            unknown — so your IC team knows exactly what has been verified and what still needs
            confirmation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/run?mode=sample"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
            >
              Screen company <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/registry-coverage"
              className="inline-flex items-center gap-2 text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-6 rounded-md transition-colors text-foreground"
            >
              Registry coverage
            </Link>
          </div>
        </div>
      </div>

      {/* ── Evidence tiers ── */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-6">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">
          Evidence classification
        </p>
        {EVIDENCE_TIERS.map(tier => (
          <div key={tier.label} className={`rounded-lg border ${tier.color} overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${tier.color} flex items-center gap-2`}>
              {tier.icon}
              <p className="text-sm font-semibold text-foreground">{tier.label}</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tier.description}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-3">
                  Examples
                </p>
                <ul className="space-y-2">
                  {tier.examples.map(ex => (
                    <li key={ex} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Why evidence confidence matters ── */}
      <div className="w-full border-t border-border bg-card/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">
            Why it matters
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Why evidence confidence matters before IC
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHY_MATTERS.map(item => (
              <div key={item.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-7">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Source hierarchy ── */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-10">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">
          Source hierarchy
        </p>
        <h2 className="text-xl font-bold text-foreground mb-6">How Frontier OS ranks sources</h2>
        <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
          {[
            { tier: 'Tier 1', label: 'Official filings', desc: 'Companies House, SEC EDGAR, Handelsregister, audited accounts, HMRC references', weight: 'Highest' },
            { tier: 'Tier 2', label: 'Primary registries', desc: 'Patent offices, trademark registries, land registries, court records', weight: 'High' },
            { tier: 'Tier 3', label: 'Verified third parties', desc: 'Rated credit reports, professional body registers, regulated data providers', weight: 'Medium-high' },
            { tier: 'Tier 4', label: 'Reputable secondary', desc: 'Established news sources, professional press, analyst reports from named firms', weight: 'Medium' },
            { tier: 'Tier 5', label: 'Company own content', desc: 'Website, investor relations, press releases, LinkedIn — treated as claims', weight: 'Low' },
            { tier: 'Tier 6', label: 'Aggregators', desc: 'Crunchbase, PitchBook, LinkedIn company pages — used for context, not as primary evidence', weight: 'Lowest' },
          ].map((row, i) => (
            <div key={row.tier} className={`grid grid-cols-[80px_1fr_80px] gap-4 px-5 py-3.5 items-start ${i > 0 ? 'border-t border-border' : ''}`}>
              <span className="text-[10px] font-mono text-primary/70">{row.tier}</span>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">{row.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{row.desc}</p>
              </div>
              <span className="text-[10px] text-muted-foreground text-right">{row.weight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <BetaCTA
        title="See evidence ranking in action."
        body="Start a public-source screen on a real software company. See verified facts, company claims and unknowns — separated and ranked by source."
        primaryLabel="Screen company"
        primaryHref="/run?mode=sample"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="evidence_public_bottom"
      />
    </div>
  );
}

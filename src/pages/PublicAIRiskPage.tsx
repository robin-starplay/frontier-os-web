import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, ShieldAlert, Cpu, Layers, GitBranch, HelpCircle } from 'lucide-react';
import { BetaCTA } from '@/components/BetaCTA';

// ─── Section data ─────────────────────────────────────────────────────────────

const RISK_LEVELS = [
  { level: 'High',        colour: 'text-red-400',    border: 'border-red-500/30 bg-red-500/[0.03]',   desc: 'Core capability can be replicated by a capable team using foundation models within 6–18 months. Moat relies on distribution or switching costs rather than technical differentiation.' },
  { level: 'Medium-high', colour: 'text-orange-400', border: 'border-orange-500/30 bg-orange-500/[0.03]', desc: 'Partial replication risk. Some proprietary elements (data, integrations, workflow depth) create friction but do not prevent a well-resourced competitor from shipping a viable alternative.' },
  { level: 'Medium',      colour: 'text-amber-400',  border: 'border-amber-500/30 bg-amber-500/[0.03]',  desc: 'Meaningful differentiation exists but AI tooling continues to close the gap. Moat durability depends on rate of proprietary data accumulation and regulatory complexity.' },
  { level: 'Low',         colour: 'text-green-400',  border: 'border-green-500/30 bg-green-500/[0.03]',  desc: 'Strong technical moat. Proprietary data, deep workflow integration, regulatory lock-in, or inference economics make replication prohibitively expensive or slow.' },
];

const MOAT_SIGNALS = [
  { icon: <Cpu className="w-4 h-4 text-primary shrink-0" />, label: 'Proprietary training data', desc: 'Unique datasets created from customer workflows — not replicable by a new entrant using public data or foundation models alone.' },
  { icon: <Layers className="w-4 h-4 text-primary shrink-0" />, label: 'Deep workflow integration', desc: 'Embedded in regulatory, compliance or mission-critical workflows where switching cost is high and failure risk is material.' },
  { icon: <GitBranch className="w-4 h-4 text-primary shrink-0" />, label: 'Network and feedback loops', desc: 'Platform improves as usage grows — data flywheel, multi-sided network, or community-driven content that a new entrant cannot bootstrap.' },
  { icon: <ShieldAlert className="w-4 h-4 text-primary shrink-0" />, label: 'Regulatory and accreditation lock-in', desc: 'Compliance certification, sector accreditation or regulatory approval creates a structural barrier independent of underlying AI capability.' },
];

const INFERENCE_ECONOMICS = [
  { question: 'What is the estimated cost per inference at current volume?', why: 'High per-query cost limits margin at scale and creates vulnerability to lower-cost foundation model providers.' },
  { question: 'Has the company quantified its AI cost as a percentage of revenue?', why: 'Undisclosed AI COGS is a valuation risk — margin expansion assumptions may be unsupported.' },
  { question: 'Is AI capability owned, licensed, or accessed via an API?', why: 'API-dependent AI creates price risk (OpenAI, Anthropic pricing changes) and replaceability risk.' },
  { question: 'What is the infrastructure cost trajectory as foundation model prices fall?', why: 'If the core product is thin wrapper logic around commodity AI, falling API prices reduce switching costs for customers.' },
];

const WORKFLOW_DEFENSIBILITY = [
  'Does the software sit on a regulated data flow that cannot be migrated easily?',
  'Are outputs embedded in downstream systems (ERP, CRM, compliance reporting)?',
  'Does the AI component require human-in-the-loop validation that creates institutional memory?',
  'Is the value created by AI, or by integrations and data access that AI merely uses?',
  'How long is the average implementation and onboarding cycle?',
];

const DILIGENCE_QUESTIONS = [
  { area: 'Technical architecture', questions: ['Which foundation models are used and under what licence terms?', 'Is model fine-tuning or RAG used — and on what proprietary data?', 'What is the estimated AI inference cost per customer per year?'] },
  { area: 'Competitive moat', questions: ['Has the company shipped a feature that a foundation model company could ship in 6 months?', 'What does the product do that GPT-4o cannot do if combined with a thin UI layer?', 'What proprietary data does the company own that cannot be recreated by a new entrant?'] },
  { area: 'Market risk', questions: ['Is there an incumbent (Adobe, Salesforce, Microsoft) that has already announced an equivalent feature?', 'Is the go-to-market dependent on pricing arbitrage against human labour that AI also displaces?', 'What is the company\'s stated view on the 2–3 year foundation model capability trajectory?'] },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicAIRiskPage() {
  return (
    <div className="flex-1 flex flex-col w-full">

      {/* ── Hero ── */}
      <div className="w-full border-b border-border bg-card/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-3">AI replica risk</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 max-w-2xl leading-tight">
            Assess AI replica risk before assuming a software moat still exists.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Foundation models are commoditising software capabilities faster than diligence frameworks
            have adapted. Frontier OS assesses how replicable a target's core capability is, and
            whether the claimed moat is technical or merely distributional.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/run?mode=sample"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
            >
              Run screen <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ai-disruption"
              className="inline-flex items-center gap-2 text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-6 rounded-md transition-colors text-foreground"
            >
              AI disruption framework
            </Link>
          </div>
        </div>
      </div>

      {/* ── Risk levels ── */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-12">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Risk levels</p>
        <h2 className="text-xl font-bold text-foreground mb-6">AI replica risk</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RISK_LEVELS.map(r => (
            <div key={r.level} className={`rounded-lg border ${r.border} p-5`}>
              <p className={`text-sm font-bold font-mono mb-2 ${r.colour}`}>{r.level}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI moat evidence ── */}
      <div className="w-full border-t border-border bg-card/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Moat signals</p>
          <h2 className="text-xl font-bold text-foreground mb-6">AI moat evidence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOAT_SIGNALS.map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3 mb-2">
                  {s.icon}
                  <p className="text-sm font-semibold text-foreground leading-snug">{s.label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-7">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inference economics ── */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-12">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Cost structure</p>
        <h2 className="text-xl font-bold text-foreground mb-6">Inference economics</h2>
        <div className="rounded-lg border border-border bg-card/30 divide-y divide-border overflow-hidden">
          {INFERENCE_ECONOMICS.map((item, i) => (
            <div key={i} className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-foreground leading-snug">{item.question}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-snug pl-5 md:pl-0">{item.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workflow defensibility ── */}
      <div className="w-full border-t border-border bg-card/20">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Structural factors</p>
          <h2 className="text-xl font-bold text-foreground mb-6">Workflow defensibility</h2>
          <div className="space-y-3">
            {WORKFLOW_DEFENSIBILITY.map((q, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
                <span className="text-[10px] font-mono text-primary/60 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-sm text-foreground leading-snug">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diligence questions ── */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-12">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Pre-IC checklist</p>
        <h2 className="text-xl font-bold text-foreground mb-6">Diligence questions</h2>
        <div className="space-y-6">
          {DILIGENCE_QUESTIONS.map(area => (
            <div key={area.area} className="rounded-lg border border-border bg-card/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <p className="text-xs font-semibold text-foreground">{area.area}</p>
              </div>
              <ul className="divide-y divide-border/50">
                {area.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                    <p className="text-xs text-muted-foreground leading-snug">{q}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <BetaCTA
        title="Screen a target's AI replica risk."
        body="Run a public-source screen to see how Frontier OS assesses AI defensibility, replica risk and inference economics for a real software company."
        primaryLabel="Run screen"
        primaryHref="/run?mode=sample"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="ai_risk_public_bottom"
      />
    </div>
  );
}

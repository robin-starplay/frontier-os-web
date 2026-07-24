import React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DecisionTone = 'positive' | 'conditional' | 'blocking' | 'neutral' | 'info';

const toneClass: Record<DecisionTone, string> = {
  positive: 'border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)]',
  conditional: 'border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)]',
  blocking: 'border-[var(--semantic-blocker-border)] bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)]',
  neutral: 'border-border bg-muted/35 text-muted-foreground',
  info: 'border-primary/20 bg-primary/5 text-primary',
};

export function ConfidenceIndicator({
  value,
  label = 'Confidence in current view',
}: {
  value: string;
  label?: string;
}) {
  const normalised = value.toLowerCase();
  const tone: DecisionTone = normalised.includes('high')
    ? 'positive'
    : normalised.includes('low') || normalised.includes('not assessed')
      ? 'neutral'
      : 'conditional';
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <span role="status" aria-label={`${label}: ${value || 'Not assessed'}`} className={cn('mt-1 inline-flex rounded-[var(--feds-radius-4)] border px-2 py-1 type-label', toneClass[tone])}>
        {value || 'Not assessed'}
      </span>
    </div>
  );
}

export function EvidenceStatus({ status }: { status: string }) {
  const normalised = status.toLowerCase();
  const tone: DecisionTone = normalised.includes('verified')
    ? 'positive'
    : normalised.includes('conflict') || normalised.includes('block')
      ? 'blocking'
      : normalised.includes('claim') || normalised.includes('conditional')
        ? 'conditional'
        : 'neutral';
  const Icon = tone === 'positive' ? CheckCircle2 : tone === 'blocking' ? AlertTriangle : CircleHelp;
  return (
    <span role="status" aria-label={`Evidence status: ${status}`} className={cn('inline-flex items-center gap-1 rounded-[var(--feds-radius-4)] border px-2 py-1 type-label', toneClass[tone])}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

export function DecisionBadge({ value }: { value: string }) {
  const normalised = value.toLowerCase();
  const tone: DecisionTone = normalised.includes('progress')
    ? normalised.includes('condition') ? 'conditional' : 'positive'
    : normalised.includes('decline')
      ? 'blocking'
      : normalised.includes('insufficient') || normalised.includes('hold')
        ? 'neutral'
        : 'info';
  return <span role="status" aria-label={`Decision: ${value}`} className={cn('inline-flex rounded-[var(--feds-radius-4)] border px-2.5 py-1 type-body-sm font-semibold', toneClass[tone])}>{value}</span>;
}

export function InvestmentView({
  recommendation,
  readiness,
  confidence,
  thesisFit,
  reasonsToProceed,
  reasonsForCaution,
  principalUnknown,
  nextAction,
}: {
  recommendation: string;
  readiness: string;
  confidence: string;
  thesisFit: string;
  reasonsToProceed: string[];
  reasonsForCaution: string[];
  principalUnknown: string;
  nextAction: string;
}) {
  return (
    <section data-testid="investment-view" aria-labelledby="investment-view-title" className="rounded-[var(--feds-radius-8)] border border-border-subtle bg-surface-primary">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-primary">Current decision</p>
          <h2 id="investment-view-title" className="mt-1 text-xl font-semibold text-foreground">Investment view</h2>
        </div>
        <DecisionBadge value={recommendation} />
      </div>
      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[0.8fr_1.2fr]">
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-[11px] text-muted-foreground">Readiness</dt><dd className="mt-1 text-sm font-medium text-foreground">{readiness}</dd></div>
          <ConfidenceIndicator value={confidence} />
          <div><dt className="text-[11px] text-muted-foreground">Thesis fit</dt><dd className="mt-1 text-sm font-medium text-foreground">{thesisFit}</dd></div>
          <div><dt className="text-[11px] text-muted-foreground">Principal unknown</dt><dd className="mt-1 text-sm text-foreground">{principalUnknown}</dd></div>
        </dl>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReasonList title="Reasons to proceed" items={reasonsToProceed} tone="positive" />
          <ReasonList title="Reasons for caution" items={reasonsForCaution} tone="conditional" />
          <div className="sm:col-span-2 border-t border-border pt-3">
            <p className="text-[11px] font-medium text-primary">Next action</p>
            <p className="mt-1 text-sm font-medium text-foreground">{nextAction}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReasonList({ title, items, tone }: { title: string; items: string[]; tone: DecisionTone }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {(items.length ? items : ['Not established from current evidence.']).slice(0, 3).map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-sm text-foreground">
            <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', tone === 'positive' ? 'bg-[var(--feds-success-text)]' : 'bg-[var(--feds-warning-text)]')} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DiligenceItem({
  question,
  whyItMatters,
  evidenceRequired,
  priority,
  owner,
  status,
}: {
  question: string;
  whyItMatters: string;
  evidenceRequired: string;
  priority: string;
  owner?: string;
  status: string;
}) {
  return (
    <article className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{question}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{whyItMatters}</p>
        </div>
        <EvidenceStatus status={status} />
      </div>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Evidence required</dt><dd className="mt-1 text-foreground">{evidenceRequired}</dd></div>
        <div><dt className="text-muted-foreground">Priority</dt><dd className="mt-1 text-foreground">{priority}</dd></div>
        <div><dt className="text-muted-foreground">Owner</dt><dd className="mt-1 text-foreground">{owner || 'Unassigned'}</dd></div>
      </dl>
    </article>
  );
}

export function MetricTable({
  metrics,
}: {
  metrics: Array<{ metric: string; value: string; period?: string; source?: string; page?: string; status?: string }>;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--feds-radius-8)] border border-border-subtle">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/35 text-xs text-muted-foreground">
          <tr>{['Metric', 'Value', 'Period', 'Source', 'Page', 'Status'].map(label => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map(item => (
            <tr key={`${item.metric}-${item.period || ''}`}>
              <td className="px-3 py-2.5 font-medium text-foreground">{item.metric}</td>
              <td data-numeric="true" className="px-3 py-2.5 text-right type-data text-foreground">{item.value}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{item.period || 'Not stated'}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{item.source || 'Not sourced'}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{item.page || 'Not stated'}</td>
              <td className="px-3 py-2.5"><EvidenceStatus status={item.status || 'Unknown'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThesisCriteria({
  groups,
}: {
  groups: Array<{ label: 'Required' | 'Preferred' | 'Excluded' | 'Not specified'; items: string[] }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="thesis-criteria">
      {groups.map(group => (
        <div key={group.label} className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground">{group.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{group.items.length ? group.items.join(' · ') : 'None specified'}</p>
        </div>
      ))}
    </div>
  );
}

export function ComparisonDimension({
  label,
  conclusion,
  confidence,
  evidence,
  missingEvidence,
}: {
  label: string;
  conclusion: string;
  confidence: string;
  evidence: string[];
  missingEvidence: string[];
}) {
  return (
    <article className="grid gap-3 border-b border-border py-4 last:border-b-0 md:grid-cols-[180px_1fr_160px]">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <div>
        <p className="text-sm text-foreground">{conclusion}</p>
        <p className="mt-2 text-xs text-muted-foreground">Evidence: {evidence.length ? evidence.join(' · ') : 'No supporting evidence disclosed'}</p>
        {missingEvidence.length > 0 && <p className="mt-1 text-xs text-[var(--feds-warning-text)]">Missing: {missingEvidence.join(' · ')}</p>}
      </div>
      <ConfidenceIndicator value={confidence} label="Confidence" />
    </article>
  );
}

export const InvestmentViewPanel = InvestmentView;
export const ThesisCriterion = ThesisCriteria;

export function NextAction({ children }: { children: React.ReactNode }) {
  return <div className="border-l-2 border-accent-primary pl-3"><p className="type-label text-text-muted">Next action</p><div className="mt-1 type-body-md text-text-primary">{children}</div></div>;
}

export function PipelineStage({ stage }: { stage: string }) {
  return <span role="status" aria-label={`Pipeline stage: ${stage}`} className="inline-flex rounded-[var(--feds-radius-4)] border border-border-strong bg-surface-secondary px-2 py-1 type-label text-text-secondary">{stage}</span>;
}

export function SourceLink({ href, children, page }: { href?: string; children: React.ReactNode; page?: string }) {
  const content = <>{children}{page ? ` · p. ${page}` : ''}</>;
  return href
    ? <a className="type-caption text-accent-primary underline-offset-2 hover:underline" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <span className="type-caption text-text-muted">{content}</span>;
}

export function EvidenceItem({
  conclusion,
  source,
  page,
  type,
  status,
  confidence,
  freshness,
  children,
}: {
  conclusion: string;
  source: string;
  page?: string;
  type: string;
  status: string;
  confidence: string;
  freshness?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="border-b border-border-subtle py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="type-body-md font-medium text-text-primary">{conclusion}</p>
        <EvidenceStatus status={status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 type-caption text-text-muted">
        <SourceLink page={page}>{source}</SourceLink><span>{type}</span><span>{confidence} confidence</span>{freshness && <span>{freshness}</span>}
      </div>
      {children && <details className="mt-2 type-body-sm text-text-secondary"><summary className="cursor-pointer text-accent-primary">Evidence details</summary><div className="pt-2">{children}</div></details>}
    </article>
  );
}

export function DecisionHistoryItem({ decision, date, user, rationale, conditions }: { decision: string; date: string; user: string; rationale: string; conditions?: string }) {
  return <article className="grid gap-2 border-b border-border-subtle py-3 sm:grid-cols-[140px_1fr]"><div><DecisionBadge value={decision} /><p className="mt-2 type-caption text-text-muted">{date} · {user}</p></div><div><p className="type-body-md text-text-primary">{rationale}</p>{conditions && <p className="mt-1 type-caption text-text-muted">Conditions: {conditions}</p>}</div></article>;
}

export function ContextStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-y border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" /> {children}
    </div>
  );
}

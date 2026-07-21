import React from 'react';

type Fact = Record<string, unknown>;
type EvidenceGroup = 'overview' | 'revenueQuality' | 'operating' | 'supporting';

export interface FinancialMetricComparison {
  key: string;
  label: string;
  facts: Fact[];
  growth?: string;
}

export interface GroupedFinancialEvidence {
  overview: FinancialMetricComparison[];
  revenueQuality: FinancialMetricComparison[];
  operating: FinancialMetricComparison[];
  supporting: FinancialMetricComparison[];
}

const OVERVIEW = new Set(['group_revenue', 'revenue', 'adjusted_ebitda', 'ebitda', 'net_cash', 'gross_profit']);
const REVENUE_QUALITY = new Set(['recurring_revenue', 'order_book', 'arr']);
const OPERATING = new Set(['cash', 'employees', 'operating_cash_flow', 'free_cash_flow', 'net_debt', 'bookings', 'pipeline', 'r_and_d']);

function text(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function metricKey(fact: Fact): string {
  return text(fact.canonical_metric_type ?? fact.metric_name ?? fact.label ?? fact.field)
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function metricLabel(fact: Fact): string {
  const label = text(fact.label ?? fact.metric_label ?? fact.metric_name ?? fact.field) || 'Financial metric';
  return label.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function periodYear(fact: Fact): number {
  const match = text(fact.period).match(/(20\d{2})/);
  return match ? Number(match[1]) : 0;
}

function comparableNumber(value: unknown): { number: number; currency: string; unit: string } | null {
  const raw = text(value);
  const match = raw.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;
  const currency = raw.startsWith('£') ? 'GBP' : raw.startsWith('$') ? 'USD' : raw.startsWith('€') ? 'EUR' : '';
  const unit = /(?:bn|billion)\b/i.test(raw) ? 'bn' : /(?:m|million)\b/i.test(raw) ? 'm' : /(?:k|thousand)\b/i.test(raw) ? 'k' : '';
  return { number: Number(match[1].replace(/,/g, '')), currency, unit };
}

function comparisonGrowth(facts: Fact[]): string | undefined {
  if (facts.length !== 2) return undefined;
  const current = comparableNumber(facts[0].value);
  const prior = comparableNumber(facts[1].value);
  if (!current || !prior || prior.number === 0 || current.currency !== prior.currency || current.unit !== prior.unit) return undefined;
  const growth = ((current.number - prior.number) / Math.abs(prior.number)) * 100;
  return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
}

function evidenceGroup(key: string, fact: Fact): EvidenceGroup {
  if (text(fact.presentation_group) === 'unresolved' || key.includes('unresolved') || key === 'dividend') return 'supporting';
  if (OVERVIEW.has(key)) return 'overview';
  if (REVENUE_QUALITY.has(key) || (key.endsWith('_revenue') && key !== 'group_revenue') || key.includes('revenue_mix')) return 'revenueQuality';
  if (OPERATING.has(key)) return 'operating';
  return 'supporting';
}

export function isFinancialEvidenceFact(fact: Fact): boolean {
  return Boolean(fact.canonical_metric_type || fact.metric_name)
    || ['financial_metric', 'operational_metric'].includes(text(fact.evidence_type));
}

export function groupFinancialEvidence(facts: Fact[]): GroupedFinancialEvidence {
  const grouped: GroupedFinancialEvidence = { overview: [], revenueQuality: [], operating: [], supporting: [] };
  const byMetric = new Map<string, Fact[]>();
  for (const fact of facts) {
    const key = metricKey(fact);
    if (!key) continue;
    const period = text(fact.period) || 'Period unavailable';
    const uniqueKey = `${key}|${period}`;
    const existing = byMetric.get(key) ?? [];
    if (!existing.some(item => `${metricKey(item)}|${text(item.period) || 'Period unavailable'}` === uniqueKey)) existing.push(fact);
    else grouped.supporting.push({ key: `${key}-${period}-supporting`, label: metricLabel(fact), facts: [fact] });
    byMetric.set(key, existing);
  }
  for (const [key, metricFacts] of byMetric) {
    metricFacts.sort((a, b) => periodYear(b) - periodYear(a));
    const item = { key, label: metricLabel(metricFacts[0]), facts: metricFacts, growth: comparisonGrowth(metricFacts) };
    grouped[evidenceGroup(key, metricFacts[0])].push(item);
  }
  return grouped;
}

function sourcePage(fact: Fact): string {
  const page = text(fact.source_page ?? fact.page);
  return page ? `Page ${page}` : 'Source page unavailable';
}

function MetricCard({ metric }: { metric: FinancialMetricComparison }) {
  const comparison = metric.facts.length > 1;
  return (
    <article className="min-h-[112px] rounded-md border border-[var(--semantic-info-border)] bg-[var(--semantic-info-bg)]/30 p-3" data-financial-metric={metric.key}>
      <h5 className="text-xs font-semibold leading-5 text-foreground">{metric.label}</h5>
      <div className={comparison ? 'mt-2 grid grid-cols-2 gap-3' : 'mt-2'}>
        {metric.facts.map((fact, index) => (
          <div key={`${text(fact.period)}-${index}`} className="min-w-0">
            {comparison && <p className="text-xs font-medium text-muted-foreground">{text(fact.period) || 'Period unavailable'}</p>}
            <p className="break-words text-lg font-semibold leading-6 text-foreground">{text(fact.value) || 'Unavailable'}</p>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">{comparison ? sourcePage(fact) : `${text(fact.period) || 'Period unavailable'} · ${sourcePage(fact)}`}</p>
          </div>
        ))}
      </div>
      {metric.growth && <p className="mt-2 border-t border-border/60 pt-2 text-xs font-medium text-muted-foreground">Growth {metric.growth}</p>}
    </article>
  );
}

function MetricSection({ title, metrics }: { title: string; metrics: FinancialMetricComparison[] }) {
  if (metrics.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold text-foreground">{title}</h4>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4" data-financial-grid={title.toLowerCase().replace(/\s+/g, '-')}>
        {metrics.map(metric => <MetricCard key={metric.key} metric={metric} />)}
      </div>
    </section>
  );
}

export function FinancialEvidenceGrid({ facts }: { facts: Fact[] }) {
  const grouped = groupFinancialEvidence(facts);
  return (
    <div className="space-y-4" data-testid="financial-evidence-grid">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Financial evidence</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Audited annual report · {facts.length} verified facts</p>
        <p className="mt-1 text-xs font-medium text-[var(--semantic-info-text)]">Verified in uploaded annual report</p>
      </div>
      <MetricSection title="Financial overview" metrics={grouped.overview} />
      <MetricSection title="Revenue quality" metrics={grouped.revenueQuality} />
      <MetricSection title="Balance sheet and operating metrics" metrics={grouped.operating} />
      {grouped.supporting.length > 0 && (
        <details className="rounded-md border border-border/70 bg-card/20">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-primary">Supporting extracted facts ({grouped.supporting.length})</summary>
          <div className="grid grid-cols-1 gap-2 border-t border-border p-3 md:grid-cols-2 lg:grid-cols-4">
            {grouped.supporting.map(metric => <MetricCard key={metric.key} metric={metric} />)}
          </div>
        </details>
      )}
    </div>
  );
}

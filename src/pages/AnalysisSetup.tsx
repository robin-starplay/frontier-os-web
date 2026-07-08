import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, ShieldAlert, Clock,
  CheckCircle2, Loader2, ChevronRight, RotateCcw,
  Globe, Target, AlertCircle, FileOutput,
  Lock as LockIcon, Info, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, NEUTRAL_STAGES, type DemoScenario, type AnalysisStageData } from '@/data/scenarios';
import { useAccess } from '@/contexts/AccessContext';
import { saveUrlRun, saveDocumentRun, getRuns } from '@/lib/runHistory';
import { getWorkspaceId, getUserId, createBackendAccount, getTrialAccount } from '@/lib/trialAccount';
import {
  runUrlAnalysis,
  runDocumentAssistedAnalysis,
  startAnalysis,
  pollStatus,
  fetchResult,
  isBackendConfigured,
  getBackendBaseUrl,
  hasUsableAnalysisPayload,
  hasUsableDocumentAssistedPayload,
  isDocumentUnavailablePayload,
  type AnalysisResult,
  type AnalysisRequest,
  type RunStatusResponse,
  type AnalysisResultResponse,
  type StartAnalysisOutcome,
  type AnalysisEvidenceCard,
  type DocumentAssistedResult,
  type EvidenceStatus,
  type Level,
} from '@/lib/frontierApi';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { safeEvidenceStatus } from '@/lib/evidenceUtils';

// ─── types ───────────────────────────────────────────────────────────────────

type StageStatus = 'queued' | 'running' | 'complete';
type Step = 1 | 2 | 3;
type JurisdictionCode = 'uk' | 'us' | 'de' | 'fr' | 'it' | 'other' | 'unknown';
type ModeCode = 'url-only' | 'doc-assisted' | 'hybrid';
type DocumentTypeCode = 'pitch_deck' | 'teaser' | 'cim_excerpt' | 'investor_deck' | 'management_pack' | 'annual_report' | 'unknown';

/** State machine for the Railway/external backend call path. */
type RailwayPhase =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'polling';         runId: string; statusData: RunStatusResponse }
  | { kind: 'fetching_result'; runId: string }
  | { kind: 'success';         result: AnalysisResultResponse }
  | { kind: 'error';           message: string; runId?: string };

type DocumentUnavailableState = {
  title: string;
  message: string;
  reason: string;
} | null;

async function openStarterGrowthCta() {
  const pricingUrl = '/pricing';
  try {
    const base = getBackendBaseUrl();
    const endpoint = base ? `${base}/api/pricing/plans` : '/api/pricing/plans';
    const res = await fetch(endpoint);
    if (!res.ok) {
      window.location.assign(pricingUrl);
      return;
    }
    const data = await res.json() as { plans?: Array<Record<string, unknown>> };
    const plan = data.plans?.find(p => p.plan_id === 'starter_growth');
    const ctaUrl = typeof plan?.cta_url === 'string' ? plan.cta_url : '';
    if (ctaUrl.startsWith('http://') || ctaUrl.startsWith('https://')) {
      window.location.assign(ctaUrl);
      return;
    }
  } catch {
    /* fall through to pricing */
  }
  window.location.assign(pricingUrl);
}


interface RunningStage extends AnalysisStageData {
  status: StageStatus;
}

const DEFAULT_NEXT_DILIGENCE_QUESTIONS = [
  'What is current ARR and ARR growth over the last 24 months?',
  'What share of revenue is recurring software vs services?',
  'What are GRR, NRR and logo churn?',
  'Who are the top 10 customers and what percentage of revenue do they represent?',
  'What is implementation effort and average time to go live?',
  'Which product modules are mission-critical?',
  'Which AI capabilities are live in production versus roadmap?',
  'What integrations are critical to customer workflows?',
  'What is gross margin by product/service line?',
  'What would cause customer churn?',
];

const DEFAULT_DOCUMENTS_TO_REQUEST = [
  'Latest management accounts',
  'ARR bridge',
  'Revenue by customer',
  'Top-10 customer concentration',
  'GRR/NRR/churn report',
  'Revenue split: software, services, maintenance, implementation',
  'Sales pipeline',
  'Product roadmap',
  'Customer contracts / SOWs',
  'Implementation backlog',
  'AI/product architecture note if AI claims exist',
];

const DOCUMENT_ASSISTED_STAGES: AnalysisStageData[] = [
  { id: 1, label: 'Preparing evidence screen', evidenceFound: 0, confidence: 'Medium', finding: 'Preparing the document-assisted acquisition screen.', durationMs: 1200 },
  { id: 2, label: 'Reading uploaded document', evidenceFound: 0, confidence: 'Medium', finding: 'Reading the uploaded non-confidential PDF.', durationMs: 1600 },
  { id: 3, label: 'Extracting company claims', evidenceFound: 0, confidence: 'Medium', finding: 'Extracting company claims and marking them as not independently verified.', durationMs: 1800 },
  { id: 4, label: 'Checking public sources', evidenceFound: 0, confidence: 'Medium', finding: 'Checking public sources where a company website is provided.', durationMs: 1800 },
  { id: 5, label: 'Ranking evidence and gaps', evidenceFound: 0, confidence: 'Medium', finding: 'Separating verified facts, company claims, unknowns and diligence blockers.', durationMs: 1600 },
  { id: 6, label: 'Preparing IC-readiness view', evidenceFound: 0, confidence: 'Medium', finding: 'Preparing the IC readiness view and saving the run summary.', durationMs: 1400 },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function levelClass(level: Level | string) {
  switch (level) {
    case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'red':   return 'bg-red-500/10   text-red-400   border-red-500/20';
    case 'green': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'blue':  return 'bg-blue-500/10  text-blue-400  border-blue-500/20';
    default:      return 'bg-muted/40 text-muted-foreground border-border';
  }
}

function evidenceChipClass(status: EvidenceStatus) {
  const map: Record<EvidenceStatus, string> = {
    verified: 'bg-green-500/10 text-green-400 border-green-500/20',
    caveat:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    claim:    'bg-blue-500/10  text-blue-400  border-blue-500/20',
    blocking: 'bg-red-500/10   text-red-400   border-red-500/20',
    unknown:  'bg-muted/40     text-muted-foreground border-border',
  };
  return map[status] ?? map.unknown;
}

/** Evidence status chip with defensive rendering (three-gate model).
 *  Passes status + source + confidence to safeEvidenceStatus.
 *  Never renders green 'verified' unless all three gates pass. */
function EvidenceChip({
  status, source, confidence,
}: { status: string | null | undefined; source?: string | null; confidence?: string | null }) {
  const safe = safeEvidenceStatus(status, source, confidence);
  const DISPLAY: Record<EvidenceStatus, string> = {
    verified: 'Verified',
    caveat:   'Company claim',
    claim:    'Company claim',
    blocking: 'Blocker',
    unknown:  'Not independently verified',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0',
      evidenceChipClass(safe),
    )}>
      {DISPLAY[safe]}
    </span>
  );
}

function confidenceColor(c: string) {
  if (c === 'High')   return 'text-green-400';
  if (c === 'Medium') return 'text-amber-400';
  return 'text-red-400';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    const rendered = value.map(item => textValue(item, '')).filter(Boolean).join(', ');
    return rendered || fallback;
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    const primary = rec.summary ?? rec.message ?? rec.finding ?? rec.claim_text ?? rec.blocker ?? rec.value ?? rec.status ?? rec.label ?? rec.name;
    if (primary !== undefined && primary !== value) return textValue(primary, fallback);
    const pairs = Object.entries(rec)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 3)
      .map(([k, v]) => `${formatLabel(k)}: ${String(v)}`);
    return pairs.join(' · ') || fallback;
  }
  const s = String(value).trim();
  return s || fallback;
}

function displayValue(value: unknown, fallback = 'Not found in this run'): string {
  return textValue(value, fallback);
}

function resultModeLabel(value: unknown): string {
  const raw = textValue(value, 'public_source_preview').toLowerCase();
  if (raw === 'private_beta_preview' || raw === 'private beta · public-source screen') return 'Public-source preview';
  if (raw === 'public_source_preview' || raw === 'url_only_public_screen' || raw === 'public_sources_only') return 'Public-source preview';
  return formatLabel(raw);
}

function confidenceValue(value: unknown): 'High' | 'Medium' | 'Low' {
  const s = textValue(value).toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'medium') return 'Medium';
  return 'Low';
}

function evidenceStatusValue(value: unknown): EvidenceStatus {
  return safeEvidenceStatus(textValue(value), undefined, undefined);
}

function sourceAttribution(c: Record<string, unknown>): string {
  const sourceUrl = textValue(c.source_url, '');
  const sourceLabel = textValue(c.source_label ?? c.source_name, '');
  const source = textValue(c.source ?? c.source_type ?? c.evidence_source, '');
  if (sourceLabel && sourceUrl) return `${sourceLabel} · ${sourceUrl}`;
  if (sourceUrl) return sourceUrl;
  if (sourceLabel) return sourceLabel;
  return source || 'Not verified in this run';
}

function recommendationLevel(value: unknown): Level {
  const s = textValue(value).toLowerCase();
  if (!s) return 'grey';
  if (s.includes('request') || s.includes('review') || s.includes('financial')) return 'amber';
  if (s.includes('pass') || s.includes('reject') || s.includes('decline')) return 'red';
  if (s.includes('proceed') || s.includes('advance') || s.includes('ready')) return 'green';
  return 'blue';
}

function readinessText(value: unknown, fallback = 'Not verified in this run'): string {
  const s = textValue(value);
  return s ? formatLabel(s) : fallback;
}

function isFinancialEvidenceCard(card: AnalysisEvidenceCard): boolean {
  const haystack = `${card.field} ${card.summary} ${card.value}`.toLowerCase();
  return /\b(revenue|arr|financial|ebitda|turnover)\b/.test(haystack);
}

function hasConcreteSource(card: AnalysisEvidenceCard): boolean {
  const source = textValue(card.source_url ?? card.source_label ?? card.source, '').toLowerCase();
  return Boolean(source) && ![
    'not verified in this run',
    'public annual report/results source',
    'annual report/results source',
    'public source',
    'source',
  ].includes(source);
}

function isVerifiedMetric(card: AnalysisEvidenceCard, pattern: RegExp): boolean {
  const haystack = `${card.field} ${card.summary} ${card.value}`.toLowerCase();
  return pattern.test(haystack)
    && safeEvidenceStatus(card.status, card.source, card.confidence) === 'verified'
    && hasConcreteSource(card);
}

function financialStatusCard(cards: AnalysisEvidenceCard[]): { value: string; level: Level } {
  const financialCards = cards.filter(isFinancialEvidenceCard);
  const hasVerifiedRevenue = financialCards.some(card => isVerifiedMetric(card, /\b(revenue|turnover)\b/));
  const hasVerifiedArr = financialCards.some(card => isVerifiedMetric(card, /\barr\b|annual recurring revenue/));
  const hasVerifiedRetention = cards.some(card => isVerifiedMetric(card, /\b(retention|churn|grr|nrr)\b/));
  const hasVerifiedConcentration = cards.some(card => isVerifiedMetric(card, /\b(customer concentration|top[- ]?10)\b/));

  if (hasVerifiedRevenue && hasVerifiedArr && hasVerifiedRetention && hasVerifiedConcentration) {
    return { value: 'Financial diligence substantially source-backed', level: 'green' };
  }
  if (hasVerifiedRevenue && !hasVerifiedArr) {
    return { value: 'Revenue verified; ARR and revenue quality not yet underwritten', level: 'amber' };
  }
  const hasRevenueSignal = financialCards.some(card => {
    const haystack = `${card.field} ${card.value} ${card.summary}`.toLowerCase();
    return haystack.includes('revenue') && textValue(card.value, '') !== '';
  });
  if (hasRevenueSignal) {
    return { value: 'Revenue signal found; source verification incomplete', level: 'amber' };
  }
  return { value: 'Financials not verified', level: 'red' };
}

function blockerTitle(item: unknown): string {
  const rec = asRecord(item);
  return textValue(rec.title ?? rec.field ?? rec.blocker ?? rec.claim_text ?? rec.detail ?? item, '');
}

function blockerSummary(item: unknown): string {
  const rec = asRecord(item);
  return textValue(rec.summary ?? rec.why_it_matters ?? rec.next_document_or_request_needed ?? rec.next_step, '');
}

function sourceLine(item: Record<string, unknown>): string {
  const label = textValue(item.source_label ?? item.source, '');
  const url = textValue(item.source_url, '');
  if (label && url && label !== url) return `${label} · ${url}`;
  return label || url;
}

function valueRecord(value: unknown): Record<string, unknown> {
  const rec = asRecord(value);
  const nested = asRecord(rec.value);
  return Object.keys(nested).length > 0 ? nested : rec;
}

function PackSection({
  title,
  children,
  empty,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card/50">
        <p className="text-[10px] font-mono uppercase tracking-widest text-primary">{title}</p>
      </div>
      {empty ? (
        <div className="px-4 py-4 text-xs text-muted-foreground">
          {emptyMessage ?? 'Not found in public-source preview. Request management accounts / ARR bridge.'}
        </div>
      ) : (
        <div className="p-4">{children}</div>
      )}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const normalised = label.toLowerCase();
  const status: EvidenceStatus =
    normalised.includes('verified') || normalised.includes('source-backed') ? 'verified' :
    normalised.includes('blocking') ? 'blocking' :
    normalised.includes('unknown') || normalised.includes('not source-backed') ? 'unknown' :
    normalised.includes('signal') ? 'caveat' :
    'claim';
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0', evidenceChipClass(status))}>
      {label}
    </span>
  );
}

function SnapshotGrid({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).filter(([, value]) => {
    const rec = valueRecord(value);
    return textValue(rec.value ?? value, '') !== '';
  });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([key, value]) => {
        const rec = valueRecord(value);
        const source = sourceLine(rec);
        return (
          <div key={key} className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{formatLabel(key)}</p>
            <p className="text-xs text-foreground leading-snug">{displayValue(rec.value ?? value, 'Not found in public-source preview')}</p>
            {source && <p className="text-[10px] text-muted-foreground/50 mt-1">Source: {source}</p>}
          </div>
        );
      })}
    </div>
  );
}

function PositioningList({ title, items, empty }: { title: string; items: unknown[]; empty: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item, i) => {
            const rec = asRecord(item);
            const source = sourceLine(rec);
            return (
              <li key={i} className="text-xs text-muted-foreground leading-snug">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  <span className="min-w-0">
                    <span className="text-foreground">{displayValue(rec.text ?? item)}</span>
                    <span className="ml-2"><StatusPill label={formatLabel(textValue(rec.classification, 'claim'))} /></span>
                    {source && <span className="block text-[10px] text-muted-foreground/50 mt-0.5">Source: {source}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const SOURCE_COVERAGE_LABELS: Record<string, string> = {
  company_website: 'Company website',
  public_registry: 'Public registry / filing checks',
  evidence_sanity: 'Evidence sanity checks',
  public_financial_sources: 'Public financial-source search',
  management_accounts: 'Management accounts',
  customer_data: 'Customer data',
  job_postings: 'Job postings',
  tech_stack: 'Technology / stack signals',
  traffic_estimates: 'Traffic / market attention signals',
  product_launch_cadence: 'Product launch cadence',
};

function sourceCoverageLabel(value: unknown): string {
  const raw = textValue(value, '').trim();
  return SOURCE_COVERAGE_LABELS[raw] || formatLabel(raw);
}

function CoveragePill({ status }: { status: 'checked' | 'not_checked' | 'private_beta' | 'requires_documents' }) {
  const label = status === 'checked'
    ? 'Checked'
    : status === 'private_beta'
      ? 'Pilot access'
      : status === 'requires_documents'
        ? 'Requires documents'
        : 'Not checked in this preview';
  const level: Level = status === 'checked' ? 'green' : status === 'private_beta' ? 'blue' : status === 'requires_documents' ? 'amber' : 'grey';
  return <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0', levelClass(level))}>{label}</span>;
}

function CoverageList({
  title,
  items,
  status,
  empty,
}: {
  title: string;
  items: unknown[];
  status: 'checked' | 'not_checked' | 'private_beta' | 'requires_documents';
  empty: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${title}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/30 px-3 py-2">
              <span className="text-xs text-foreground">{sourceCoverageLabel(item)}</span>
              <CoveragePill status={status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function normalizeBackendEvidenceCard(item: unknown, fallbackField: string): AnalysisEvidenceCard {
  if (typeof item === 'string') {
    return {
      field: item,
      value: '',
      status: 'blocking',
      source: 'Diligence blocker',
      summary: '',
      confidence: 'Low',
    };
  }
  const c = asRecord(item);
  const field = textValue(c.field ?? c.title ?? c.name ?? c.claim_type ?? c.blocker, fallbackField);
  const value = textValue(c.value ?? c.metric ?? c.claim_text ?? '');
  const summary = textValue(
    c.summary ?? c.why_it_matters ?? c.ic_impact ?? c.evidence_needed ?? c.next_action ?? c.claim_text,
    '',
  );
  const source = sourceAttribution(c);
  const status = safeEvidenceStatus(textValue(c.status ?? c.evidence_status), source, textValue(c.confidence, ''));
  return {
    field,
    value,
    status,
    source,
    source_url: textValue(c.source_url, ''),
    source_label: textValue(c.source_label ?? c.source_name, ''),
    source_metadata: c.source_metadata,
    summary,
    confidence: confidenceValue(c.confidence),
  };
}

function evidenceStrength(card: AnalysisEvidenceCard): number {
  const statusScore = card.status === 'verified' ? 4 : card.status === 'claim' ? 3 : card.status === 'caveat' ? 2 : card.status === 'blocking' ? 1 : 0;
  const confidenceScore = card.confidence === 'High' ? 3 : card.confidence === 'Medium' ? 2 : 1;
  const sourceScore = hasConcreteSource(card) ? 3 : card.source ? 1 : 0;
  return statusScore * 10 + confidenceScore + sourceScore;
}

function dedupeEvidenceCards(cards: AnalysisEvidenceCard[]): AnalysisEvidenceCard[] {
  const byKey = new Map<string, AnalysisEvidenceCard>();
  for (const card of cards) {
    const field = textValue(card.field).toLowerCase().replace(/\s+/g, ' ').trim();
    const value = textValue(card.value).toLowerCase().replace(/\s+/g, ' ').trim();
    const source = textValue(card.source_url || card.source).toLowerCase().replace(/\s+/g, ' ').trim();
    const metric = /\b(revenue|turnover|arr|ebitda|profit|cash|debt)\b/.exec(`${field} ${value}`)?.[1] || field;
    const key = /\b(revenue|turnover|arr|ebitda|profit|cash|debt)\b/.test(`${field} ${value}`)
      ? `financial:${metric}:${value}:${source}`
      : `${field}:${value}:${source}:${card.status}`;
    const existing = byKey.get(key);
    if (!existing || evidenceStrength(card) > evidenceStrength(existing)) {
      byKey.set(key, card);
    }
  }
  return Array.from(byKey.values());
}

function normalizeUrlAnalysisResult(raw: AnalysisResult, fallbackCompany: string, fallbackWebsite: string): AnalysisResult {
  const r = asRecord(raw);
  const bundle = asRecord(r.evidence_bundle);
  const cardsRaw = asArray(r.evidence_cards).length > 0 ? asArray(r.evidence_cards) : asArray(bundle.evidence_cards);
  const verifiedRaw = asArray(r.verified_facts).length > 0 ? asArray(r.verified_facts) : asArray(bundle.verified_facts);
  const claimsRaw = asArray(r.claims).length > 0 ? asArray(r.claims) : asArray(bundle.claims);
  const unknownsRaw = asArray(r.unknowns).length > 0 ? asArray(r.unknowns) : asArray(bundle.unknowns);
  const actionableBlockers = asArray(r.actionable_diligence_blockers).length > 0
    ? asArray(r.actionable_diligence_blockers)
    : asArray(bundle.actionable_diligence_blockers);
  const blockersRaw = actionableBlockers.length > 0
    ? actionableBlockers
    : asArray(r.diligence_blockers).length > 0
      ? asArray(r.diligence_blockers)
      : asArray(bundle.diligence_blockers ?? bundle.blockers);

  const evidenceCards: AnalysisEvidenceCard[] = dedupeEvidenceCards([
    ...cardsRaw.map((item, i) => normalizeBackendEvidenceCard(item, `Evidence ${i + 1}`)),
    ...verifiedRaw.map((item, i) => {
      const card = normalizeBackendEvidenceCard(item, `Verified fact ${i + 1}`);
      return { ...card, status: safeEvidenceStatus(card.status, card.source, card.confidence) };
    }),
    ...claimsRaw.map((item, i) => {
      const card = normalizeBackendEvidenceCard(item, `Claim ${i + 1}`);
      return { ...card, status: card.status === 'unknown' ? 'claim' as EvidenceStatus : card.status };
    }),
    ...unknownsRaw.map((item, i) => {
      const card = normalizeBackendEvidenceCard(item, `Unknown ${i + 1}`);
      return { ...card, status: 'unknown' as EvidenceStatus, source: 'Not verified in this run' };
    }),
    ...blockersRaw.map((item, i) => {
      const card = normalizeBackendEvidenceCard(item, `Blocker ${i + 1}`);
      return { ...card, status: 'blocking' as EvidenceStatus, source: card.source || 'Diligence blocker' };
    }),
  ]);

  const mainBlocker = textValue(r.main_blocker ?? bundle.main_blocker ?? blockersRaw[0], '');
  if (mainBlocker && !evidenceCards.some(c => c.field === mainBlocker)) {
    evidenceCards.push({
      field: mainBlocker,
      value: '',
      status: 'blocking',
      source: 'Diligence blocker',
      summary: textValue(r.next_action, ''),
      confidence: 'Low',
    });
  }

  const sf = asRecord(r.strategic_fit);
  const ai = asRecord(r.ai_disruption);
  const innovation = asRecord(r.innovation_operating_signals);
  const companyName = textValue(r.company_name ?? r.company, fallbackCompany);

  return {
    ...raw,
    status: (r.status === 'ok' ? 'ok' : 'partial') as 'ok' | 'partial',
    data_mode: resultModeLabel(r.data_mode ?? r.source_mode ?? r.verification_mode),
    company: companyName,
    company_name: companyName,
    website: textValue(r.website, fallbackWebsite),
    recommendation: textValue(r.recommendation, 'Request financials'),
    recommendation_level: recommendationLevel(r.recommendation),
    ic_readiness: readinessText(r.ic_readiness, 'Request financials'),
    valuation_readiness: readinessText(r.valuation_readiness, 'Not ready'),
    strategic_fit_label: textValue(sf.label ?? sf.score, 'Not assessed'),
    evidence_confidence: textValue(r.evidence_confidence, '')
      ? confidenceValue(r.evidence_confidence)
      : r.evidence_confidence_score != null ? `${r.evidence_confidence_score}/100` : 'Not verified in this run',
    ai_replica_risk: textValue(ai.replica_risk, 'Not assessed in this run'),
    ai_moat: textValue(ai.moat_evidence, 'Not assessed in this run'),
    next_action: textValue(r.next_action ?? mainBlocker, 'Request source-backed financials and management data.'),
    strategic_fit: {
      score: textValue(sf.score, 'Not assessed'),
      why_fits: asArray(sf.why_fits).map(String),
      why_not: asArray(sf.why_not).map(String),
      assumptions: asArray(sf.assumptions).map(String),
      risks: asArray(sf.risks).map(String),
      diligence_questions: asArray(sf.diligence_questions).map(String),
    },
    evidence_cards: evidenceCards,
    ai_disruption: {
      replica_risk: textValue(ai.replica_risk, 'Not assessed in this run'),
      replica_risk_level: recommendationLevel(ai.replica_risk),
      moat_evidence: textValue(ai.moat_evidence, 'Not assessed in this run'),
      inference_economics: textValue(ai.inference_economics, 'Not assessed in this run'),
      product_expansion: textValue(ai.product_expansion, 'Not assessed in this run'),
      opex_improvement: textValue(ai.opex_improvement, 'Not assessed in this run'),
      diligence_questions: asArray(ai.diligence_questions).map(String),
    },
    verified_facts: verifiedRaw,
    claims: claimsRaw,
    unknowns: unknownsRaw,
    diligence_blockers: blockersRaw,
    analysis_quality: r.analysis_quality,
    run_log: asArray(r.run_log),
    innovation_operating_signals: innovation,
    company_snapshot: r.company_snapshot ?? bundle.company_snapshot,
    public_positioning: r.public_positioning ?? bundle.public_positioning,
    public_signals: asArray(r.public_signals).length > 0 ? asArray(r.public_signals) : asArray(bundle.public_signals),
    financial_signals: r.financial_signals ?? bundle.financial_signals,
    structured_unknowns: asArray(r.structured_unknowns).length > 0 ? asArray(r.structured_unknowns) : asArray(bundle.structured_unknowns),
    next_questions: asArray(r.next_questions).length > 0 ? asArray(r.next_questions) : asArray(bundle.next_questions),
    recommended_documents: asArray(r.recommended_documents).length > 0 ? asArray(r.recommended_documents) : asArray(bundle.recommended_documents),
    acquisition_readiness_summary: r.acquisition_readiness_summary ?? bundle.acquisition_readiness_summary,
    __sample_fallback: false,
    fallback_used: false,
  };
}

// ─── Scenario selector ───────────────────────────────────────────────────────

function ScenarioSelector({ activeId, onSelect }: { activeId: string; onSelect: (s: DemoScenario) => void }) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Sample scenarios</p>
      <p className="text-xs text-muted-foreground mb-4">Select a scenario to pre-fill the form with an example acquisition screen.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {DEMO_SCENARIOS.map((scenario) => {
          const isActive = scenario.id === activeId;
          return (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              className={cn(
                'text-left rounded-lg border p-3.5 transition-all hover:border-primary/50 hover:bg-primary/5',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-foreground leading-snug">{scenario.name}</p>
                {isActive && (
                  <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border bg-primary/10 text-primary border-primary/20">
                    active
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{scenario.jurisdiction} · {scenario.mode}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 text-muted-foreground/60 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{scenario.buyer_thesis}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-amber-500/80 leading-snug line-clamp-1">{scenario.main_risk}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <FileOutput className="w-3 h-3 text-primary/50 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-primary/70 leading-snug line-clamp-1">{scenario.expected_output}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Input' },
    { n: 2, label: 'Analysis' },
    { n: 3, label: 'Result' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border transition-colors',
              step === s.n
                ? 'bg-primary text-primary-foreground border-primary'
                : step > s.n
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-muted/30 text-muted-foreground border-border',
            )}>
              {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={cn(
              'text-xs font-medium transition-colors',
              step === s.n ? 'text-foreground' : 'text-muted-foreground',
            )}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-border mx-2 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

/** Prepends https:// when the user omits the scheme. */
function normaliseUrl(val: string): string {
  const t = val.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Returns true when val looks like a real URL with a host. */
function isValidUrl(val: string): boolean {
  try {
    const u = new URL(normaliseUrl(val));
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

function analysisPayloadError(value: unknown, fallback = 'Backend analysis failed.'): string {
  const record = asRecord(value);
  const lines = [
    textValue(record.message ?? record.detail, fallback),
    record.status ? `backend_status: ${textValue(record.status)}` : '',
    record.reason ? `backend_reason: ${textValue(record.reason)}` : '',
    record.error_code ? `error_code: ${textValue(record.error_code)}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function completeStages(stages: RunningStage[]): RunningStage[] {
  return stages.map(stage => ({ ...stage, status: 'complete' as StageStatus }));
}

// ─── Step 1: Input form ───────────────────────────────────────────────────────

interface Step1Props {
  sampleMode: boolean;
  scenario: DemoScenario;
  company: string; setCompany: (v: string) => void;
  website: string; setWebsite: (v: string) => void;
  buyer: string; setBuyer: (v: string) => void;
  buyerThesis: string; setBuyerThesis: (v: string) => void;
  jurisdiction: JurisdictionCode; setJurisdiction: (v: JurisdictionCode) => void;
  mode: ModeCode; setMode: (v: ModeCode) => void;
  documentFile: File | null; setDocumentFile: (v: File | null) => void;
  documentType: DocumentTypeCode; setDocumentType: (v: DocumentTypeCode) => void;
  confidentialityAcknowledged: boolean; setConfidentialityAcknowledged: (v: boolean) => void;
  onScenarioSelect: (s: DemoScenario) => void;
  onRun: () => void;
  analysisInFlight: boolean;
  backendConfigured: boolean;
  investmentStyle: InvestmentStyle; setInvestmentStyle: (v: InvestmentStyle) => void;
  riskPosture: RiskPosture;         setRiskPosture:     (v: RiskPosture) => void;
}

function Step1({
  sampleMode, scenario, company, setCompany, website, setWebsite,
  buyer, setBuyer, buyerThesis, setBuyerThesis,
  jurisdiction, setJurisdiction, mode, setMode,
  documentFile, setDocumentFile, documentType, setDocumentType,
  confidentialityAcknowledged, setConfidentialityAcknowledged,
  onScenarioSelect, onRun, analysisInFlight, backendConfigured,
  investmentStyle, setInvestmentStyle, riskPosture, setRiskPosture,
}: Step1Props) {
  const [urlError, setUrlError] = React.useState('');
  const [urlScreensUsed, setUrlScreensUsed] = React.useState(() => {
    try { return getRuns().filter(r => r.type === 'url').length; } catch { return 0; }
  });

  React.useEffect(() => {
    function refreshUsage() {
      try { setUrlScreensUsed(getRuns().filter(r => r.type === 'url').length); }
      catch { setUrlScreensUsed(0); }
    }
    window.addEventListener('storage', refreshUsage);
    window.addEventListener('focus', refreshUsage);
    return () => {
      window.removeEventListener('storage', refreshUsage);
      window.removeEventListener('focus', refreshUsage);
    };
  }, []);

  const urlScreensLimit = getTrialAccount()?.url_screens_limit ?? 5;
  const screensLeft = Math.max(0, urlScreensLimit - urlScreensUsed);
  const quotaReached = screensLeft <= 0;
  const documentAttached = Boolean(documentFile);
  const documentMode = mode === 'doc-assisted';
  const pdfError = documentFile && !documentFile.name.toLowerCase().endsWith('.pdf') && documentFile.type !== 'application/pdf'
    ? 'Only PDF files are supported.'
    : documentFile && documentFile.size > 10 * 1024 * 1024
      ? 'PDF must be 10MB or smaller.'
      : '';
  const documentFileRequired = documentMode && !documentFile;
  const documentAckRequired = documentAttached && !confidentialityAcknowledged;

  const CHECK_LIST = [
    'Entity and registry sources',
    'Evidence quality and source hierarchy',
    'Document claims, public facts and financial evidence',
    'AI defensibility and replica risk',
    'Buyer-specific fit',
    'Diligence gaps and IC readiness',
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
        {/* Left: form */}
        <div className="lg:col-span-3">
          <Card className="border-border bg-card/90">
            <CardHeader className="pb-5">
              <CardTitle className="text-lg">Set up an evidence-first acquisition screen.</CardTitle>
              <CardDescription>
                Start with a company website and, where available, one non-confidential deck or teaser. Frontier OS separates verified facts, company claims, unknowns and diligence blockers for IC readiness.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={e => {
                  e.preventDefault();
                  if (quotaReached) return;
                  const normalised = normaliseUrl(website);
                  if (!isValidUrl(normalised)) {
                    setUrlError('Please enter a valid company website URL.');
                    return;
                  }
                  if (pdfError || documentFileRequired || documentAckRequired) return;
                  if (normalised !== website) setWebsite(normalised);
                  setUrlError('');
                  onRun();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company name</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Company website URL</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={e => { setWebsite(e.target.value); if (urlError) setUrlError(''); }}
                      onBlur={() => {
                        const n = normaliseUrl(website);
                        if (n !== website) setWebsite(n);
                        if (n && !isValidUrl(n)) setUrlError('Please enter a valid company website URL.');
                        else setUrlError('');
                      }}
                      className={cn('bg-background', urlError ? 'border-destructive focus-visible:ring-destructive' : '')}
                      placeholder="https://company.com"
                    />
                    {urlError ? (
                      <p className="text-xs text-destructive">{urlError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Enter the target company's public website.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer">Buyer / platform name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="buyer"
                    placeholder="Leave blank for generic screen"
                    value={buyer}
                    onChange={e => setBuyer(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer_thesis">
                    Buyer thesis <span className="text-muted-foreground font-normal">(optional, improves strategic fit)</span>
                  </Label>
                  <textarea
                    id="buyer_thesis"
                    rows={3}
                    placeholder="Platform add-on criteria, strategic fit, revenue quality thresholds, diligence focus..."
                    value={buyerThesis}
                    onChange={e => setBuyerThesis(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select value={jurisdiction} onValueChange={v => setJurisdiction(v as JurisdictionCode)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uk">UK</SelectItem>
                      <SelectItem value="us">US</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                      <SelectItem value="fr">France</SelectItem>
                      <SelectItem value="it">Italy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('doc-assisted')}
                    className={cn(
                      'text-left rounded-lg border px-4 py-3 transition-colors',
                      mode === 'doc-assisted' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/30 hover:bg-card/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">Website + document</p>
                      <span className="text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Upload one non-confidential PDF such as a pitch deck, teaser, public investor deck or annual report. Frontier OS extracts claims, checks public evidence and prepares the IC-readiness view.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('url-only'); setDocumentFile(null); setConfidentialityAcknowledged(false); }}
                    className={cn(
                      'text-left rounded-lg border px-4 py-3 transition-colors',
                      mode === 'url-only' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/30 hover:bg-card/60',
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">Website only</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Run a public-source screen when no document is available.
                    </p>
                  </button>
                </div>

                {documentMode && (
                  <div className="rounded-lg border border-border bg-card/30 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Upload one non-confidential PDF</p>
                      <span className="ml-auto text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5 whitespace-nowrap">
                        Document-assisted review
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Frontier OS extracts document claims and checks public evidence. Document-derived items are company claims, not independently verified facts.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="document_type">Document type</Label>
                        <Select value={documentType} onValueChange={v => setDocumentType(v as DocumentTypeCode)}>
                          <SelectTrigger id="document_type" className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pitch_deck">Pitch deck</SelectItem>
                            <SelectItem value="teaser">Teaser</SelectItem>
                            <SelectItem value="cim_excerpt">CIM excerpt</SelectItem>
                            <SelectItem value="investor_deck">Investor deck</SelectItem>
                            <SelectItem value="management_pack">Management pack</SelectItem>
                            <SelectItem value="annual_report">Annual report</SelectItem>
                            <SelectItem value="unknown">Other / unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document_file">PDF</Label>
                        <Input
                          id="document_file"
                          type="file"
                          accept="application/pdf,.pdf"
                          className={cn('bg-background', pdfError ? 'border-destructive focus-visible:ring-destructive' : '')}
                          onChange={e => setDocumentFile(e.currentTarget.files?.[0] ?? null)}
                        />
                        <p className={cn('text-xs', pdfError ? 'text-destructive' : 'text-muted-foreground')}>
                          {pdfError || (documentFile ? documentFile.name : 'Upload a PDF to run document-assisted review. Max 10MB.')}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={confidentialityAcknowledged}
                        onChange={e => setConfidentialityAcknowledged(e.currentTarget.checked)}
                        className="mt-0.5"
                      />
                      <span>I confirm this is non-confidential material and I have permission to upload it.</span>
                    </label>
                    {documentAckRequired && (
                      <p className="text-xs text-amber-300">Confirm non-confidential permission before uploading.</p>
                    )}
                    {documentFileRequired && (
                      <p className="text-xs text-amber-300">Upload a PDF to run a document-assisted screen.</p>
                    )}
                    <p className="text-xs text-red-300/80">Do not upload confidential materials in this preview.</p>
                  </div>
                )}

                <div className={cn(
                  'flex items-start gap-2 px-3 py-2.5 rounded border text-xs',
                  documentMode
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                    : 'bg-green-500/5 border-green-500/20 text-green-400',
                )}>
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {documentMode
                    ? 'Frontier OS separates verified facts, company claims, unknowns and diligence blockers.'
                    : 'Website-only runs use public sources when no document is available.'}
                </div>

                {/* Investment lens */}
                {(
                  <div className="rounded-lg border border-border bg-card/30 px-4 py-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="text-xs font-semibold text-primary">Investment lens</p>
                      <span className="text-[10px] text-muted-foreground/60 leading-none">
                        Guides scores, caveats and management questions
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Investment style</Label>
                        <Select value={investmentStyle} onValueChange={v => setInvestmentStyle(v as InvestmentStyle)}>
                          <SelectTrigger className="bg-background h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strategic_fit">Strategic fit-oriented</SelectItem>
                            <SelectItem value="growth">Growth-oriented</SelectItem>
                            <SelectItem value="profitability">Profitability-oriented</SelectItem>
                            <SelectItem value="value_creation">Value creation-oriented</SelectItem>
                            <SelectItem value="ai_defensibility">AI defensibility-oriented</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Risk posture</Label>
                        <Select value={riskPosture} onValueChange={v => setRiskPosture(v as RiskPosture)}>
                          <SelectTrigger className="bg-background h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="conviction_led">Conviction-led</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={analysisInFlight || quotaReached || !company.trim() || !website.trim() || Boolean(pdfError) || documentFileRequired || documentAckRequired}
                >
                  {analysisInFlight ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running analysis
                    </>
                  ) : quotaReached ? (
                    'Free preview limit reached'
                  ) : (
                    <>
                      {documentMode ? 'Run document-assisted review' : 'Run public-source screen'} <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {quotaReached && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-300">Free preview limit reached.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start access to continue, or reset local workspace for local testing.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openStarterGrowthCta}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Start access <ExternalLink className="w-3 h-3" />
                      </button>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
                      >
                        Open pricing
                      </Link>
                      {import.meta.env.DEV && (
                        <Link
                          href="/app/settings"
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Reset local workspace in Workspace
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center pt-1">
                  <a
                    href={BOOK_INTRO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => console.log('[analytics] clicked_book_intro_run_form')}
                  >
                    Prefer to talk first? Book a 30-minute intro <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: what it checks */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card h-full p-6 flex flex-col">
            <p className="text-xs font-semibold text-primary mb-5">Review scope</p>
            <div className="flex-1 space-y-3.5">
              {CHECK_LIST.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border border-border bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground">{i + 1}</span>
                  </div>
                  <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Primary flow: company website plus one non-confidential PDF. Website-only public-source preview remains available when no document is attached.
              </p>
            </div>
          </div>
        </div>
      </div>

      {sampleMode && (
        <div className="border-t border-border pt-8">
          <p className="text-base font-semibold text-foreground mb-1">Try another scenario.</p>
          <p className="text-sm text-muted-foreground mb-6">Select a pre-configured screen to see different outputs.</p>
          <ScenarioSelector activeId={scenario.id} onSelect={onScenarioSelect} />
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Analysis timeline ────────────────────────────────────────────────

function Step2({
  company,
  stages,
  isComplete,
  completionMessage,
  error,
  documentUnavailable,
  isFinalising,
  finalisingElapsedSecs,
  onContinue,
  onUseWebsiteOnly,
}: {
  company: string;
  stages: RunningStage[];
  isComplete: boolean;
  completionMessage?: string;
  error?: string | null;
  documentUnavailable?: DocumentUnavailableState;
  isFinalising: boolean;
  finalisingElapsedSecs: number;
  onContinue: () => void;
  onUseWebsiteOnly: () => void;
}) {
  const completedCount = stages.filter(s => s.status === 'complete').length;
  const total = stages.length;
  const showFinalising = isFinalising && !isComplete && !error && !documentUnavailable && completedCount === total;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-foreground">
            Screening <span className="text-primary">{company || 'target'}</span>
          </p>
          <span className="text-xs font-mono text-muted-foreground">
            {completedCount} / {total}
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-xs text-muted-foreground">
            {error
              ? 'Analysis failed.'
              : documentUnavailable
              ? 'Document-assisted review is not enabled in this workspace yet.'
              : isComplete
              ? completionMessage || 'Analysis complete.'
              : showFinalising
              ? 'Finalising evidence screen…'
              : 'Public-source preview. Evidence checked. Gaps flagged.'}
          </p>
        </div>

        <div className="divide-y divide-border">
          {stages.map(stage => (
            <div
              key={stage.id}
              className={cn(
                'px-4 py-3 transition-colors',
                stage.status === 'running'  ? 'bg-primary/5' :
                stage.status === 'complete' ? 'bg-background' :
                'bg-muted/5 opacity-40',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 shrink-0 flex items-center justify-center mt-0.5">
                  {stage.status === 'complete' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : stage.status === 'running' ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium',
                    stage.status === 'queued' ? 'text-muted-foreground' : 'text-foreground',
                  )}>
                    {stage.id}. {stage.label}
                  </p>
                  {stage.status !== 'queued' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {stage.finding}
                    </p>
                  )}
                </div>

                {stage.status !== 'queued' && (
                  <div className="text-right shrink-0 space-y-0.5 ml-2">
                    {stage.evidenceFound > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground">+{stage.evidenceFound}</p>
                    )}
                    <p className={cn('text-[10px] font-mono', confidenceColor(stage.confidence))}>
                      {stage.confidence.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-400">Analysis could not complete.</p>
            {(() => {
              const lines = String(error).split('\n').filter(Boolean);
              const summary = lines[0] || String(error);
              const details = lines.slice(1);
              return (
                <>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{summary}</p>
                  {details.length > 0 && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer text-red-400/80">Connection diagnostics</summary>
                      <div className="mt-2 rounded-md border border-red-500/15 bg-background/60 px-3 py-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                        {details.join('\n')}
                      </div>
                    </details>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {documentUnavailable && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-300">{documentUnavailable.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {documentUnavailable.message}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] font-mono text-muted-foreground/70">Technical details</summary>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                Reason: {documentUnavailable.reason}
              </p>
            </details>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onUseWebsiteOnly}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
              >
                Use website-only preview
              </button>
              <Link
                href="/request-pilot"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Request pilot access
              </Link>
            </div>
          </div>
        </div>
      )}

      {showFinalising && (
        <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 overflow-hidden">
          <div className="px-4 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Finalising evidence screen…</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Preparing the IC readiness view and saving the run summary.
              </p>
              {finalisingElapsedSecs >= 10 && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  This can take a little longer while public sources are checked. Please keep this tab open.
                </p>
              )}
              {finalisingElapsedSecs >= 30 && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Still working. Public-source checks can be slow. You can keep waiting or run another target.
                </p>
              )}
            </div>
          </div>
          <div className="h-1 bg-primary/10 overflow-hidden">
            <div className="h-full w-1/3 bg-primary/70 animate-pulse" />
          </div>
        </div>
      )}

      {/* Analysis mode note */}
      <div className="mt-4 px-4 py-3 rounded-lg bg-muted/20 border border-border/60">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/80">Public-source preview.</span>{' '}
          Evidence checked. Gaps flagged. Frontier OS separates verified facts from claims and shows what still needs diligence.
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1 leading-relaxed">
          Quality-first is available for private pilots once the hosted worker is enabled.
        </p>
      </div>

      {isComplete && !error && !documentUnavailable && (
        <div className="mt-6 flex justify-end">
          <Button onClick={onContinue} className="h-10">
            View result <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Locked feature card ──────────────────────────────────────────────────────

function LockedFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4 flex items-start gap-3">
      <div className="w-7 h-7 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
        <LockIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug mb-2">{description}</p>
        <Link
          href="/request-pilot"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          onClick={() => console.log('[analytics] clicked_request_private_beta_locked_feature')}
        >
          Request pilot access <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function claimText(item: unknown): string {
  const rec = asRecord(item);
  return displayValue(rec.text ?? rec.claim_text ?? rec.summary ?? rec.value ?? item, '');
}

function normalizeUnknown(item: unknown) {
  const rec = asRecord(item);
  const body = typeof item === 'string'
    ? item
    : textValue(rec.detail ?? rec.summary ?? rec.text ?? rec.note ?? rec.claim_text ?? rec.value, '');
  const rawTitle = textValue(rec.topic ?? rec.field ?? rec.title ?? rec.name, '');
  const title = rawTitle && rawTitle.toLowerCase() !== 'unknown'
    ? rawTitle
    : body
      ? 'Diligence gap'
      : 'Diligence gap';
  return {
    title,
    body,
    nextStep: textValue(rec.next_step ?? rec.next_action ?? rec.diligence_question, ''),
  };
}

function UnknownList({ items, empty }: { items: unknown[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const unknown = normalizeUnknown(item);
        return (
          <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold text-foreground leading-snug">{unknown.title}</p>
              <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                <StatusPill label="Unknown" />
                <StatusPill label="Diligence gap" />
              </div>
            </div>
            {unknown.body && (
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{unknown.body}</p>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-1">Not verified in this run</p>
            {unknown.nextStep && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">Next step: {unknown.nextStep}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocumentClaimList({ items, empty }: { items: unknown[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const rec = asRecord(item);
        const source = textValue(rec.source_label ?? rec.source, 'Uploaded document');
        return (
          <div key={i} className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
            <p className="text-xs text-foreground leading-snug">{claimText(item)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusPill label={formatLabel(textValue(rec.type ?? rec.category, 'company claim'))} />
              <StatusPill label="Company claim" />
              <StatusPill label="Not independently verified" />
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Source: {source} · Status: Claim, not verified
              {rec.page ? ` · Page ${displayValue(rec.page)}` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DocumentAssistedResultDisplay({
  result,
  onRunAnother,
  saveSource,
}: {
  result: DocumentAssistedResult;
  onRunAnother: () => void;
  saveSource?: 'backend' | 'local';
}) {
  const summary = asRecord(result.document_summary);
  const readiness = asRecord(result.acquisition_readiness_summary);
  const publicCheckItems = asArray(result.public_source_check_records).length > 0
    ? asArray(result.public_source_check_records)
    : asArray(result.public_source_checks);
  const publicChecks = publicCheckItems.length > 0
    ? asRecord(publicCheckItems[0])
    : asRecord(result.public_source_checks);
  const extractedClaims = asArray(result.extracted_claims ?? result.claims);
  const financialClaims = asArray(result.financial_claims ?? result.metric_claims);
  const customerClaims = asArray(result.customer_claims);
  const productClaims = asArray(result.product_claims);
  const aiClaims = asArray(result.ai_claims);
  const verifiedFacts = asArray(result.verified_facts);
  const unknowns = asArray(result.unknowns);
  const blockers = asArray(result.diligence_blockers);
  const nextQuestions = asArray(result.next_questions);
  const recommendedDocuments = asArray(result.recommended_documents);
  const sourceReferences = asArray(result.source_references);
  const limitations = asArray(result.limitations);

  if (result.status === 'unavailable') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-5 py-4">
          <p className="text-sm font-semibold text-amber-300">Document-assisted review is not enabled in this workspace yet.</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Use website-only preview, or request pilot access.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] font-mono text-muted-foreground/70">Technical details</summary>
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Reason: {result.reason || 'document_uploads_disabled'}</p>
          </details>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRunAnother}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
            >
              Use website-only preview
            </button>
            <Link
              href="/request-pilot"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request pilot access
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{saveSource === 'backend' ? 'Saved to Cockpit' : 'Saved locally · document-assisted run'}</span>
        <Link href="/cockpit" className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
          Open Cockpit →
        </Link>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Analysis complete · Document-assisted review</p>
          <span className="text-xs font-mono text-muted-foreground">{result.company_name || 'Target'}</span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            ['Recommendation', result.recommendation || 'Request evidence pack'],
            ['IC readiness', result.ic_readiness || 'Not ready'],
            ['Evidence confidence', result.evidence_confidence || 'Claim, not verified'],
            ['Document claims', String(extractedClaims.length)],
            ['Financial claims', String(financialClaims.length)],
            ['Blockers', String(blockers.length)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-xs font-medium text-foreground leading-snug">{value}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border bg-card/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Next action</p>
          <p className="text-xs text-foreground leading-snug">{result.next_action || displayValue(readiness.recommended_next_action, 'Request management accounts and source evidence before IC.')}</p>
        </div>
      </div>

      <PackSection title="Document Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['Document type', formatLabel(textValue(summary.document_type ?? result.document_type, 'unknown'))],
            ['Pages processed', displayValue(summary.pages_processed ?? summary.page_count, '0')],
            ['Claims extracted', displayValue(summary.claim_count, String(extractedClaims.length))],
            ['Financial claims', displayValue(summary.financial_claim_count, String(financialClaims.length))],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-xs text-foreground">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-3">{displayValue(summary.summary, 'Document claims extracted. All document-derived items require independent verification.')}</p>
      </PackSection>

      <PackSection title="Metric Cards">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Claims extracted', String(extractedClaims.length)],
            ['Financial claims', String(financialClaims.length)],
            ['Unknowns', String(unknowns.length)],
            ['Blockers', String(blockers.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </PackSection>

      <PackSection title="Extracted Claims" empty={extractedClaims.length === 0} emptyMessage="No non-metric claims extracted. Metric claims are shown under Financial Claims.">
        <DocumentClaimList items={extractedClaims} empty="No claims extracted." />
      </PackSection>

      <PackSection title="Financial Claims" empty={financialClaims.length === 0} emptyMessage="No financial or metric claims extracted. Request management accounts / ARR bridge.">
        <DocumentClaimList items={financialClaims} empty="No financial claims extracted." />
      </PackSection>

      <PackSection title="Customer / GTM Claims" empty={customerClaims.length === 0} emptyMessage="Customer concentration, retention and GTM evidence not found in the uploaded document.">
        <DocumentClaimList items={customerClaims} empty="No customer claims extracted." />
      </PackSection>

      <PackSection title="Product and AI Claims" empty={[...productClaims, ...aiClaims].length === 0} emptyMessage="Product and AI claims not found in the uploaded document.">
        <DocumentClaimList items={[...productClaims, ...aiClaims]} empty="No product or AI claims extracted." />
      </PackSection>

      <PackSection title="Public Verification Checks">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-snug">
            {publicChecks.checked || publicChecks.status === 'completed'
              ? `Public-source checks ran for ${displayValue(result.website, 'the submitted website')}.`
              : 'Public-source checks were not completed in this run.'}
          </p>
          {publicCheckItems.length > 0 && (
            <div className="space-y-2">
              {publicCheckItems.map((check, i) => {
                const rec = asRecord(check);
                const urls = asArray(rec.source_urls);
                return (
                  <div key={i} className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-foreground">{formatLabel(textValue(rec.check, `Check ${i + 1}`))}</p>
                      <StatusPill label={formatLabel(textValue(rec.status, 'unknown'))} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {displayValue(rec.website ?? result.website, 'Submitted website')}
                      {rec.verified_fact_count != null ? ` · ${displayValue(rec.verified_fact_count)} verified fact(s)` : ''}
                    </p>
                    {urls.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {urls.slice(0, 3).map((url, idx) => (
                          <a key={`${url}-${idx}`} href={textValue(url)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                            {displayValue(url)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {verifiedFacts.length > 0 ? (
            <div className="space-y-2">
              {verifiedFacts.map((fact, i) => {
                const rec = asRecord(fact);
                return (
                  <div key={i} className="rounded-md border border-green-500/20 bg-green-500/[0.03] px-3 py-2.5">
                    <p className="text-xs text-foreground">{displayValue(rec.field ?? rec.title ?? rec.claim_type)} {rec.value ? `· ${displayValue(rec.value)}` : ''}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Public-source verified · {sourceLine(rec)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No public-source verified facts were returned for this document-assisted run.</p>
          )}
        </div>
      </PackSection>

      <PackSection title="Unknowns" empty={unknowns.length === 0}>
        <UnknownList items={unknowns} empty="No unknowns flagged." />
      </PackSection>

      <PackSection title="Diligence Blockers" empty={blockers.length === 0}>
        <div className="space-y-2">
          {blockers.map((item, i) => {
            const rec = asRecord(item);
            return (
              <div key={i} className="rounded-md border border-red-500/20 bg-red-500/[0.03] px-3 py-2.5">
                <p className="text-xs font-semibold text-foreground">{displayValue(rec.title ?? `Blocker ${i + 1}`)}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{displayValue(rec.why_it_matters)}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Need: {displayValue(rec.next_document_or_request_needed)}</p>
              </div>
            );
          })}
        </div>
      </PackSection>

      <PackSection title="Next questions" empty={nextQuestions.length === 0}>
        <ol className="space-y-2">
          {nextQuestions.map((question, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span>{displayValue(question)}</span>
            </li>
          ))}
        </ol>
      </PackSection>

      <PackSection title="Documents to request" empty={recommendedDocuments.length === 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {recommendedDocuments.map((document, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border/70 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
              <FileOutput className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              {displayValue(document)}
            </div>
          ))}
        </div>
      </PackSection>

      {(sourceReferences.length > 0 || limitations.length > 0) && (
        <details className="rounded-lg border border-border bg-card/30 px-4 py-3">
          <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Sources and limitations
          </summary>
          <div className="mt-3 space-y-3">
            {sourceReferences.map((source, i) => (
              <p key={i} className="text-xs text-muted-foreground">{displayValue(source)}</p>
            ))}
            {limitations.map((item, i) => (
              <p key={`lim-${i}`} className="text-xs text-muted-foreground">{displayValue(item)}</p>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRunAnother}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
        >
          <RotateCcw className="w-3 h-3" /> Run another
        </button>
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Open Deal Cockpit
        </Link>
      </div>
    </div>
  );
}

// ─── Step 3: Full result ──────────────────────────────────────────────────────

function Step3({ result, buyerThesis, onRunAnother, saveSource }: {
  result: AnalysisResult;
  buyerThesis: string;
  onRunAnother: () => void;
  saveSource?: 'backend' | 'local';
}) {
  const { openGate } = useAccess();
  const hasBuyerThesis = buyerThesis.trim().length > 0;
  const rawResult = result as unknown as Record<string, unknown>;
  const analysisQuality = asRecord(rawResult.analysis_quality);
  const runLog = asArray(rawResult.run_log);
  const innovationSignals = asRecord(rawResult.innovation_operating_signals);
  const companySnapshot = asRecord(rawResult.company_snapshot);
  const publicPositioning = asRecord(rawResult.public_positioning);
  const publicSignals = asArray(rawResult.public_signals);
  const financialSignals = asRecord(rawResult.financial_signals);
  const structuredUnknowns = asArray(rawResult.structured_unknowns);
  const actionableBlockers = asArray(rawResult.actionable_diligence_blockers).length > 0
    ? asArray(rawResult.actionable_diligence_blockers)
    : asArray(rawResult.diligence_blockers);
  const nextQuestionsRaw = asArray(rawResult.next_questions);
  const recommendedDocumentsRaw = asArray(rawResult.recommended_documents);
  const nextQuestions = nextQuestionsRaw.length > 0 ? nextQuestionsRaw : DEFAULT_NEXT_DILIGENCE_QUESTIONS;
  const recommendedDocuments = recommendedDocumentsRaw.length > 0 ? recommendedDocumentsRaw : DEFAULT_DOCUMENTS_TO_REQUEST;
  const readinessSummary = asRecord(rawResult.acquisition_readiness_summary);
  const isSampleFallback = result.__sample_fallback === true || result.fallback_used === true;

  // Hero metric cards — key acquisition signals for committee triage.
  const topCards = [
    { label: 'Recommendation',     value: result.recommendation,      level: result.recommendation_level },
    { label: 'IC readiness',        value: result.ic_readiness,        level: result.ic_readiness === 'Not ready' ? 'red' : result.ic_readiness === 'Ready' ? 'green' : 'amber' },
    { label: 'Evidence confidence', value: result.evidence_confidence, level: result.evidence_confidence === 'High' ? 'green' : result.evidence_confidence === 'Low' ? 'red' : 'amber' },
    { label: 'AI replica risk',     value: result.ai_replica_risk,     level: result.ai_replica_risk === 'High' ? 'red' : result.ai_replica_risk.startsWith('Low') ? 'green' : 'amber' },
  ] as const;

  const sf = result.strategic_fit;
  const ai = result.ai_disruption;

  // Evidence card groups — evidence-first layout
  // Three-gate model: safeEvidenceStatus(status, source, confidence) — all three must pass for 'verified'
  const verifiedCards = result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'verified');
  const claimCards    = result.evidence_cards.filter(c => { const s = safeEvidenceStatus(c.status, c.source, c.confidence); return s === 'claim' || s === 'caveat'; });
  const unknownCards  = result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'unknown');
  const blockerCards  = result.evidence_cards.filter(c => safeEvidenceStatus(c.status, c.source, c.confidence) === 'blocking');
  const primaryBlocker = actionableBlockers.find(item => /revenue quality/i.test(blockerTitle(item)))
    ?? actionableBlockers[0]
    ?? blockerCards[0]
    ?? null;
  const primaryBlockerText = primaryBlocker
    ? `${blockerTitle(primaryBlocker)}${blockerSummary(primaryBlocker) ? ` - ${blockerSummary(primaryBlocker)}` : ''}`
    : 'No blocker identified from public sources';
  const icNotReady    = !['Ready', 'IC-ready'].includes(result.ic_readiness);

  // IC gaps — derive from evidence cards; fall back to canonical gaps
  const icGaps: string[] = (
    blockerCards.length > 0 || unknownCards.length > 0
      ? [
          ...actionableBlockers.map(blockerTitle).filter(Boolean).slice(0, 3),
          ...blockerCards.map(c => c.field).slice(0, 3),
          ...unknownCards.map(c => `${c.field} not yet evidenced`).slice(0, 2),
        ]
      : ['Revenue split not verified', 'Retention rate not sourced', 'Customer concentration unknown', 'Financials not independently sourced']
  ).slice(0, 5);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">

      {/* Fallback notice */}
      {isSampleFallback && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
          Example screen only. Run a target from the form for a live acquisition screen.
        </div>
      )}

      {/* Saved to Cockpit notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>
          {saveSource === 'backend'
            ? 'Saved to Cockpit'
            : 'Saved locally · create an account to sync across devices'}
        </span>
        <Link href="/cockpit" className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
          Open Cockpit →
        </Link>
      </div>

      {/* ─── Hero: acquisition screen verdict ─────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-primary">Evidence-first acquisition screen · {resultModeLabel(result.data_mode)}</p>
          <span className="text-xs text-muted-foreground">{result.company}</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topCards.map(card => (
            <div key={card.label} className="rounded-md border border-border/70 bg-background/45 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">{card.label}</p>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
                levelClass(card.level),
              )}>
                {card.value}
              </span>
            </div>
          ))}
          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2.5">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Main blocker</p>
            <p className={cn('text-xs leading-snug', primaryBlocker ? 'text-foreground' : 'text-muted-foreground')}>
              {primaryBlockerText}
            </p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] font-medium text-primary mb-1">Next action</p>
            <p className="text-xs text-foreground leading-snug">{result.next_action}</p>
          </div>
        </div>
      </div>

      {Object.keys(readinessSummary).length > 0 && (
        <PackSection title="Executive acquisition screen">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['What we found', asArray(readinessSummary.what_we_found)],
              ['What looks interesting', asArray(readinessSummary.what_looks_interesting)],
              ['What blocks IC', asArray(readinessSummary.not_yet_ic_ready)],
              ['What would change the recommendation', asArray(readinessSummary.what_would_change_the_recommendation)],
            ].map(([title, values]) => (
              <div key={title as string}>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">{title as string}</p>
                <ul className="space-y-1.5">
                  {(values as unknown[]).slice(0, 4).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                      {displayValue(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Recommended next action</p>
            <p className="text-xs text-foreground leading-snug">{displayValue(readinessSummary.recommended_next_action, result.next_action)}</p>
          </div>
        </PackSection>
      )}

      {Object.keys(companySnapshot).length > 0 && (
        <PackSection title="Company Snapshot">
          <SnapshotGrid snapshot={companySnapshot} />
        </PackSection>
      )}

      {Object.keys(publicPositioning).length > 0 && (
        <PackSection title="Public Positioning">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PositioningList
              title="What the company says it does"
              items={asArray(publicPositioning.what_the_company_says_it_does)}
              empty="Not found in public-source preview. Check company website and product pages."
            />
            <PositioningList
              title="Core products"
              items={asArray(publicPositioning.core_products)}
              empty="Core products not clearly found in public-source preview."
            />
            <PositioningList
              title="Target customers"
              items={asArray(publicPositioning.target_customers)}
              empty="Target customers not clearly found in public-source preview."
            />
            <PositioningList
              title="Mission-critical / AI / automation claims"
              items={[
                ...asArray(publicPositioning.mission_critical_claims),
                ...asArray(publicPositioning.ai_or_automation_claims),
              ]}
              empty="Mission-critical or AI claims not found in public-source preview."
            />
          </div>
        </PackSection>
      )}

      <PackSection
        title="Public Signals"
        empty={publicSignals.length === 0}
        emptyMessage="Limited public operating signals found. Run document-assisted review or request job-posting/product/news checks during pilot setup."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {publicSignals.map((item, i) => {
            const signal = asRecord(item);
            const source = sourceLine(signal);
            return (
              <div key={i} className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-foreground">{displayValue(signal.signal ?? `Signal ${i + 1}`)}</p>
                  <StatusPill label={formatLabel(textValue(signal.classification, 'signal'))} />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{displayValue(signal.summary, 'Not found in public-source preview.')}</p>
                {source && <p className="text-[10px] text-muted-foreground/50 mt-1">Source: {source}</p>}
              </div>
            );
          })}
        </div>
      </PackSection>

      {Object.keys(financialSignals).length > 0 && (
        <PackSection title="Financial Evidence">
          <div className="space-y-4">
            <PositioningList
              title="Verified financials"
              items={asArray(financialSignals.verified_financials)}
              empty="No financial metric was verified from a concrete public source in this run."
            />
            <PositioningList
              title="Unverified financial signals"
              items={asArray(financialSignals.unverified_financial_signals)}
              empty="No weak financial signals were retained."
            />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Missing financials</p>
              <ul className="space-y-1.5">
                {asArray(financialSignals.missing_financials).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    {displayValue(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PackSection>
      )}

      <PackSection title="Next questions" empty={nextQuestions.length === 0}>
        <ol className="space-y-2">
          {nextQuestions.slice(0, 12).map((question, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{displayValue(question)}</span>
            </li>
          ))}
        </ol>
      </PackSection>

      <PackSection title="Documents to request" empty={recommendedDocuments.length === 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {recommendedDocuments.map((document, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border/70 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
              <FileOutput className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              {displayValue(document)}
            </div>
          ))}
        </div>
      </PackSection>

      {(Object.keys(analysisQuality).length > 0 || runLog.length > 0) && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Evidence coverage</p>
          </div>
          <div className="p-4 space-y-4">
            {Object.keys(analysisQuality).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CoverageList
                  title="Sources checked"
                  items={asArray(analysisQuality.source_checks_attempted)}
                  status="checked"
                  empty="Submitted website and public-source screen checked where available."
                />
                <CoverageList
                  title="Sources not checked in this preview"
                  items={asArray(analysisQuality.source_checks_not_attempted)}
                  status="not_checked"
                  empty="No additional skipped sources were reported."
                />
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Confidence basis</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Evidence coverage and source quality, not speed.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Preview limitation</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Public-source preview does not replace management accounts, ARR bridge, retention, churn or customer concentration diligence.
                  </p>
                </div>
              </div>
            )}
            {runLog.length > 0 && (
              <details className="rounded-md border border-border/70 bg-card/30 px-3 py-2.5">
                <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                  Technical details
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.keys(analysisQuality).length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(analysisQuality).slice(0, 6).map(([key, value]) => (
                        <p key={key} className="text-xs text-muted-foreground">
                          <span className="text-foreground">{formatLabel(key)}:</span> {displayValue(value)}
                        </p>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {runLog.slice(-4).map((entry, i) => {
                      const rec = asRecord(entry);
                      const message = textValue(rec.message ?? rec.step ?? rec.status ?? entry, '');
                      return message ? (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {message}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* ─── 1. What is verified ──────────────────────────────────────── */}
      {verifiedCards.length > 0 && (
        <div className="rounded-lg border border-green-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-green-500/20 bg-green-500/[0.03] flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-green-400">
              Verified facts ({verifiedCards.length})
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {verifiedCards.map((card, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{card.field}</span>
                    {card.value && <span className="text-sm text-muted-foreground">{card.value}</span>}
                    <EvidenceChip status={card.status} source={card.source} confidence={card.confidence} />
                  </div>
                  <span className={cn('text-[10px] font-mono shrink-0', confidenceColor(card.confidence))}>
                    {card.confidence.toLowerCase()} confidence
                  </span>
                </div>
                {card.summary && <p className="text-xs text-muted-foreground leading-snug mb-1">{card.summary}</p>}
                {card.source && <p className="text-[10px] text-muted-foreground/50">Source: {card.source}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 2. What is claimed ───────────────────────────────────────── */}
      {claimCards.length > 0 && (
        <div className="rounded-lg border border-blue-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-500/20 bg-blue-500/[0.03] flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
              Company claims ({claimCards.length})
            </p>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Not independently verified</span>
          </div>
          <div className="divide-y divide-border/50">
            {claimCards.map((card, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{card.field}</span>
                    {card.value && <span className="text-sm text-muted-foreground">{card.value}</span>}
                    <EvidenceChip status={card.status} source={card.source} confidence={card.confidence} />
                  </div>
                  <span className={cn('text-[10px] font-mono shrink-0', confidenceColor(card.confidence))}>
                    {card.confidence.toLowerCase()} confidence
                  </span>
                </div>
                {card.summary && <p className="text-xs text-muted-foreground leading-snug mb-1">{card.summary}</p>}
                {card.source && <p className="text-[10px] text-muted-foreground/50">Source: {card.source}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. What is unknown ───────────────────────────────────────── */}
      {unknownCards.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Unknowns ({unknownCards.length})
            </p>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Not available from public sources</span>
          </div>
          <div className="divide-y divide-border">
            {unknownCards.map((card, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-foreground">{card.field}</span>
                  <EvidenceChip status={card.status} source={card.source} confidence={card.confidence} />
                </div>
                {card.summary && <p className="text-xs text-muted-foreground leading-snug">{card.summary}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. Why this matters for IC ───────────────────────────────── */}
      <div className={cn(
        'rounded-lg border overflow-hidden',
        icNotReady ? 'border-amber-500/20' : 'border-green-500/20',
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center gap-2',
          icNotReady ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-green-500/20 bg-green-500/[0.03]',
        )}>
          {icNotReady
            ? <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          }
          <p className={cn('text-[10px] font-mono uppercase tracking-widest', icNotReady ? 'text-amber-400' : 'text-green-400')}>
            {icNotReady ? 'Diligence blockers to resolve' : 'IC readiness'}
          </p>
        </div>
        <div className="p-4">
          {icNotReady ? (
            <>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Before this target can proceed to IC, the following gaps need to be resolved through document-assisted diligence or direct management engagement.
              </p>
              <ul className="space-y-2 mb-4">
                {icGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                    {gap}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openGate('full-screen')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 rounded-md transition-colors"
                >
                  Request financials
                </button>
                <Link href="/cockpit" className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                  Save to Cockpit
                </Link>
              </div>
            </>
          ) : (
            <p className="text-xs text-green-400/80 leading-relaxed">
              Evidence gathered supports progression to IC preparation. Document-assisted diligence recommended to verify all claims before committee.
            </p>
          )}
        </div>
      </div>

      {/* ─── 5. Diligence blockers ────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Diligence blockers</p>
          {blockerCards.length > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border bg-red-500/10 text-red-400 border-red-500/20">
              {blockerCards.length} blocking
            </span>
          )}
        </div>
        {blockerCards.length === 0 ? (
          <div className="px-4 py-4 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70 shrink-0" />
            No blocking gaps identified from public sources.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {blockerCards.map((card, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{card.field}</span>
                    <EvidenceChip status={card.status} source={card.source} confidence={card.confidence} />
                  </div>
                  <span className={cn('text-[10px] font-mono shrink-0', confidenceColor(card.confidence))}>
                    {card.confidence.toLowerCase()} confidence
                  </span>
                </div>
                {card.summary && <p className="text-xs text-muted-foreground leading-snug mb-1">{card.summary}</p>}
                {card.source && <p className="text-[10px] text-muted-foreground/50">Source: {card.source}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 6. AI defensibility ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">AI defensibility</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Replica risk',           value: ai.replica_risk,          level: ai.replica_risk_level },
              { label: 'Moat evidence',           value: ai.moat_evidence,         level: ai.moat_evidence === 'None identified' || ai.moat_evidence.startsWith('None') ? 'red' : ai.moat_evidence.startsWith('Partial') ? 'amber' : 'grey' as Level },
              { label: 'Inference economics',     value: ai.inference_economics,   level: 'grey' as Level },
              { label: 'Product expansion',       value: ai.product_expansion,     level: ai.product_expansion.startsWith('Possible') ? 'blue' : ai.product_expansion.startsWith('Unlikely') ? 'red' : 'grey' as Level },
              { label: 'OPEX improvement',        value: ai.opex_improvement,      level: ai.opex_improvement.startsWith('Limited') ? 'amber' : 'grey' as Level },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{row.label}</p>
                <p className="text-xs text-foreground leading-snug">{row.value}</p>
              </div>
            ))}
          </div>

          {ai.diligence_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">AI diligence questions</p>
              <ol className="space-y-1.5">
                {ai.diligence_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={() => openGate('full-screen')}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 rounded py-2 transition-colors"
          >
            <LockIcon className="w-3 h-3" />
            Unlock AI thesis detail, inference cost benchmark and scenario modelling
          </button>
        </div>
      </div>

      {/* ─── 7. Strategic fit ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Strategic fit</p>
        </div>
        <div className="p-4 space-y-4">
          {!hasBuyerThesis && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-amber-500/8 border border-amber-500/20 text-amber-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Strategic fit is generic. Add a buyer thesis for a stronger fit screen.
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fit score:</span>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border',
              levelClass(result.strategic_fit_label.startsWith('Core') ? 'green' : result.strategic_fit_label.startsWith('Non') ? 'red' : 'blue'),
            )}>
              {sf.score}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sf.why_fits.length > 0 && sf.why_fits[0] !== 'Add a buyer thesis to generate specific fit analysis.' && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-green-400 mb-2">Why it fits</p>
                <ul className="space-y-1.5">
                  {sf.why_fits.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500/60 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sf.why_not.length > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-red-400 mb-2">Why it may not fit</p>
                <ul className="space-y-1.5">
                  {sf.why_not.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="w-3 h-3 text-red-500/60 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {sf.assumptions.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Key assumptions</p>
              <ul className="space-y-1">
                {sf.assumptions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sf.risks.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-2">Risks</p>
              <ul className="space-y-1">
                {sf.risks.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sf.diligence_questions.length > 0 && sf.diligence_questions[0] !== 'Add a buyer thesis to generate targeted diligence questions.' && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Diligence questions</p>
              <ol className="space-y-1.5">
                {sf.diligence_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={() => openGate('full-screen')}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 rounded py-2 transition-colors"
          >
            <LockIcon className="w-3 h-3" />
            Unlock buyer-specific fit, platform alignment and integration considerations
          </button>
        </div>
      </div>

      {/* ─── D. Innovation & operating signals ──────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Pilot access · Innovation signals</p>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground whitespace-nowrap">
            {textValue(innovationSignals.status, '') === 'not_checked'
              ? 'Roadmap · Not checked'
              : textValue(innovationSignals.status, 'Roadmap · Pilot access')}
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-foreground mb-1 leading-relaxed">
            Innovation and operating signals are not checked in this public preview.
          </p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Pilot access can include job postings, technology signals, traffic signals and product-launch cadence.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {[
              'Job postings',
              'Technology / stack signals',
              'Traffic / market attention signals',
              'Product launch cadence',
            ].map(signal => (
              <div key={signal} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                <span className="text-[11px] text-muted-foreground/60">{signal}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-mono text-muted-foreground/50">Not checked in this public preview.</span>
            <Link
              href="/request-pilot"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={() => console.log('[analytics] clicked_request_beta_innovation_sample')}
            >
              Request pilot access <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── D. Locked premium sections ──────────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Available with pilot access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LockedFeature
            title="Document-assisted review"
            description="Verify claims against CIMs, buyer decks and management accounts. Flag conflicts and reconcile with official filings."
          />
          <LockedFeature
            title="Full evidence trail"
            description="Every evidence item, source ranking, confidence score and conflict flag. Exportable as a structured register."
          />
          <LockedFeature
            title="Save to Deal Cockpit"
            description="Track this target in your pipeline, record IC decisions, set status and monitor progress across the team."
          />
          <LockedFeature
            title="Target comparison history"
            description="Compare this screen against others in your pipeline: ranked by fit, evidence quality and AI risk."
          />
          <LockedFeature
            title="PowerPoint IC pack"
            description="A ready-to-present IC deck: recommendation, evidence summary, AI risk and diligence plan, formatted for committee."
          />
          <LockedFeature
            title="Excel diligence tracker"
            description="Full diligence checklist mapped to evidence gaps, with owner fields and status tracking built in."
          />
          <LockedFeature
            title="Full IC memo (PDF)"
            description="Complete acquisition memo as PDF: financials, evidence register, AI assessment and next-step actions."
          />
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-5">
        <p className="text-sm font-semibold text-foreground mb-1">Unlock the full acquisition screen.</p>
        <p className="text-xs text-muted-foreground mb-4">
          Pilot access unlocks the full evidence trail, document-assisted analysis, AI disruption detail, buyer fit, IC pack exports and saved pipeline runs.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => openGate('full-screen')}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors"
          >
            Request pilot access <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_result_bottom')}
          >
            Book a 30-minute intro
          </a>
        </div>
      </div>

      {/* Secondary links */}
      <div className="flex flex-wrap gap-2 pb-4">
        <button
          onClick={onRunAnother}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" /> Run another
        </button>
      </div>
    </div>
  );
}

// ─── Analysis result display ──────────────────────────────────────────────────
//
// Renders the AnalysisResultResponse from GET /analysis/{run_id}/result.
// Maps backend enum strings to UI level colours; renders evidence cards,
// strategic fit, warnings, and disclaimer. Does NOT invent any content.

function readinessLevel(v?: string): Level {
  if (!v) return 'grey';
  const l = v.toLowerCase();
  if (l === 'ready') return 'green';
  if (l.includes('financials')) return 'amber';
  if (l === 'not_ready' || l === 'not ready') return 'red';
  return 'grey';
}

function recommendationToLevel(v?: string): Level {
  if (!v) return 'grey';
  const l = v.toLowerCase();
  if (l.includes('proceed') || l.includes('advance') || l.includes('progress')) return 'green';
  if (l.includes('financials') || l.includes('caution') || l.includes('review')) return 'amber';
  if (l.includes('pass') || l.includes('decline') || l.includes('reject')) return 'red';
  return 'blue';
}

function formatLabel(s?: string | null): string {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function AnalysisResultDisplay({
  result,
  onRunAnother,
}: {
  result: AnalysisResultResponse;
  onRunAnother: () => void;
}) {
  const { openGate } = useAccess();
  const sf = result.strategic_fit as Record<string, unknown> | undefined;
  const cards = result.evidence_cards ?? [];
  const warnings = result.warnings ?? [];
  const events = result.events ?? [];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">

      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-0.5">
            Analysis complete
          </p>
          <h2 className="text-xl font-bold text-foreground">{result.company_name}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{result.website}</p>
        </div>
        {result.demo_mode && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 shrink-0">
            Example screen
          </span>
        )}
      </div>

      {/* ── Key metrics ────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
            Acquisition screen · {result.analysis_mode ? formatLabel(result.analysis_mode) : 'Public-source screen'}
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {result.recommendation && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Recommendation</p>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border',
                levelClass(recommendationToLevel(result.recommendation)),
              )}>
                {result.recommendation}
              </span>
            </div>
          )}
          {result.ic_readiness && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">IC readiness</p>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border',
                levelClass(readinessLevel(result.ic_readiness)),
              )}>
                {formatLabel(result.ic_readiness)}
              </span>
            </div>
          )}
          {result.valuation_readiness && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Valuation readiness</p>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border',
                levelClass(readinessLevel(result.valuation_readiness)),
              )}>
                {formatLabel(result.valuation_readiness)}
              </span>
            </div>
          )}
        </div>
        {result.recommendation_reason && (
          <div className="px-4 py-3 border-t border-border bg-card/30">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Rationale</p>
            <p className="text-xs text-foreground leading-snug">{result.recommendation_reason}</p>
          </div>
        )}
      </div>

      {/* ── Strategic fit ──────────────────────────────────────────── */}
      {sf && Object.keys(sf).length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Strategic fit</p>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(sf).map(([key, val]) => (
              <div key={key}>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
                  {key.replace(/_/g, ' ')}
                </p>
                {Array.isArray(val) ? (
                  <ul className="space-y-1">
                    {(val as unknown[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                        {displayValue(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-foreground">{displayValue(val)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence cards ─────────────────────────────────────────── */}
      {cards.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Evidence</p>
          </div>
          <div className="divide-y divide-border">
            {cards.map((card, i) => {
              const c = card as Record<string, unknown>;
              // Three-gate model: status + source + confidence must all pass for 'verified'
              const safeStatus = safeEvidenceStatus(c.status as string | undefined, c.source as string | undefined, c.confidence as string | undefined);
              const DISPLAY_LABEL: Record<EvidenceStatus, string> = {
                verified: 'Verified',
                caveat:   'Company claim',
                claim:    'Company claim',
                blocking: 'Blocker',
                unknown:  'Not independently verified',
              };
              const conf = displayValue(c.confidence, '');
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {displayValue(c.field ?? c.name ?? `Item ${i + 1}`)}
                      </span>
                      {c.value !== undefined && (
                        <span className="text-sm text-muted-foreground">{displayValue(c.value)}</span>
                      )}
                      {c.status != null && (
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0',
                          evidenceChipClass(safeStatus),
                        )}>
                          {DISPLAY_LABEL[safeStatus]}
                        </span>
                      )}
                    </div>
                    {conf && (
                      <span className={cn('text-[10px] font-mono shrink-0', confidenceColor(conf))}>
                        {conf.toLowerCase()} confidence
                      </span>
                    )}
                  </div>
                  {c.summary != null && (
                    <p className="text-xs text-muted-foreground leading-snug mb-1">{displayValue(c.summary)}</p>
                  )}
                  {c.source != null && (
                    <p className="text-[10px] text-muted-foreground/50">Source: {displayValue(c.source, 'Not verified in this run')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Events timeline (last 5) ───────────────────────────────── */}
      {events.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Review log</p>
          </div>
          <div className="divide-y divide-border">
            {events.slice(-6).map(ev => (
              <div key={ev.event_id} className="px-4 py-2.5 flex items-start gap-3">
                <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-0.5">
                  {ev.status === 'complete' || ev.status === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : ev.status === 'failed' || ev.status === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{ev.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Warnings ───────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-400/80">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Disclaimer ─────────────────────────────────────────────── */}
      {result.disclaimer && (
        <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">
          {result.disclaimer}
        </p>
      )}

      {/* ── From evidence to action ────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">From evidence to action</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {([
            { label: 'Facts',      desc: 'Official filings / registry',        key: 'facts' },
            { label: 'Claims',     desc: 'Website / press / case studies',     key: 'claims' },
            { label: 'Signals',    desc: 'Jobs / traffic / tech / launches',   key: 'signals' },
            { label: 'Inferences', desc: 'Agent conclusions from data',        key: 'inferences' },
            { label: 'Actions',    desc: 'Questions / diligence / next steps', key: 'actions' },
          ] as const).map(col => {
            const field = (result as Record<string, unknown>)[col.key];
            return (
              <div key={col.label} className="px-3 py-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">{col.label}</p>
                <p className="text-[10px] text-muted-foreground/55 mb-2 leading-snug">{col.desc}</p>
                {field != null ? (
                  Array.isArray(field)
                    ? <ul className="space-y-1">{(field as unknown[]).map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-snug flex gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {displayValue(item)}
                        </li>
                      ))}</ul>
                    : <p className="text-xs text-foreground">{displayValue(field)}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/40 italic">Not found in this run</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Investor prep pack ─────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Investor prep pack</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            { label: 'Management questions', key: 'management_questions' },
            { label: 'Documents to request', key: 'documents_to_request' },
            { label: 'Claims to verify',     key: 'claims_to_verify' },
            { label: 'Red flags',            key: 'red_flags' },
            { label: 'Follow-up actions',    key: 'follow_up_actions' },
          ] as const).map(card => {
            const field = (result as Record<string, unknown>)[card.key];
            return (
              <div key={card.label} className="rounded-md border border-border bg-card/30 px-3 py-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{card.label}</p>
                {field != null ? (
                  Array.isArray(field)
                    ? <ul className="space-y-1">{(field as unknown[]).map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-snug flex gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {displayValue(item)}
                        </li>
                      ))}</ul>
                    : <p className="text-xs text-foreground">{displayValue(field)}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/40 italic">Not found in this run</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Innovation & operating signals ──────────────────────── */}
      {(() => {
        const ios = (result as Record<string, unknown>).innovation_operating_signals as Record<string, unknown> | null | undefined;
        const iosStatus = ios?.status as string | undefined;
        const hasLiveData = ios && iosStatus && iosStatus !== 'not_checked';

        if (hasLiveData) {
          // Backend returned actual innovation signal data — render it
          const categories = ios.categories as Record<string, unknown>[] | undefined;
          const summary    = ios.summary as string | undefined;
          return (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Innovation &amp; operating signals</p>
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap',
                  iosStatus === 'checked' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-border bg-muted/30 text-muted-foreground',
                )}>
                  {iosStatus === 'checked' ? 'Checked' : formatLabel(iosStatus)}
                </span>
              </div>
              <div className="px-4 py-4 space-y-3">
                {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
                {categories && categories.length > 0 && (
                  <div className="space-y-2">
                    {categories.map((cat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                        <div>
                          <p className="text-xs text-foreground font-medium">{displayValue(cat.name ?? cat.category ?? `Signal ${i + 1}`)}</p>
                          {cat.finding != null && <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{displayValue(cat.finding)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] font-mono text-muted-foreground/50">Source: Public signals only · Status: Signal, not verified</p>
              </div>
            </div>
          );
        }

        // No live data or status is not_checked — show roadmap card
        return (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Pilot access · Innovation signals</p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground whitespace-nowrap">Roadmap · Pilot access</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-foreground mb-1 leading-relaxed">
                Innovation and operating signals are not checked in this public preview.
              </p>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Pilot access can include job postings, technology signals, traffic signals and product-launch cadence.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {[
                  'Job postings',
                  'Technology / stack signals',
                  'Traffic / market attention signals',
                  'Product launch cadence',
                ].map(signal => (
                  <div key={signal} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                    <span className="text-[11px] text-muted-foreground/60">{signal}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-mono text-muted-foreground/50">Not checked in this public preview.</span>
                <Link
                  href="/request-pilot"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  onClick={() => console.log('[analytics] clicked_request_beta_innovation_signals')}
                >
                  Request pilot access <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Locked premium sections ──────────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Available with pilot access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LockedFeature
            title="Document-assisted review"
            description="Verify claims against CIMs, buyer decks and management accounts. Flag conflicts and reconcile with official filings."
          />
          <LockedFeature
            title="Full evidence trail"
            description="Every evidence item, source ranking, confidence score and conflict flag. Exportable as a structured register."
          />
          <LockedFeature
            title="Save to Deal Cockpit"
            description="Track this target in your pipeline, record IC decisions, set status and monitor progress across the team."
          />
          <LockedFeature
            title="Target comparison history"
            description="Compare this screen against others in your pipeline: ranked by fit, evidence quality and AI risk."
          />
          <LockedFeature
            title="PowerPoint IC pack"
            description="A ready-to-present IC deck: recommendation, evidence summary, AI risk and diligence plan, formatted for committee."
          />
          <LockedFeature
            title="Full IC memo (PDF)"
            description="Complete acquisition memo as PDF: financials, evidence register, AI assessment and next-step actions."
          />
        </div>
      </div>

      {/* ── Upgrade CTA ────────────────────────────────────────────── */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-5">
        <p className="text-sm font-semibold text-foreground mb-1">Unlock the full acquisition screen.</p>
        <p className="text-xs text-muted-foreground mb-4">
          Pilot access unlocks the full evidence trail, document-assisted analysis, AI disruption detail, buyer fit, IC pack exports and saved pipeline runs.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => openGate('full-screen')}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors"
          >
            Request pilot access <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_railway_result')}
          >
            Book a 30-minute intro
          </a>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onRunAnother}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" /> Run another
        </button>
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Deal Cockpit
        </Link>
        <a
          href={BOOK_INTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
          onClick={() => console.log('[analytics] clicked_book_intro_result')}
        >
          Book a 30-minute intro <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ─── Live progress pipeline ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'entity_resolver',     label: 'Entity match',        explainer: 'Matching the company website to the most likely legal entity.' },
  { key: 'website_collector',   label: 'Public-source review', explainer: 'Reviewing public-facing claims and product descriptions from the company website.' },
  { key: 'registry_connector',  label: 'Registry checks',      explainer: 'Checking official filings and registry records.' },
  { key: 'evidence_ranker',     label: 'Evidence ranking',     explainer: 'Separating verified facts from claims and assumptions.' },
  { key: 'financial_extractor', label: 'Financial evidence',   explainer: 'Locating and verifying revenue, growth, and unit economics signals.' },
  { key: 'ai_risk_assessor',    label: 'AI replica risk',      explainer: 'Testing whether the workflow could be replicated or disrupted by AI.' },
  { key: 'strategic_fit',       label: 'Strategic fit',        explainer: 'Scoring alignment with the buyer thesis and acquisition criteria.' },
  { key: 'ic_readiness',        label: 'IC readiness',         explainer: 'Assessing whether evidence is sufficient for an investment committee presentation.' },
  { key: 'report_writer',       label: 'Acquisition summary',  explainer: 'Compiling all findings into a structured acquisition screen.' },
] as const;

type PipelineStageStatus = 'pending' | 'running' | 'complete' | 'failed';

// ─── localStorage active run ──────────────────────────────────────────────────
const ACTIVE_RUN_KEY = 'frontier_os_active_run';

interface ActiveRunRecord {
  run_id:       string;
  company_name: string;
  website:      string;
  buyer_name:   string;
  started_at:   number;
  status_url:   string;
  result_url:   string;
  mode:         'live_analysis';
}

// ─── Investment lens types ────────────────────────────────────────────────────
type InvestmentStyle = 'strategic_fit' | 'growth' | 'profitability' | 'value_creation' | 'ai_defensibility';
type RiskPosture     = 'balanced' | 'conservative' | 'conviction_led';

/** Maps a backend stage string to a PIPELINE_STAGES index. Returns -1 if unknown. */
function matchPipelineIndex(backendStage: string | null | undefined): number {
  if (!backendStage) return -1;
  const s = backendStage.toLowerCase();
  if (s.includes('entity') || s.includes('resolver')) return 0;
  if (s.includes('website') || s.includes('collector') || s.includes('collection')) return 1;
  if (s.includes('registry') || s.includes('connector') || s.includes('filing')) return 2;
  if (s.includes('evidence') || s.includes('ranker') || s.includes('rank')) return 3;
  if (s.includes('financial') || s.includes('extractor')) return 4;
  if (s.includes('ai') || s.includes('risk') || s.includes('assessor') || s.includes('disruption')) return 5;
  if (s.includes('strategic') || s.includes('fit')) return 6;
  if (s.includes('ic_readiness') || s.includes('ic readiness') || (s.includes('ic') && s.includes('read'))) return 7;
  if (s.includes('report') || s.includes('writer') || s.includes('compil')) return 8;
  return -1;
}

/** Formats elapsed seconds as "Xm Ys" or "Xs". */
function formatElapsed(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ─── Static sample result (sampleMode — no network calls) ────────────────────

const SAMPLE_RESULT: AnalysisResult = {
  status: 'partial',
  data_mode: 'Private beta · example screen',
  company: 'Illustrative Target Co.',
  recommendation: 'Request Financials',
  recommendation_level: 'amber',
  ic_readiness: 'Partial',
  valuation_readiness: 'Financial evidence required',
  strategic_fit_label: 'Adjacent. Further diligence required.',
  evidence_confidence: 'Medium',
  ai_replica_risk: 'Medium-high',
  ai_moat: 'Unproven',
  next_action: 'Request ARR definition, SaaS/services split, customer concentration and AI feature usage data.',
  strategic_fit: {
    score: 'Adjacent',
    why_fits: [
      'UK SME software target — matches PE buy-and-build mandate',
      'Recurring revenue model — Companies House verification required',
    ],
    why_not: [
      'ARR definition absent from official filings',
      'Synergies not independently underwritten',
    ],
    assumptions: ['Revenue bridge from SaaS to ARR requires management clarification'],
    risks: ['AI replica risk medium-high — product defensibility not established'],
    diligence_questions: [
      'Confirm ARR definition and SaaS/services split',
      'Quantify AI feature usage vs core product revenue',
    ],
  },
  evidence_cards: [
    {
      field: 'Revenue', value: 'Not confirmed — example screen only',
      status: 'claim', source: 'Example — illustrative only',
      summary: 'This is an example screen. For real company screens, revenue is extracted from official filings and shown as a claim until independently verified.', confidence: 'Low',
    },
    {
      field: 'ARR', value: 'Claimed — definition absent',
      status: 'caveat', source: 'Company website / investor deck',
      summary: 'ARR stated on company website but SaaS vs services split is not confirmed in official filings.', confidence: 'Medium',
    },
    {
      field: 'AI moat', value: 'Unproven',
      status: 'claim', source: 'Company marketing material',
      summary: 'AI capability claimed but no proprietary dataset or model evidence found in public sources.', confidence: 'Low',
    },
    {
      field: 'Customer concentration', value: 'Unknown',
      status: 'unknown', source: '—',
      summary: 'No data on top customer concentration in available public sources.', confidence: 'Low',
    },
    {
      field: 'Adjusted EBITDA', value: 'Not disclosed',
      status: 'blocking', source: '—',
      summary: 'EBITDA not stated in available public filings. Blocks valuation readiness assessment.', confidence: 'Low',
    },
  ],
  ai_disruption: {
    replica_risk: 'Medium-high — generic AI workflow tooling is replicable by incumbents',
    replica_risk_level: 'amber',
    moat_evidence: 'No proprietary dataset or model identified in public sources',
    inference_economics: 'Unknown — inference cost per workflow unit not disclosed',
    product_expansion: 'AI layer could expand into adjacent workflow verticals if moat is established',
    opex_improvement: 'Process automation potential present but unquantified',
    diligence_questions: [
      'Is the AI layer proprietary or built on commodity APIs?',
      'What is the inference cost per workflow unit?',
      'Has the AI feature set been independently validated?',
    ],
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalysisSetup({ sampleMode = false }: { sampleMode?: boolean }) {
  const initialMode = React.useMemo<ModeCode>(() => {
    if (typeof window === 'undefined') return sampleMode ? DEFAULT_SCENARIO.modeCode : 'url-only';
    const requested = new URLSearchParams(window.location.search).get('mode');
    return requested === 'document' || requested === 'doc-assisted'
      ? 'doc-assisted'
      : sampleMode ? DEFAULT_SCENARIO.modeCode : 'url-only';
  }, [sampleMode]);
  // ── Sample-screen state (used when backend is not configured) ──
  const [step, setStep]         = useState<Step>(1);
  const [scenario, setScenario] = useState<DemoScenario>(DEFAULT_SCENARIO);
  const [stages, setStages]     = useState<RunningStage[]>(
    (sampleMode ? DEFAULT_SCENARIO.analysis_stages : NEUTRAL_STAGES).map(s => ({ ...s, status: 'queued' })),
  );
  const [isTimelineComplete, setIsTimelineComplete] = useState(false);
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [saveSource, setSaveSource] = useState<'backend' | 'local' | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [documentUnavailable, setDocumentUnavailable] = useState<DocumentUnavailableState>(null);
  const [completionMessage, setCompletionMessage] = useState('Analysis complete.');
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [isFinalising, setIsFinalising] = useState(false);
  const [finalisingElapsedSecs, setFinalisingElapsedSecs] = useState(0);

  // Form state
  const [company,      setCompany]      = useState(sampleMode ? DEFAULT_SCENARIO.company : '');
  const [website,      setWebsite]      = useState(sampleMode ? DEFAULT_SCENARIO.website : '');
  const [buyer,        setBuyer]        = useState(sampleMode ? DEFAULT_SCENARIO.buyer : '');
  const [buyerThesis,  setBuyerThesis]  = useState(sampleMode ? DEFAULT_SCENARIO.buyer_thesis : '');
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>(sampleMode ? (DEFAULT_SCENARIO.jurisdictionCode as JurisdictionCode) : 'unknown');
  const [mode,         setMode]         = useState<ModeCode>(initialMode);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentTypeCode>('pitch_deck');
  const [confidentialityAcknowledged, setConfidentialityAcknowledged] = useState(false);
  const [documentAssistedResult, setDocumentAssistedResult] = useState<DocumentAssistedResult | null>(null);

  // ── Railway backend state (optional async backend — primary path uses POST /api/analyse/url) ──
  const backendConfigured = isBackendConfigured();
  const [railwayPhase, setRailwayPhase] = useState<RailwayPhase>({ kind: 'idle' });
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSecs, setElapsedSecs]       = useState(0);

  useEffect(() => {
    if (!isFinalising) {
      setFinalisingElapsedSecs(0);
      return;
    }
    const startedAt = Date.now();
    setFinalisingElapsedSecs(0);
    const timer = window.setInterval(() => {
      setFinalisingElapsedSecs(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isFinalising]);
  const [completionSecs, setCompletionSecs] = useState<number | null>(null);
  const [investmentStyle, setInvestmentStyle] = useState<InvestmentStyle>('strategic_fit');
  const [riskPosture, setRiskPosture]         = useState<RiskPosture>('balanced');
  const [resumedRun, setResumedRun]           = useState(false);

  // Elapsed timer — ticks every second while the backend is running
  useEffect(() => {
    const active = (
      railwayPhase.kind === 'submitting' ||
      railwayPhase.kind === 'polling' ||
      railwayPhase.kind === 'fetching_result'
    );
    if (!active) return;
    const id = setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedSecs(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [railwayPhase.kind]);

  // On mount: check localStorage for an active live-analysis run and resume polling
  useEffect(() => {
    if (sampleMode || !backendConfigured) return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(ACTIVE_RUN_KEY); } catch { return; }
    if (!raw) return;
    try {
      const rec = JSON.parse(raw) as ActiveRunRecord;
      if (!rec.run_id || rec.mode !== 'live_analysis') return;
      setCompany(rec.company_name);
      setWebsite(rec.website);
      setResumedRun(true);
      startedAtRef.current = rec.started_at;
      setElapsedSecs(Math.floor((Date.now() - rec.started_at) / 1000));
      setCompletionSecs(null);
      setRailwayPhase({ kind: 'polling', runId: rec.run_id, statusData: { run_id: rec.run_id, status: 'running' } });
      const token = { cancelled: false };
      cancelRef.current = token;
      doPollLoop(rec.run_id, token); // eslint-disable-line @typescript-eslint/no-use-before-define
    } catch { /* malformed record */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sample mode: auto-start the animation on mount — no network calls whatsoever
  useEffect(() => {
    if (!sampleMode) return;
    let cancelled = false;
    async function run() {
      const fresh: RunningStage[] = DEFAULT_SCENARIO.analysis_stages.map(
        s => ({ ...s, status: 'queued' as StageStatus }),
      );
      if (cancelled) return;
      setStages(fresh);
      setIsTimelineComplete(false);
      setResult(null);
      setStep(2);
      const updated = [...fresh];
      for (let i = 0; i < updated.length; i++) {
        if (cancelled) return;
        updated[i] = { ...updated[i], status: 'running' };
        setStages([...updated]);
        await new Promise<void>(r => setTimeout(r, updated[i].durationMs));
        if (cancelled) return;
        updated[i] = { ...updated[i], status: 'complete' };
        setStages([...updated]);
      }
      if (cancelled) return;
      setResult(SAMPLE_RESULT);
      setIsTimelineComplete(true);
    }
    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────

  function handleScenarioSelect(s: DemoScenario) {
    setScenario(s);
    setCompany(s.company);
    setWebsite(s.website);
    setBuyer(s.buyer);
    setBuyerThesis(s.buyer_thesis);
    setJurisdiction(s.jurisdictionCode as JurisdictionCode);
    setMode(s.modeCode);
    setDocumentFile(null);
    setConfidentialityAcknowledged(false);
    setStages(s.analysis_stages.map(st => ({ ...st, status: 'queued' })));
    setIsTimelineComplete(false);
    setResult(null);
    setDocumentAssistedResult(null);
    setDocumentUnavailable(null);
    setAnalysisError(null);
    setCompletionMessage('Analysis complete.');
    setAnalysisInFlight(false);
    setIsFinalising(false);
    setFinalisingElapsedSecs(0);
    cancelRef.current.cancelled = true;
    setRailwayPhase({ kind: 'idle' });
  }

  // ── localStorage helpers ──────────────────────────────────────
  function clearActiveRun() {
    try { localStorage.removeItem(ACTIVE_RUN_KEY); } catch { /* ignore */ }
  }

  /**
   * Shared polling loop — used by both handleRailwaySubmit and mount-resume.
   * MAX 120 × 3 s = 6 min.
   */
  async function doPollLoop(runId: string, token: { cancelled: boolean }) {
    const MAX_POLLS = 120;
    for (let i = 0; i < MAX_POLLS; i++) {
      if (i > 0) await new Promise<void>(r => setTimeout(r, 3000));
      if (token.cancelled) return;

      const statusOutcome = await pollStatus(runId);
      if (token.cancelled) return;

      if (!statusOutcome.ok) {
        clearActiveRun();
        setRailwayPhase({ kind: 'error', message: statusOutcome.error, runId });
        return;
      }

      const s = statusOutcome.data;
      setRailwayPhase({ kind: 'polling', runId, statusData: s });

      if (['completed', 'complete', 'succeeded', 'done'].includes(s.status)) {
        setRailwayPhase({ kind: 'fetching_result', runId });
        const resultOutcome = await fetchResult(runId);
        if (token.cancelled) return;
        clearActiveRun();

        if (!resultOutcome.ok) {
          setRailwayPhase({ kind: 'error', message: resultOutcome.error, runId });
        } else {
          if (startedAtRef.current !== null) {
            setCompletionSecs(Math.floor((Date.now() - startedAtRef.current) / 1000));
          }
          setRailwayPhase({ kind: 'success', result: resultOutcome.data });
        }
        return;
      }

      if (s.status === 'failed') {
        clearActiveRun();
        setRailwayPhase({
          kind: 'error',
          message: s.error ?? 'Analysis failed on the backend.',
          runId,
        });
        return;
      }
    }

    if (!token.cancelled) {
      clearActiveRun();
      setRailwayPhase({ kind: 'error', message: 'Analysis timed out after 6 minutes.', runId });
    }
  }

  function resetRailway() {
    cancelRef.current.cancelled = true;
    clearActiveRun();
    setResumedRun(false);
    setRailwayPhase({ kind: 'idle' });
  }

  /**
   * Railway backend path:
   *   1. POST /analysis      → run_id  (saved to localStorage)
   *   2. GET  /analysis/{run_id}/status  (poll every 3 s via doPollLoop)
   *   3. GET  /analysis/{run_id}/result  when completed
   */
  async function handleRailwaySubmit() {
    const companyTrimmed = company.trim();
    const websiteTrimmed = website.trim();
    if (!companyTrimmed || !websiteTrimmed) return;

    const token = { cancelled: false };
    cancelRef.current = token;

    // ── Step 1: start ──────────────────────────────────────────
    startedAtRef.current = Date.now();
    setElapsedSecs(0);
    setCompletionSecs(null);
    setResumedRun(false);
    setRailwayPhase({ kind: 'submitting' });

    const req: AnalysisRequest = {
      company_name:   companyTrimmed,
      website:        websiteTrimmed,
      buyer_name:     buyer.trim() || 'Robin',
      buyer_website:  '',
      fit_mode:       'auto',
      analysis_depth: 'ic_draft',
      document_paths: [],
      demo_mode:      sampleMode,
      use_cache:      true,
    };

    const startOutcome: StartAnalysisOutcome = await startAnalysis(req);
    if (token.cancelled) return;

    if (!startOutcome.ok) {
      setRailwayPhase({
        kind: 'error',
        message: 'unconfigured' in startOutcome
          ? 'Backend API is not configured yet.'
          : startOutcome.error,
      });
      return;
    }

    const { run_id, status_url, result_url } = startOutcome.data;

    // Persist to localStorage so a page refresh can resume this run
    try {
      const record: ActiveRunRecord = {
        run_id, company_name: companyTrimmed, website: websiteTrimmed,
        buyer_name: buyer.trim() || 'Robin',
        started_at: startedAtRef.current ?? Date.now(),
        status_url, result_url, mode: 'live_analysis',
      };
      localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(record));
    } catch { /* storage quota */ }

    // ── Step 2 & 3: poll + fetch ───────────────────────────────
    await doPollLoop(run_id, token);
  }

  /** Real URL-analysis path: calls POST /api/analyse/url and never substitutes sample data. */
  async function runUrlAnalysisForForm() {
    if (analysisInFlight) return;
    setAnalysisInFlight(true);
    setIsFinalising(false);
    setFinalisingElapsedSecs(0);
    try {
      // Provision backend workspace on first run (no-op if already done; silent on failure)
      await createBackendAccount(buyer, buyerThesis).catch(() => null);
      const workspaceId = getWorkspaceId();
      const userId = getUserId();
      const normalizedWebsite = normaliseUrl(website);
      let apiSettled = false;
      const apiPromise = runUrlAnalysis({
        company_name: company.trim(),
        website: normalizedWebsite,
        buyer_name: buyer.trim() || undefined,
        buyer_thesis: buyerThesis,
        jurisdiction,
        ...(workspaceId && userId
          ? { workspace_id: workspaceId, user_id: userId, save_to_cockpit: true }
          : {}),
      }).finally(() => {
        apiSettled = true;
      });

      // Always use neutral stages for real URL submissions — never scenario-specific
      // copy that contains fictional company names or hardcoded financial figures.
      const fresh: RunningStage[] = NEUTRAL_STAGES.map(s => ({ ...s, status: 'queued' as StageStatus }));
	      setStages(fresh);
	      setIsTimelineComplete(false);
	      setResult(null);
	      setDocumentAssistedResult(null);
	      setDocumentUnavailable(null);
	      setAnalysisError(null);
	      setCompletionMessage('Analysis complete.');
      setStep(2);

      const updated = [...fresh];
      for (let i = 0; i < updated.length; i++) {
        updated[i] = { ...updated[i], status: 'running' };
        setStages([...updated]);
        const outcome = await Promise.race([
          new Promise<'stage'>(r => setTimeout(() => r('stage'), updated[i].durationMs)),
          apiPromise.then(() => 'api' as const),
        ]);
        updated[i] = { ...updated[i], status: 'complete' };
        setStages([...updated]);
        if (outcome === 'api') break;
      }

      if (!apiSettled) {
        setIsFinalising(true);
      }
      const apiResult = await apiPromise;
      if (!hasUsableAnalysisPayload(apiResult)) {
        throw new Error(analysisPayloadError(apiResult));
      }
      const merged = normalizeUrlAnalysisResult(apiResult, company.trim(), normalizedWebsite);
      setStages(current => completeStages(current.length > 0 ? current : fresh));
      setAnalysisError(null);
      setDocumentUnavailable(null);
      setCompletionMessage('Analysis complete.');
      setResult(merged);
      // Save to local run history so the Deal Cockpit shows this run
      try { saveUrlRun(merged, normalizedWebsite); } catch { /* storage not available */ }
      // Track whether backend confirmed persistence
      setSaveSource(merged.saved_to_cockpit ? 'backend' : 'local');
      setIsFinalising(false);
      setIsTimelineComplete(true);
    } catch (err) {
      setIsFinalising(false);
      const detail = err instanceof Error ? err.message : 'Backend analysis failed.';
      const message = detail;
      setAnalysisError(message);
      setCompletionMessage('Analysis complete.');
      setResult(null);
      setIsTimelineComplete(false);
    } finally {
      setIsFinalising(false);
      setAnalysisInFlight(false);
    }
  }

  async function runDocumentAssistedForForm(file: File) {
    if (analysisInFlight) return;
    setAnalysisInFlight(true);
    setIsFinalising(false);
    setFinalisingElapsedSecs(0);
    try {
      await createBackendAccount(buyer, buyerThesis).catch(() => null);
      const workspaceId = getWorkspaceId();
      const userId = getUserId();
      const normalizedWebsite = normaliseUrl(website);
      let apiSettled = false;
      const apiPromise = runDocumentAssistedAnalysis({
        company_name: company.trim(),
        company_url: normalizedWebsite,
        buyer_thesis: buyerThesis,
        document_type: documentType,
        confidentiality_acknowledged: confidentialityAcknowledged,
        file,
        ...(workspaceId && userId
          ? { workspace_id: workspaceId, user_id: userId, save_to_cockpit: true }
          : {}),
      }).finally(() => {
        apiSettled = true;
      });

      const fresh: RunningStage[] = DOCUMENT_ASSISTED_STAGES.map(s => ({ ...s, status: 'queued' as StageStatus }));
      setStages(fresh);
      setIsTimelineComplete(false);
      setResult(null);
      setDocumentAssistedResult(null);
      setDocumentUnavailable(null);
      setAnalysisError(null);
      setCompletionMessage('Analysis complete.');
      setStep(2);

      const updated = [...fresh];
      for (let i = 0; i < updated.length; i++) {
        updated[i] = { ...updated[i], status: 'running' };
        setStages([...updated]);
        const outcome = await Promise.race([
          new Promise<'stage'>(r => setTimeout(() => r('stage'), updated[i].durationMs)),
          apiPromise.then(() => 'api' as const),
        ]);
        updated[i] = { ...updated[i], status: 'complete' };
        setStages([...updated]);
        if (outcome === 'api') break;
      }

      if (!apiSettled) setIsFinalising(true);
      const apiResult = await apiPromise;
      if (isDocumentUnavailablePayload(apiResult)) {
        setIsFinalising(false);
        setStages(current => {
          const base = current.length > 0 ? current : fresh;
          return base.map((stage, index) => ({
            ...stage,
            status: index === 0 ? 'complete' as StageStatus : 'queued' as StageStatus,
          }));
        });
        setAnalysisError(null);
        setCompletionMessage('Document-assisted review is not enabled in this workspace yet.');
        setDocumentAssistedResult(null);
        setResult(null);
        setSaveSource(null);
        setIsTimelineComplete(false);
        setDocumentUnavailable({
          title: 'Document-assisted review is not enabled in this workspace yet.',
          message: 'Use website-only preview, or request pilot access.',
          reason: textValue(apiResult.reason ?? apiResult.error_code, 'document_uploads_disabled'),
        });
        return;
      }
      if (apiResult.status === 'error') {
        throw new Error(analysisPayloadError(apiResult, 'Document-assisted analysis failed.'));
      }
      if (!hasUsableDocumentAssistedPayload(apiResult)) {
        throw new Error(analysisPayloadError(apiResult, 'Document-assisted analysis did not return a usable result.'));
      }
      setStages(current => completeStages(current.length > 0 ? current : fresh));
      setAnalysisError(null);
      setDocumentUnavailable(null);
      setCompletionMessage('Analysis complete.');
      setDocumentAssistedResult(apiResult);

      if (apiResult.status === 'ok') {
        const summary = asRecord(apiResult.document_summary);
        const financialClaims = asArray(apiResult.financial_claims).map(item => displayValue(item, '')).filter(Boolean).slice(0, 3);
        const unknowns = asArray(apiResult.unknowns).map(item => displayValue(item, '')).filter(Boolean).slice(0, 4);
        const blockers = asArray(apiResult.diligence_blockers).map(item => {
          const rec = asRecord(item);
          return textValue(rec.title ?? rec.blocker ?? item, '');
        }).filter(Boolean);
        try {
          saveDocumentRun({
            documentName: file.name,
            companyName: apiResult.company_name || company.trim(),
            website: apiResult.website || normalizedWebsite,
            documentType,
            confidentiality_flag: Boolean(summary.confidentiality_flag),
            claims_count: asArray(apiResult.extracted_claims).length,
            metrics_count: financialClaims.length,
            topFinancialClaims: financialClaims,
            keyUnknowns: unknowns,
            blockers,
            evidenceConfidence: apiResult.evidence_confidence || 'Claim, not verified',
            next_action: apiResult.next_action || 'Request source documents needed to verify claims before IC.',
          });
        } catch { /* storage not available */ }
        setSaveSource(apiResult.saved_to_cockpit ? 'backend' : 'local');
      } else {
        setSaveSource(null);
      }
      setIsFinalising(false);
      setIsTimelineComplete(true);
    } catch (err) {
      setIsFinalising(false);
      setAnalysisError(err instanceof Error ? err.message : 'Document-assisted analysis failed.');
      setCompletionMessage('Analysis complete.');
      setResult(null);
      setDocumentAssistedResult(null);
      setIsTimelineComplete(false);
    } finally {
      setIsFinalising(false);
      setAnalysisInFlight(false);
    }
  }

  function handleSubmit() {
    // Always use the configured Frontier OS API base URL for public preview runs.
    // The Railway async backend (handleRailwaySubmit) is a separate optional flow
    // activated only via the localStorage resume on mount.
    if (mode === 'doc-assisted') {
      if (!documentFile) {
        setAnalysisError('Upload a PDF to run a document-assisted screen.');
        setDocumentUnavailable(null);
        setDocumentAssistedResult(null);
        setResult(null);
        setAnalysisInFlight(false);
        setIsFinalising(false);
        return;
      }
      runDocumentAssistedForForm(documentFile);
      return;
    }
    runUrlAnalysisForForm();
  }

  function switchToWebsiteOnlyFromUnavailable() {
    setMode('url-only');
    setDocumentFile(null);
    setConfidentialityAcknowledged(false);
    setDocumentAssistedResult(null);
    setDocumentUnavailable(null);
    setAnalysisError(null);
    setAnalysisInFlight(false);
    setIsTimelineComplete(false);
    setIsFinalising(false);
    setCompletionMessage('Analysis complete.');
    setStages(NEUTRAL_STAGES.map(s => ({ ...s, status: 'queued' as StageStatus })));
    setStep(1);
  }

  function reset() {
    setStep(1);
    setAnalysisError(null);
    setDocumentUnavailable(null);
    setCompletionMessage('Analysis complete.');
    setAnalysisInFlight(false);
    setIsFinalising(false);
    setFinalisingElapsedSecs(0);
    setDocumentAssistedResult(null);
    setDocumentFile(null);
    setConfidentialityAcknowledged(false);
    if (sampleMode) {
      handleScenarioSelect(scenario);
      return;
    }
    setCompany('');
    setWebsite('');
    setBuyer('');
    setBuyerThesis('');
    setJurisdiction('unknown');
    setMode('url-only');
    setStages(NEUTRAL_STAGES.map(s => ({ ...s, status: 'queued' as StageStatus })));
    setResult(null);
    setSaveSource(null);
  }

  // ── Render ────────────────────────────────────────────────────

  const railwayActive = backendConfigured && railwayPhase.kind !== 'idle';
  const hasTerminalResult =
    Boolean(result) || Boolean(documentAssistedResult) || Boolean(analysisError) || Boolean(documentUnavailable);
  const showBuildingScreen = analysisInFlight && !hasTerminalResult;

  return (
    <div className="flex-1 flex flex-col w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
          <p className="text-xs font-semibold text-primary mb-2">
            {sampleMode ? 'Example screen' : 'Evidence-first acquisition screen'}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            {sampleMode ? 'Example acquisition screen.' : 'Run an evidence-first acquisition screen.'}
          </h1>
          <p className="text-base text-muted-foreground">
            {sampleMode
              ? 'This static example shows how Frontier OS separates facts, claims and unknowns. Create a free account to run website-only analysis on your own targets.'
              : 'Start with a company website and, where available, one non-confidential PDF. Frontier OS separates verified facts, company claims, unknowns and diligence blockers for IC readiness.'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 md:px-8 py-8">

        {/* ── Screen note ──────────────────────────────────── */}
        {sampleMode ? (
          <div className="mb-6 bg-primary/5 border border-primary/20 px-4 py-3 rounded-md flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
              Example
            </span>
            <span className="text-muted-foreground">
              Example screen. Static output only.{' '}
              <Link href="/create-workspace" className="text-primary hover:underline transition-colors">
                Create a free workspace
              </Link>
              {' '}to run your own screen.
            </span>
          </div>
        ) : (
          <div className="mb-6 bg-primary/5 border border-primary/20 px-4 py-3 rounded-md flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
              Evidence-first
            </span>
            <span className="text-muted-foreground">
              Evidence-first acquisition screen. Verified facts, claims, unknowns and blockers stay separate.
            </span>
          </div>
        )}

        {/* ── Railway path: active states ────────────────────────────── */}
        {railwayActive && (
          <div className="w-full max-w-6xl mx-auto">

            {/* Resumed banner */}
            {resumedRun && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary">
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                Resumed active analysis run. Polling for results.
              </div>
            )}

            {/* Submitting */}
            {railwayPhase.kind === 'submitting' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Submitting analysis…</p>
                <p className="text-xs text-muted-foreground/60">Preparing the evidence review.</p>
              </div>
            )}

            {/* Polling */}
            {railwayPhase.kind === 'polling' && (() => {
              const sd = railwayPhase.statusData;
              const pct = sd.progress_percent ?? 0;
              const isFailed = sd.status === 'failed';
              const activeIdx = (() => {
                const m = matchPipelineIndex(sd.current_stage);
                if (m >= 0) return m;
                return Math.min(Math.floor((pct / 100) * PIPELINE_STAGES.length), PIPELINE_STAGES.length - 1);
              })();
              const stageStatuses: PipelineStageStatus[] = PIPELINE_STAGES.map((_, i) => {
                if (i < activeIdx) return 'complete';
                if (i === activeIdx) return isFailed ? 'failed' : 'running';
                return 'pending';
              });
              const activeStage = PIPELINE_STAGES[activeIdx];
              const EXPECTED_OUTPUTS = ['Recommendation', 'Evidence quality', 'AI risk', 'Strategic fit', 'Blocking gaps', 'Management questions'];
              return (
                <div className="space-y-4">

                  {/* Top status strip */}
                  <div className="rounded-lg border border-border bg-card/50 px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                        Review in progress
                      </span>
                      <span className="text-sm font-medium text-foreground">{company.trim() || 'target'}</span>
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums ml-auto">
                        {formatElapsed(elapsedSecs)} · {pct}%
                      </span>
                    </div>
                    <div className="w-full h-0.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* 3-column dashboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                    {/* LEFT — Agent pipeline */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border bg-card/50">
                        <p className="text-xs font-semibold text-muted-foreground">Evidence review</p>
                      </div>
                      <div className="divide-y divide-border/60">
                        {PIPELINE_STAGES.map((stage, i) => {
                          const status = stageStatuses[i];
                          return (
                            <div
                              key={stage.key}
                              className={cn(
                                'px-3 py-2.5 flex items-center gap-2.5 transition-colors',
                                status === 'running' ? 'bg-primary/5' : '',
                              )}
                            >
                              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                {status === 'complete' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : status === 'running' ? (
                                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                ) : status === 'failed' ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                )}
                              </div>
                              <span className={cn(
                                'text-xs',
                                status === 'complete' ? 'text-foreground/50' :
                                status === 'running'  ? 'text-foreground font-medium' :
                                status === 'failed'   ? 'text-red-400' :
                                'text-muted-foreground/35',
                              )}>
                                {stage.label}
                              </span>
                              {status === 'running' && (
                                <span className="ml-auto text-[9px] font-mono text-primary/50 animate-pulse">active</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CENTER — Current work + event log */}
                    <div className="space-y-3">
                      {activeStage && (
                        <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Now reviewing</p>
                          <p className="text-sm font-medium text-foreground">{activeStage.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activeStage.explainer}</p>
                        </div>
                      )}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-border bg-card/50">
                          <p className="text-xs font-semibold text-muted-foreground">Review log</p>
                        </div>
                        {(sd.events ?? []).length === 0 ? (
                          <div className="px-4 py-6 flex items-center gap-2 text-muted-foreground/50">
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span className="text-xs">Waiting for events…</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-border max-h-80 overflow-y-auto">
                            {[...(sd.events ?? [])].map(ev => (
                              <div key={ev.event_id} className="px-4 py-2.5 flex items-start gap-3">
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-0.5">
                                  {ev.status === 'complete' || ev.status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : ev.status === 'running' ? (
                                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                  ) : ev.status === 'failed' || ev.status === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground/30" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground leading-snug">{ev.message}</p>
                                  {ev.stage_label && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ev.stage_label}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={resetRailway}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {/* RIGHT — Run context / expectations */}
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Elapsed</p>
                        <p className="text-2xl font-mono text-foreground tabular-nums">{formatElapsed(elapsedSecs)}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-2">Usually 2-7 minutes for public-source screens.</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 leading-relaxed">Large or ambiguous targets can take longer while registry and evidence checks complete.</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Workspace</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          Free preview
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2.5">Expected outputs</p>
                        <div className="space-y-1.5">
                          {EXPECTED_OUTPUTS.map(label => (
                            <div key={label} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                              <span className="text-xs text-muted-foreground">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 leading-relaxed px-1">
                        Team / Platform workflows are designed for higher-volume screening and prioritised review.
                      </p>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* Fetching result */}
            {railwayPhase.kind === 'fetching_result' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Compiling acquisition screen…</p>
                <p className="text-xs text-muted-foreground/50">Almost done. Fetching result.</p>
                <p className="text-xs text-muted-foreground/40">Preparing the dashboard.</p>
              </div>
            )}

            {/* Error */}
            {railwayPhase.kind === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 px-4 py-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400 mb-1">Analysis failed</p>
                    <p className="text-xs text-red-400/80 font-mono leading-snug">
                      {railwayPhase.message}
                    </p>
                    {railwayPhase.runId && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        run_id: {railwayPhase.runId}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={resetRailway}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Run another
                  </button>
                  <a
                    href={BOOK_INTRO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Book intro <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Success */}
            {railwayPhase.kind === 'success' && (
              <>
                {completionSecs !== null && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mb-3 text-center">
                    Live analysis completed in {formatElapsed(completionSecs)}
                  </p>
                )}
                <AnalysisResultDisplay
                  result={railwayPhase.result}
                  onRunAnother={resetRailway}
                />
              </>
            )}

          </div>
        )}

        {/* ── Form + sample-screen path ──────────────────────────────── */}
        {!railwayActive && (
          <>
            {!sampleMode && <StepIndicator step={step} />}

            {!sampleMode && step === 1 && (
              <Step1
                sampleMode={sampleMode}
                scenario={scenario}
                company={company}           setCompany={setCompany}
                website={website}           setWebsite={setWebsite}
                buyer={buyer}               setBuyer={setBuyer}
                buyerThesis={buyerThesis}   setBuyerThesis={setBuyerThesis}
                jurisdiction={jurisdiction} setJurisdiction={setJurisdiction}
                mode={mode}                 setMode={setMode}
                documentFile={documentFile} setDocumentFile={setDocumentFile}
                documentType={documentType} setDocumentType={setDocumentType}
                confidentialityAcknowledged={confidentialityAcknowledged} setConfidentialityAcknowledged={setConfidentialityAcknowledged}
                onScenarioSelect={handleScenarioSelect}
                onRun={handleSubmit}
                analysisInFlight={analysisInFlight}
                backendConfigured={backendConfigured}
                investmentStyle={investmentStyle} setInvestmentStyle={setInvestmentStyle}
                riskPosture={riskPosture}         setRiskPosture={setRiskPosture}
              />
            )}

            {step === 2 && (
              <Step2
                company={company}
                stages={stages}
                isComplete={isTimelineComplete}
                completionMessage={completionMessage}
                error={analysisError}
                documentUnavailable={documentUnavailable}
                isFinalising={isFinalising}
                finalisingElapsedSecs={finalisingElapsedSecs}
                onContinue={() => setStep(3)}
                onUseWebsiteOnly={switchToWebsiteOnlyFromUnavailable}
              />
            )}

            {step === 3 && documentAssistedResult && hasUsableDocumentAssistedPayload(documentAssistedResult) && (
              <DocumentAssistedResultDisplay
                result={documentAssistedResult}
                onRunAnother={reset}
                saveSource={saveSource ?? 'local'}
              />
            )}

            {step === 3 && result && (
              <>
                <Step3
                  result={result}
                  buyerThesis={buyerThesis}
                  onRunAnother={reset}
                  saveSource={saveSource ?? 'local'}
                />
                {sampleMode && (
                  <div className="mt-10 border-t border-border">
                    <div className="py-10 text-center">
                      <p className="text-lg font-semibold text-foreground mb-2">Run your own acquisition screen.</p>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Create a free workspace to run public-source analysis on your own targets.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                        <Link
                          href="/create-workspace"
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                        >
                          Create workspace <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/sign-in"
                          className="inline-flex items-center justify-center h-10 px-5 text-sm font-medium border border-border text-foreground hover:border-primary/40 hover:bg-accent/20 rounded-md transition-colors"
                        >
                          Sign in
                        </Link>
                      </div>
                    </div>
                    <div className="py-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                      <p className="text-xs text-muted-foreground">Was this analysis useful? Tell us what you think.</p>
                      <a
                        href={`mailto:contact@getfrontieros.com?subject=${encodeURIComponent('Frontier OS feedback')}&body=${encodeURIComponent('What felt useful?\n\n\nWhat felt unclear?\n\n\nWould this help before IC, capital raising or client review?\n\n\nWhat output would you need to trust it more?\n\n')}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium border border-border hover:border-primary/40 h-8 px-4 rounded-md hover:bg-accent/30 transition-colors text-foreground shrink-0"
                      >
                        Send feedback
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 3 && showBuildingScreen && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm">Building acquisition screen…</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  Trophy, AlertCircle, Plus, Trash2, ArrowRight,
  CheckCircle2, Loader2, Clock, Info, ExternalLink,
  Lock as LockIcon, PlayCircle, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BetaCTA } from '@/components/BetaCTA';
import {
  compareCompanies,
  CompareRequestError,
  COMPARE_REQUEST_ERROR_MESSAGE,
  COMPARE_TIMEOUT_ERROR_MESSAGE,
  type ComparePayload,
  type CompareRequestDiagnostics,
  type CompareResult,
  type CompareTargetResult,
  type Level,
} from '@/lib/frontierApi';
import { getRuns, latestScreenRunForIdentity, saveCompareRun, type RunEntry } from '@/lib/runHistory';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { SemanticBadge } from '@/components/SemanticBadge';
import { ScreeningWorkflowGuide } from '@/components/ScreeningWorkflowGuide';
import { canonicalCompanyDomain, normalizeWebsiteUrl, isValidWebsiteUrl, WEBSITE_URL_VALIDATION_MESSAGE } from '@/lib/urlUtils';
import {
  readCompareCandidates,
  removeCompareCandidate,
  writeCompareCandidates,
  type StoredCompareCandidate,
} from '@/lib/compareSelection';
import {
  COCKPIT_COMPARE_SELECTION_KEY,
  COCKPIT_TARGETS_KEY,
  COMPARE_CANDIDATES_KEY,
  LAST_ORIGINATION_RESULT_KEY,
  SAVED_LEADS_KEY,
  getCockpitTargets,
  getSavedLeads,
  saveCompareCandidates,
  saveLead,
} from '@/lib/workflowTargets';

// ─── types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'result' | 'error';
type Jurisdiction = 'uk' | 'us' | 'de' | 'fr' | 'it' | 'other';

interface CompanyRow {
  name: string;
  url: string;
  jurisdiction: Jurisdiction;
  source?: string;
  sourceLabel?: string;
  candidateType?: string;
  evidenceStatus?: string;
  websiteStatus?: string;
  screeningStatus?: string;
  compareReady?: boolean;
  compareNote?: string;
  storageCompanyName?: string;
  storageWebsite?: string;
  storageJurisdiction?: string;
}

interface ProgressStage {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
}

const EMPTY_COMPANY = (): CompanyRow => ({ name: '', url: '', jurisdiction: 'uk' });

const PROGRESS_STEPS: string[] = [
  'Screening targets',
  'Ranking evidence quality',
  'Testing strategic fit',
  'Comparing AI risk',
  'Building recommendation',
];

const COMPARE_READY_VALIDATION_MESSAGE = 'Some selected items are research sources or missing company websites. Remove them or confirm the company website before comparison.';
const NON_COMPANY_CANDIDATE_TYPES = new Set(['source_page', 'directory_or_listicle', 'news_article', 'irrelevant']);

interface SavedCompareTarget {
  key: string;
  companyName: string;
  website: string;
  jurisdiction: string;
  recommendation: string;
  evidenceConfidence: string;
  savedAt: string;
  source: string;
  sourceLabel: string;
  screeningStatus: string;
  compareReady: boolean;
  needsReason?: string;
  raw: Record<string, unknown>;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function chip(level: Level, label: string) {
  return <SemanticBadge tone={level}>{label}</SemanticBadge>;
}

function riskLevel(risk: string): Level {
  if (risk === 'Low')         return 'green';
  if (risk === 'Medium')      return 'blue';
  if (risk === 'Medium-high') return 'amber';
  if (risk === 'High')        return 'red';
  return 'grey';
}

function rankBadgeStyle(rank: number) {
  if (rank === 1) return 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border border-[var(--semantic-verified-border)]';
  if (rank === 2) return 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border border-[var(--semantic-claim-border)]';
  if (rank === 3) return 'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border border-[var(--semantic-info-border)]';
  return 'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border border-[var(--semantic-unknown-border)]';
}

function normalizeJurisdiction(value: string): Jurisdiction {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'uk' || normalized === 'gb' || normalized === 'united kingdom') return 'uk';
  if (normalized === 'us' || normalized === 'usa' || normalized === 'united states') return 'us';
  if (normalized === 'de' || normalized === 'germany') return 'de';
  if (normalized === 'fr' || normalized === 'france') return 'fr';
  if (normalized === 'it' || normalized === 'italy') return 'it';
  return 'other';
}

function rowFromStoredCandidate(candidate: StoredCompareCandidate): CompanyRow {
  return {
    name: candidate.company_name,
    url: candidate.website,
    jurisdiction: normalizeJurisdiction(candidate.jurisdiction),
    source: candidate.source,
    sourceLabel: candidate.source_label,
    candidateType: candidate.candidate_type,
    evidenceStatus: candidate.evidence_status,
    websiteStatus: candidate.website_status,
    screeningStatus: candidate.screening_status,
    compareReady: candidate.compare_ready,
    compareNote: candidate.compare_note,
    storageCompanyName: candidate.company_name,
    storageWebsite: candidate.website,
    storageJurisdiction: candidate.jurisdiction,
  };
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorageArray(key: string): Record<string, unknown>[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item === 'object').map(item => item as Record<string, unknown>)
      : [];
  } catch {
    return [];
  }
}

function writeStorageArray(key: string, items: Record<string, unknown>[]): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function recordValue(record: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function recordList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function savedTargetKey(target: Pick<SavedCompareTarget, 'companyName' | 'website' | 'jurisdiction'>): string {
  const domain = canonicalCompanyDomain(target.website || '');
  if (domain) return `website:${domain}`;
  return `name:${target.companyName.trim().toLowerCase()}|${target.jurisdiction.trim().toLowerCase()}`;
}

function sourceArrayItems(): Record<string, unknown>[] {
  const compareCandidates = readCompareCandidates().map(item => ({
    ...item,
    __source_key: COMPARE_CANDIDATES_KEY,
  })) as Record<string, unknown>[];
  return [
    ...compareCandidates,
    ...readStorageArray(COCKPIT_COMPARE_SELECTION_KEY).map(item => ({ ...item, __source_key: COCKPIT_COMPARE_SELECTION_KEY })),
    ...getSavedLeads().map(item => ({ ...item, __source_key: SAVED_LEADS_KEY })),
    ...getCockpitTargets().map(item => ({ ...item, __source_key: COCKPIT_TARGETS_KEY })),
  ];
}

function targetFromRecord(item: Record<string, unknown>): SavedCompareTarget | null {
  const result = asRecord(item.result);
  const workflowState = asRecord(item.workflow_state ?? result.workflow_state);
  const companyName = recordValue(item, ['company_name', 'company', 'name'], recordValue(result, ['company_name', 'company']));
  const website = normalizeWebsiteUrl(recordValue(item, ['website', 'url', 'company_url'], recordValue(result, ['website', 'url'])));
  const jurisdiction = recordValue(item, ['jurisdiction', 'country', 'geo'], 'UK');
  if (!companyName && !website) return null;
  const source = recordValue(item, ['source', 'type'], recordValue(result, ['source'], 'saved'));
  const storageSource = recordValue(item, ['__source_key']);
  const sourceLabel = recordValue(
    item,
    ['source_label'],
    source === 'cockpit'
      ? 'Saved Cockpit target'
      : storageSource === SAVED_LEADS_KEY
        ? 'Saved lead'
        : storageSource === COCKPIT_COMPARE_SELECTION_KEY
          ? 'Cockpit compare selection'
          : 'Saved target',
  );
  const screeningStatus = recordValue(item, ['screening_status'], recordValue(workflowState, ['screening_status']));
  const isLeadSource = source === 'origination' || source === 'lead' || storageSource === SAVED_LEADS_KEY;
  const hasEvidence = Boolean(
    item.saved_to_cockpit === true
    || result.saved_to_cockpit === true
    || recordList(result.verified_facts).length
    || recordList(result.claims).length
    || recordList(result.unknowns).length
    || recordList(result.diligence_blockers).length
    || (!isLeadSource && (
      recordList(item.verified_facts).length
      || recordList(item.claims).length
      || recordList(item.unknowns).length
      || recordList(item.blockers).length
    ))
    || ((source === 'url' || source === 'document') && (recordValue(item, ['recommendation']) || recordValue(result, ['recommendation'])))
  );
  const isScreened = Boolean(
    screeningStatus === 'screened'
    || recordValue(workflowState, ['screening_status']) === 'screened'
    || source === 'cockpit'
    || source === 'run'
    || source === 'screened'
    || hasEvidence
  );
  const candidateType = recordValue(item, ['candidate_type']);
  const compareReady = Boolean(companyName && website && isScreened && !NON_COMPANY_CANDIDATE_TYPES.has(candidateType));
  const needsReason = !companyName
    ? 'Company name required'
    : !website
      ? 'Website required before comparison'
      : !isScreened
        ? 'Screen first'
        : NON_COMPANY_CANDIDATE_TYPES.has(candidateType)
          ? 'Research source, not a screened company'
          : undefined;
  const target: SavedCompareTarget = {
    key: '',
    companyName,
    website,
    jurisdiction,
    recommendation: recordValue(item, ['recommendation'], recordValue(result, ['recommendation'], 'Saved target')),
    evidenceConfidence: recordValue(item, ['evidence_confidence', 'evidence_status'], recordValue(result, ['evidence_confidence'], 'Unknown')),
    savedAt: recordValue(item, ['saved_at', 'timestamp', 'created_at']),
    source,
    sourceLabel,
    screeningStatus: isScreened ? 'screened' : screeningStatus || 'not_screened',
    compareReady,
    needsReason,
    raw: item,
  };
  target.key = savedTargetKey(target);
  return target;
}

function targetsFromRuns(): SavedCompareTarget[] {
  try {
    return getRuns()
      .filter(run => run.type !== 'compare')
      .map(run => targetFromRecord({
        ...run,
        company_name: run.company,
        website: run.website,
        source: run.type === 'url' || run.type === 'document' ? 'cockpit' : run.type,
        source_label: run.type === 'origination' ? 'Saved lead' : 'Saved Cockpit target',
        screening_status: run.type === 'url' || run.type === 'document' ? 'screened' : 'not_screened',
      }))
      .filter((item): item is SavedCompareTarget => item !== null);
  } catch {
    return [];
  }
}

function readSavedCompareTargets(): { screened: SavedCompareTarget[]; needsScreening: SavedCompareTarget[] } {
  const all = [
    ...sourceArrayItems().map(targetFromRecord).filter((item): item is SavedCompareTarget => item !== null),
    ...targetsFromRuns(),
  ];
  const byKey = new Map<string, SavedCompareTarget>();
  all.sort((a, b) => {
    const ready = Number(b.compareReady) - Number(a.compareReady);
    if (ready) return ready;
    const time = Date.parse(b.savedAt || '') - Date.parse(a.savedAt || '');
    if (time) return time;
    return Number(recordValue(b.raw, ['type']) === 'document') - Number(recordValue(a.raw, ['type']) === 'document');
  }).forEach(target => {
    const existing = byKey.get(target.key);
    if (!existing) {
      byKey.set(target.key, target);
    }
  });
  const deduped = Array.from(byKey.values());
  return {
    screened: deduped.filter(target => target.compareReady),
    needsScreening: deduped.filter(target => !target.compareReady && (target.companyName || target.website)),
  };
}

function storedCandidateFromSavedTarget(target: SavedCompareTarget): StoredCompareCandidate {
  return {
    company_name: target.companyName,
    website: target.website,
    jurisdiction: target.jurisdiction,
    source: target.source === 'cockpit' ? 'cockpit' : 'screened',
    source_label: target.sourceLabel || 'Saved Cockpit target',
    evidence_status: target.evidenceConfidence,
    fit_score_100: null,
    recommendation: target.recommendation,
    website_status: 'known',
    compare_ready: true,
    run_ready: true,
    screening_status: 'screened',
    cockpit_target_id: recordValue(target.raw, ['cockpit_target_id', 'id', 'run_id']) || undefined,
    run_id: recordValue(target.raw, ['run_id', 'id']) || undefined,
    saved_at: target.savedAt || undefined,
  };
}

function rowFromSavedTarget(target: SavedCompareTarget): CompanyRow {
  return {
    name: target.companyName,
    url: target.website,
    jurisdiction: normalizeJurisdiction(target.jurisdiction),
    source: target.source === 'cockpit' ? 'cockpit' : 'screened',
    sourceLabel: target.sourceLabel,
    evidenceStatus: target.evidenceConfidence,
    websiteStatus: 'known',
    screeningStatus: 'screened',
    compareReady: true,
    storageCompanyName: target.companyName,
    storageWebsite: target.website,
    storageJurisdiction: target.jurisdiction,
  };
}

function removeSavedCompareTargetFromStorage(target: SavedCompareTarget): void {
  removeCompareCandidate({
    company_name: target.companyName,
    website: target.website,
    jurisdiction: target.jurisdiction,
  });
  [COCKPIT_COMPARE_SELECTION_KEY, SAVED_LEADS_KEY, COCKPIT_TARGETS_KEY].forEach(key => {
    const filtered = readStorageArray(key).filter(item => {
      const parsed = targetFromRecord(item);
      return parsed ? parsed.key !== target.key : true;
    });
    writeStorageArray(key, filtered);
  });
}

function saveLeadFromTarget(target: SavedCompareTarget): void {
  const candidate = storedCandidateFromSavedTarget({
    ...target,
    compareReady: false,
    screeningStatus: 'not_screened',
  });
  saveLead({
    ...candidate,
    source: target.source || 'lead',
    source_label: target.sourceLabel || 'Saved lead',
    compare_ready: false,
    run_ready: Boolean(target.website),
    compare_note: 'Screen first before comparison.',
    screening_status: 'not_screened',
    saved_at: new Date().toISOString(),
  });
}

function initialCompanyRows(): CompanyRow[] {
  const rows = readCompareCandidates()
    .filter(candidate => candidate.compare_ready !== false && Boolean(candidate.website))
    .slice(0, 5)
    .map(rowFromStoredCandidate);
  while (rows.length < 2) rows.push(EMPTY_COMPANY());
  return rows;
}

function readPendingCompareCandidates(): StoredCompareCandidate[] {
  return readCompareCandidates().filter(candidate => (
    candidate.compare_ready === false
    || !candidate.company_name
    || !candidate.website
    || NON_COMPANY_CANDIDATE_TYPES.has(candidate.candidate_type || '')
  ));
}

function hasStoredOriginationResult(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(LAST_ORIGINATION_RESULT_KEY));
  } catch {
    return false;
  }
}

function normalizeComparePayload({
  buyer,
  buyerThesis,
  companies,
}: {
  buyer: string;
  buyerThesis: string;
  companies: CompanyRow[];
}): ComparePayload {
  return {
    buyer_name: buyer.trim() || undefined,
    buyer_thesis: buyerThesis.trim() || undefined,
    companies: companies.map(company => {
      const screen = latestScreenRun(company);
      return {
        company_name: company.name.trim(), website: normalizeWebsiteUrl(company.url), jurisdiction: company.jurisdiction,
        screen_record: screen ? screenRecordForCompare(screen) : undefined,
      };
    }),
  };
}

function compareRowKey(company: Pick<CompanyRow, 'name' | 'url'>): string {
  const domain = canonicalCompanyDomain(company.url || '');
  if (domain) return `website:${domain}`;
  return `name:${company.name.trim().toLowerCase()}`;
}

function runEntryKey(run: RunEntry): string {
  const domain = canonicalCompanyDomain(run.website || '');
  if (domain) return `website:${domain}`;
  return `name:${run.company.trim().toLowerCase()}`;
}

function latestScreenRun(company: Pick<CompanyRow, 'name' | 'url'>): RunEntry | undefined {
  return latestScreenRunForIdentity(getRuns(), company.name, company.url);
}

function screenRecordForCompare(run: RunEntry): Record<string, unknown> {
  const result = asRecord(run.result);
  return {
    ...result,
    run_id: run.id, timestamp: run.timestamp, type: run.type,
    recommendation: run.recommendation, recommendation_level: run.recommendation_level,
    ic_readiness: run.ic_readiness, valuation_readiness: run.valuation_readiness,
    strategic_fit_label: run.strategic_fit_label, evidence_confidence: run.evidence_confidence,
    ai_replica_risk: run.ai_replica_risk, blockers: run.blockers, next_action: run.next_action,
    pages_processed: run.documentSummary ? asRecord(run.documentSummary).pages_processed : result.pages_processed,
    verified_facts: result.verified_facts ?? [], claims: result.claims ?? [], unknowns: result.unknowns ?? [],
  };
}

function readScreenedRunKeys(): Set<string> {
  try {
    return new Set(
      getRuns()
        .filter(run => run.type === 'url' || run.type === 'document')
        .map(runEntryKey),
    );
  } catch {
    return new Set();
  }
}

function isScreenedCompany(company: CompanyRow, screenedRunKeys: Set<string>): boolean {
  if (!company.name.trim()) return false;
  if (screenedRunKeys.has(compareRowKey(company))) return true;
  if (company.source === 'cockpit' || company.source === 'run' || company.source === 'screened') return true;
  return false;
}

function invalidCompareRowReason(company: CompanyRow): string {
  if (!company.name.trim()) return 'Company name required.';
  if (!company.url.trim()) return 'Website required.';
  if (!isValidWebsiteUrl(normalizeWebsiteUrl(company.url))) return 'Valid website required.';
  if (NON_COMPANY_CANDIDATE_TYPES.has(company.candidateType || '')) return 'Research source, not a company candidate.';
  if (company.compareReady === false) return 'Not marked compare-ready.';
  return '';
}

function showCompareDebug(): boolean {
  return import.meta.env.DEV
    || (typeof window !== 'undefined' && window.localStorage.getItem('frontier_debug_diagnostics') === '1');
}

function formatDiagnostics(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function textValue(value: unknown, fallback = 'Unavailable'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || fallback;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.label ?? record.score ?? record.rationale ?? record.summary, fallback);
  }
  return fallback;
}

function companyWebsiteUrl(website: string): string {
  return website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`;
}

function runScreenHref(companyName: string, website: string): string {
  const params = new URLSearchParams();
  if (companyName) params.set('company_name', companyName);
  if (website) params.set('website', companyWebsiteUrl(website));
  return `/app/run${params.toString() ? `?${params.toString()}` : ''}`;
}

type FastPreviewRow = {
  companyName: string;
  website: string;
  status: string;
  evidenceConfidence: string;
  strategicFit: string;
  aiRisk: string;
  recommendation: string;
  nextAction: string;
  warnings: string[];
};

function fastPreviewRows(result: CompareResult): FastPreviewRow[] {
  const rows = Array.isArray(result.company_results)
    ? result.company_results.map(company => ({
      companyName: company.company_name || 'Target',
      website: company.website || '',
      status: company.status || 'ok',
      evidenceConfidence: company.evidence_confidence || 'Unavailable',
      strategicFit: textValue(company.strategic_fit),
      aiRisk: company.ai_replica_risk || 'Unknown',
      recommendation: company.recommendation || 'Screen one company',
      nextAction: company.next_action || 'Screen company',
      warnings: Array.isArray(company.warnings) ? company.warnings : [],
    }))
    : [];
  if (rows.length > 0) return rows;
  const ranked = Array.isArray(result.ranked_companies) && result.ranked_companies.length > 0
    ? result.ranked_companies
    : Array.isArray(result.ranked_targets) ? result.ranked_targets : [];
  return ranked.map(item => ({
    companyName: textValue(item.company_name ?? item.company ?? item.name, 'Target'),
    website: textValue(item.website ?? item.url, ''),
    status: textValue(item.status, 'ok'),
    evidenceConfidence: textValue(item.evidence_confidence),
    strategicFit: textValue(item.strategic_fit),
    aiRisk: textValue(item.ai_replica_risk, 'Unknown'),
    recommendation: textValue(item.recommendation, 'Screen one company'),
    nextAction: textValue(item.next_action, 'Screen company'),
    warnings: Array.isArray(item.warnings) ? item.warnings.map(warning => String(warning)) : [],
  }));
}

// ─── Form phase ───────────────────────────────────────────────────────────────

function CompareForm({
  buyer, setBuyer,
  buyerThesis, setBuyerThesis,
  companies, setCompanies,
  onRemoveStoredCandidate,
  onSubmit,
  submitLabel,
}: {
  buyer: string; setBuyer: (v: string) => void;
  buyerThesis: string; setBuyerThesis: (v: string) => void;
  companies: CompanyRow[]; setCompanies: (v: CompanyRow[]) => void;
  onRemoveStoredCandidate: (candidate: CompanyRow) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  function updateCompany(i: number, field: keyof CompanyRow, value: string) {
    const updated = companies.map((c, idx) => {
      if (idx !== i) return c;
      const next = { ...c, [field]: value };
      if (field === 'url' && value.trim()) {
        next.compareReady = true;
        next.compareNote = undefined;
        next.websiteStatus = 'known';
      }
      return next;
    });
    setCompanies(updated);
  }

  function addCompany() {
    if (companies.length < 5) setCompanies([...companies, EMPTY_COMPANY()]);
  }

  function removeCompany(i: number) {
    const candidate = companies[i];
    if (candidate?.source) onRemoveStoredCandidate(candidate);
    const updated = companies.filter((_, idx) => idx !== i);
    while (updated.length < 2) updated.push(EMPTY_COMPANY());
    setCompanies(updated);
  }

  const canSubmit = companies.filter(c => c.name.trim()).length >= 2;
  const pendingCandidates = companies.filter(c => c.source === 'origination' && (c.compareReady === false || !c.url.trim()));

  return (
    <div className="w-full">
      <form onSubmit={e => { e.preventDefault(); if (canSubmit) onSubmit(); }}>
        {/* Buyer context */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[10px] font-semibold tracking-normal text-primary mb-0">Buyer context</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer / platform name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="buyer"
                placeholder="e.g. UK Mid-Market PE Acquirer"
                value={buyer}
                onChange={e => setBuyer(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_thesis">
                Buyer thesis <span className="text-muted-foreground font-normal">(optional, improves strategic fit ranking)</span>
              </Label>
              <textarea
                id="buyer_thesis"
                rows={3}
                placeholder="e.g. PE platform add-on: recurring revenue, EBITDA quality, ARR confirmation, low AI replica risk"
                value={buyerThesis}
                onChange={e => setBuyerThesis(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Company rows */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Target companies</p>
            <span className="text-xs text-muted-foreground">{companies.length} / 5</span>
          </div>
          {pendingCandidates.length > 0 && (
            <div className="mx-5 mt-4 rounded-md border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-3 py-2 text-xs text-[var(--semantic-claim-text)]">
              {pendingCandidates.length} origination candidate{pendingCandidates.length === 1 ? '' : 's'} pending. Website required before comparison.
            </div>
          )}
          <div className="divide-y divide-border">
            {companies.map((co, i) => (
              <div key={i} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-foreground">Company {i + 1}</p>
                    {co.source === 'origination' && (
                      <SemanticBadge tone={co.compareReady === false || !co.url ? 'partial' : 'info'}>
                        Origination
                      </SemanticBadge>
                    )}
                    {co.source === 'cockpit' && co.screeningStatus === 'screened' && (
                      <SemanticBadge tone="verified">
                        Screened Cockpit target
                      </SemanticBadge>
                    )}
                  </div>
                  {(companies.length > 2 || co.source) && (
                    <button
                      type="button"
                      onClick={() => removeCompany(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {(co.compareReady === false || (co.source && !co.url.trim())) && (
                  <div className="mb-3 rounded-md border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-3 py-2 text-xs text-[var(--semantic-claim-text)]">
                    {co.compareNote || 'Website required before this target can be compared.'}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs" htmlFor={`co-name-${i}`}>Company name</Label>
                    <Input
                      id={`co-name-${i}`}
                      placeholder="Company name"
                      value={co.name}
                      onChange={e => updateCompany(i, 'name', e.target.value)}
                      className="bg-background h-9 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs" htmlFor={`co-url-${i}`}>Website URL</Label>
                    <Input
                      id={`co-url-${i}`}
                      placeholder="https://example.com"
                      value={co.url}
                      onChange={e => updateCompany(i, 'url', e.target.value)}
                      className="bg-background h-9 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs">Jurisdiction</Label>
                    <Select
                      value={co.jurisdiction}
                      onValueChange={v => updateCompany(i, 'jurisdiction', v)}
                    >
                      <SelectTrigger className="bg-background h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uk">UK</SelectItem>
                        <SelectItem value="us">US</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {companies.length < 5 && (
            <div className="px-5 py-3 border-t border-border">
              <button
                type="button"
                onClick={addCompany}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add company ({companies.length}/5)
              </button>
            </div>
          )}
        </div>

        {!canSubmit && (
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            Enter at least 2 company names to compare.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={!canSubmit} className="sm:flex-1 h-11 text-base">
            {submitLabel} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-border bg-background hover:bg-accent h-11 px-5 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_compare_form')}
          >
            Book a 30-minute intro <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>
    </div>
  );
}

function formatSavedDate(value: string): string {
  if (!value) return 'Saved date unavailable';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value.slice(0, 10);
  }
}

function CompareTargetSelector({
  screenedTargets,
  needsScreeningTargets,
  selectedKeys,
  onToggle,
  onCompareSelected,
  onRemove,
  onSaveLead,
  onManualOpen,
}: {
  screenedTargets: SavedCompareTarget[];
  needsScreeningTargets: SavedCompareTarget[];
  selectedKeys: Set<string>;
  onToggle: (target: SavedCompareTarget) => void;
  onCompareSelected: () => void;
  onRemove: (target: SavedCompareTarget) => void;
  onSaveLead: (target: SavedCompareTarget) => void;
  onManualOpen: () => void;
}) {
  const selectedCount = screenedTargets.filter(target => selectedKeys.has(target.key)).length;
  const compareLabel = selectedCount === 0
    ? 'Select screened targets'
    : selectedCount === 1
      ? 'Select one more target'
      : 'Compare selected screened targets';

  return (
    <div className="surface-raised mb-6 overflow-hidden rounded-xl">
      <div className="px-5 py-4 border-b border-border bg-card/80">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Select screened targets</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare works best with targets already screened and saved to Cockpit.
            </p>
            {selectedCount > 0 && (
              <p className="mt-2 text-xs font-medium text-primary">{selectedCount} selected</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/cockpit"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Back to Cockpit
            </Link>
            <Link
              href="/app/run"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Screen another company
            </Link>
            <button
              type="button"
              onClick={onCompareSelected}
              disabled={selectedCount < 2}
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors',
                selectedCount >= 2
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-70',
              )}
            >
              {compareLabel}
            </button>
          </div>
        </div>
      </div>

      {screenedTargets.length > 0 ? (
        <div className="divide-y divide-border">
          {screenedTargets.map(target => {
            const checked = selectedKeys.has(target.key);
            const selectionDisabled = !checked && selectedCount >= 5;
            return (
              <div key={target.key} className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-accent/30 lg:grid-cols-[auto_1.5fr_1fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={selectionDisabled}
                    onChange={() => onToggle(target)}
                    aria-label={`Select ${target.companyName} for compare`}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{target.companyName}</p>
                  <a href={companyWebsiteUrl(target.website)} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 overflow-hidden text-xs text-muted-foreground hover:text-primary transition-colors">
                    <span className="truncate">{target.website}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Recommendation</p>
                  <p className="text-xs text-foreground">{target.recommendation || 'Saved screen'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Evidence confidence</p>
                  <p className="text-xs text-foreground">{target.evidenceConfidence || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Saved</p>
                  <p className="text-xs text-muted-foreground">{formatSavedDate(target.savedAt)}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{target.sourceLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Link
                    href={runScreenHref(target.companyName, target.website)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(target)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-6">
          <p className="text-sm font-semibold text-foreground">No screened targets saved yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Screen a company URL and save it to Cockpit before comparing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/run" className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Screen company
            </Link>
            <Link href="/app/cockpit" className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              Open Cockpit
            </Link>
            <button
              type="button"
              onClick={onManualOpen}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Manual quick compare
            </button>
          </div>
        </div>
      )}

      {needsScreeningTargets.length > 0 && (
        <div className="border-t border-border bg-muted/10 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Leads needing screening</p>
          <p className="mt-1 text-xs text-muted-foreground">
            These saved leads need an individual URL screen before screened comparison.
          </p>
          <div className="mt-3 space-y-2">
            {needsScreeningTargets.slice(0, 6).map(target => (
              <div key={target.key} className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{target.companyName || 'Saved lead'}</p>
                  <p className="max-w-full truncate text-[11px] text-muted-foreground" title={target.website || target.needsReason || 'Website required'}>
                    {target.website || target.needsReason || 'Website required'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={runScreenHref(target.companyName, target.website)}
                    className={cn(
                      'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors',
                      target.website
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'cursor-not-allowed border border-border bg-muted text-muted-foreground',
                    )}
                    aria-disabled={!target.website}
                    onClick={event => {
                      if (!target.website) event.preventDefault();
                    }}
                  >
                    Screen company
                  </Link>
                  <button
                    type="button"
                    onClick={() => onSaveLead(target)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    Save lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading phase ────────────────────────────────────────────────────────────

function CompareLoading({ stages, manualQuickCompare }: { stages: ProgressStage[]; manualQuickCompare: boolean }) {
  return (
    <div className="w-full">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          {manualQuickCompare && (
            <p className="mb-1 text-[11px] font-semibold text-primary">Manual quick compare · public-source preview</p>
          )}
          <p className="text-xs text-muted-foreground">Comparing companies and checking public evidence...</p>
        </div>
        <div className="divide-y divide-border">
            {stages.map((stage, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 flex items-center gap-3 transition-colors',
                  stage.status === 'running' ? 'bg-primary/5' :
                  stage.status === 'completed' ? 'bg-background' :
                  stage.status === 'failed' ? 'bg-destructive/5' :
                  stage.status === 'partial' ? 'bg-[var(--semantic-claim-bg)]' :
                  'bg-muted/5 opacity-40',
                )}
              >
                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                  {stage.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : stage.status === 'running' ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : stage.status === 'failed' ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : stage.status === 'partial' ? (
                    <Info className="w-4 h-4 text-[var(--semantic-claim-text)]" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>
                <p className={cn(
                  'text-sm',
                  stage.status === 'pending' ? 'text-muted-foreground' :
                  stage.status === 'failed' ? 'text-destructive' :
                  'text-foreground',
                )}>
                {stage.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Result phase ─────────────────────────────────────────────────────────────

function evidenceScore(s: string) {
  return s === 'High' ? 3 : s === 'Medium' ? 2 : s === 'Low' ? 1 : 0;
}

function CompareResultView({ result, onReset, saveSource, manualQuickCompare, usingScreenedCockpitTargets }: {
  result: CompareResult;
  onReset: () => void;
  saveSource?: 'backend' | 'local';
  manualQuickCompare: boolean;
  usingScreenedCockpitTargets: boolean;
}) {
  const isFastPreview = result.status === 'ok' && (result.compare_mode === 'fast_preview' || result.fast_compare_mode);
  const previewRows = fastPreviewRows(result);
  const lacksDifferentiation = isFastPreview && result.evidence_backed_differentiation_available === false;
  const top = result.targets[0];
  const second = result.targets[1];
  const strongestEvidence = [...result.targets].sort(
    (a, b) => evidenceScore(b.evidence_confidence) - evidenceScore(a.evidence_confidence),
  )[0]?.company ?? '—';
  const mostBlockers = [...result.targets].sort((a, b) => b.blockers.length - a.blockers.length)[0];

	  return (
	    <div className="w-full space-y-6">

	      {isFastPreview && (
	        <div className="rounded-lg border border-border bg-card overflow-hidden">
	          <div className="px-5 py-4 border-b border-border bg-muted/20">
	            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
	              <div>
	                <p className="text-[10px] font-semibold tracking-normal text-primary mb-1">Manual quick compare</p>
	                <h2 className="text-xl font-semibold text-foreground">Manual quick compare completed</h2>
	              </div>
	              <SemanticBadge tone="info">Public-source preview</SemanticBadge>
	            </div>
	          </div>
	          <div className="px-5 py-4 space-y-3">
	            <div className="flex items-start gap-2 rounded-md border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-3 py-2 text-xs text-[var(--semantic-claim-text)]">
	              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
	              Manual quick compare completed. Screen one company for evidence-backed ranking.
	            </div>
	            {lacksDifferentiation && (
	              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
	                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
	                No evidence-backed differentiation yet.
	              </div>
	            )}
	            {result.comparison_summary && (
	              <p className="text-sm text-muted-foreground leading-relaxed">{result.comparison_summary}</p>
	            )}
	          </div>
	        </div>
	      )}

	      {usingScreenedCockpitTargets && (
	        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[var(--semantic-verified-bg)] border border-[var(--semantic-verified-border)] text-xs text-[var(--semantic-verified-text)]">
	          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
	          Using screened Cockpit targets.
	        </div>
	      )}

	      {!isFastPreview && manualQuickCompare && (
	        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[var(--semantic-info-bg)] border border-[var(--semantic-info-border)] text-xs text-[var(--semantic-info-text)]">
	          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
	          Manual quick compare · public-source preview.
	        </div>
	      )}

      {result.partial_results && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[var(--semantic-claim-bg)] border border-[var(--semantic-claim-border)] text-xs text-[var(--semantic-claim-text)]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Partial compare returned. Some companies timed out or could not be verified.
        </div>
      )}

      {result.fallback_used && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
          Backend marked this comparison as partial. Treat ranking as provisional until each target has a full evidence screen.
        </div>
      )}

	      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
	        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
	        Public-source screen only. Financials and document evidence must be verified before IC/client use.
	      </div>

	      {/* Saved to Cockpit notice */}
	      {!isFastPreview && (
	      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--semantic-verified-bg)] border border-[var(--semantic-verified-border)] text-xs text-[var(--semantic-verified-text)]">
	        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
	        <span>
          {saveSource === 'backend'
            ? 'Saved to Cockpit'
            : 'Saved locally · create an account to sync across devices'}
        </span>
        <a
          href="/app/cockpit"
          className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          onClick={e => { e.preventDefault(); window.location.href = '/app/cockpit'; }}
	        >
	          Open Cockpit →
	        </a>
	      </div>
	      )}

	      {/* Comparison verdict */}
	      {!isFastPreview && (
	      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20">
          <p className="text-[10px] font-semibold tracking-normal text-primary">Comparison verdict</p>
        </div>
        <div className="px-5 py-4">
          {top && second ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{top.company}</span> ranks first because it has stronger evidence confidence and fewer blocker signals in the preview screen.{' '}
              <span className="font-semibold text-foreground">{second.company}</span> remains reviewable, but needs more proof around{' '}
              {second.blockers.length > 0 ? second.blockers.slice(0, 2).join(', ').toLowerCase() : 'ARR quality, revenue mix and AI defensibility'}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Ranking complete. See targets below.</p>
          )}
	        </div>
	      </div>
	      )}

	      {/* Summary cards */}
	      {!isFastPreview && (
	      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Best first target',    value: result.most_ic_ready || 'Unavailable',     color: 'text-green-700' },
          { label: 'Strongest evidence',   value: strongestEvidence,        color: 'text-blue-700' },
          { label: 'Highest AI risk',      value: result.highest_ai_risk || 'Unavailable',   color: 'text-red-700' },
          { label: 'Biggest diligence gap',
            value: mostBlockers && mostBlockers.blockers.length > 0
              ? `${mostBlockers.company}: ${mostBlockers.blockers[0]}`
              : result.most_evidence_gaps || 'Unavailable',
            color: 'text-amber-700' },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">{card.label}</p>
            <p className={cn('text-sm font-semibold leading-snug', card.color)}>{card.value}</p>
          </div>
        ))}
      <div className="rounded-lg border border-border bg-card p-3 col-span-2 lg:col-span-1">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Best next action</p>
        <p className="text-xs text-foreground leading-snug">{result.best_next_action || 'Screen one company before IC use.'}</p>
      </div>
	    </div>
	      )}

	        {isFastPreview && previewRows.length > 0 && (
	          <div className="rounded-lg border border-border bg-card overflow-hidden">
	            <div className="px-5 py-3.5 border-b border-border bg-muted/20">
	              <p className="text-[10px] font-semibold tracking-normal text-primary">Fast preview results</p>
	            </div>
	            <div className="divide-y divide-border">
	              {previewRows.map(company => (
	                <div key={`${company.companyName}-${company.website}`} className="px-5 py-4">
	                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
	                    <div className="min-w-0">
	                      <div className="flex flex-wrap items-center gap-2">
	                        <p className="text-base font-semibold text-foreground">{company.companyName}</p>
	                        <SemanticBadge tone={company.status === 'ok' ? 'info' : company.status === 'partial_timeout' ? 'partial' : 'blocker'}>
	                          {company.status === 'partial_timeout' ? 'Partial timeout' : company.status}
	                        </SemanticBadge>
	                      </div>
	                      {company.website && (
	                        <a
	                          href={companyWebsiteUrl(company.website)}
	                          target="_blank"
	                          rel="noopener noreferrer"
	                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
	                        >
	                          {company.website} <ExternalLink className="w-3 h-3" />
	                        </a>
	                      )}
	                    </div>
	                    <Link
	                      href={runScreenHref(company.companyName, company.website)}
	                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
	                    >
	                      Screen company
	                    </Link>
	                  </div>
	                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
	                    <div>
	                      <p className="font-semibold text-muted-foreground mb-1">Evidence confidence</p>
	                      <p className="text-foreground">{company.evidenceConfidence}</p>
	                    </div>
	                    <div>
	                      <p className="font-semibold text-muted-foreground mb-1">Strategic fit</p>
	                      <p className="text-foreground">{company.strategicFit}</p>
	                    </div>
	                    <div>
	                      <p className="font-semibold text-muted-foreground mb-1">AI risk</p>
	                      <p className="text-foreground">{company.aiRisk}</p>
	                    </div>
	                    <div>
	                      <p className="font-semibold text-muted-foreground mb-1">Recommendation</p>
	                      <p className="text-foreground">{company.recommendation}</p>
	                    </div>
	                    <div>
	                      <p className="font-semibold text-muted-foreground mb-1">Next action</p>
	                      <p className="text-foreground">{company.nextAction}</p>
	                    </div>
	                  </div>
	                  {company.warnings.length > 0 && (
	                    <ul className="mt-3 space-y-1">
	                      {company.warnings.map((warning, index) => (
	                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
	                          <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
	                          {warning}
	                        </li>
	                      ))}
	                    </ul>
	                  )}
	                </div>
	              ))}
	            </div>
	          </div>
	        )}

	        {!isFastPreview && Array.isArray(result.company_results) && result.company_results.length > 0 && (
	          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20">
              <p className="text-[10px] font-semibold tracking-normal text-primary">Company result status</p>
            </div>
            <div className="divide-y divide-border">
              {result.company_results.map(company => (
                <div key={`${company.company_name}-${company.website}`} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{company.company_name}</p>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          {company.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <SemanticBadge tone={company.status === 'ok' ? 'verified' : company.status === 'partial_timeout' ? 'partial' : 'blocker'}>
                      {company.status === 'partial_timeout' ? 'Partial timeout' : company.status}
                    </SemanticBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Recommendation</p>
                      <p className="text-foreground">{company.recommendation || 'Unavailable'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Evidence confidence</p>
                      <p className="text-foreground">{company.evidence_confidence || 'Unavailable'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Next action</p>
                      <p className="text-foreground">{company.next_action || 'Screen company URL for this company.'}</p>
                    </div>
                  </div>
                  {company.warnings?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {company.warnings.map((warning, index) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranked targets */}
	      {!isFastPreview && (
	      <div className="space-y-4">
        {result.targets.map((t: CompareTargetResult) => (
          <div
            key={t.company}
            className={cn(
              'rounded-lg border p-5 transition-colors',
              t.rank === 1
                ? 'border-[var(--semantic-verified-border)] bg-[var(--semantic-verified-bg)]/40'
                : t.recommendation_level === 'red'
                  ? 'border-border/60 bg-card/40 opacity-80'
                  : 'border-border bg-card/60',
            )}
          >
            {/* Card header */}
            <div className="flex items-start gap-4">
              <div className={cn(
                'flex items-center justify-center rounded-full shrink-0 font-bold text-sm w-9 h-9',
                rankBadgeStyle(t.rank),
	              )}>
	                {t.rank === 1 ? <Trophy className="w-4 h-4" /> : `#${t.rank}`}
	              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                  <p className="text-base font-bold text-foreground leading-snug">{t.company}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {chip(t.recommendation_level, t.recommendation)}
                    {chip(riskLevel(t.ai_replica_risk), `AI risk: ${t.ai_replica_risk}`)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{t.rank_reason}</p>
                {t.url && (
                  <a
                    href={t.url.startsWith('http') ? t.url : `https://${t.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors mt-1"
                  >
                    {t.url} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-border/60" />

            {/* Detail grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Strategic fit</p>
                <p className="text-xs text-foreground leading-snug">{t.strategic_fit}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Evidence confidence</p>
                <p className="text-xs text-foreground">{t.evidence_confidence}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">AI replica risk</p>
                {chip(riskLevel(t.ai_replica_risk), t.ai_replica_risk)}
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Main blockers</p>
                <p className="text-xs text-muted-foreground leading-snug">{t.blockers.length > 0 ? t.blockers[0] : 'None identified'}</p>
              </div>
            </div>

            {/* Blockers */}
            {t.blockers.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
                  Diligence gaps ({t.blockers.length})
                </p>
                <ul className="space-y-1">
                  {t.blockers.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next action */}
            <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mr-1.5">Next action:</span>
                <span className="text-xs text-muted-foreground">{t.next_action}</span>
              </div>
              {t.recommendation_level !== 'red' && (
                <Link
                  href="/app/run"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                >
                  Screen full target →
                </Link>
              )}
            </div>
          </div>
	        ))}
	      </div>
	      )}

	      {/* Locked premium features */}
      <div>
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-3">Available in private beta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: 'Drill-down screens', desc: 'Screen a full URL-only or document-assisted screen on any ranked target directly from the comparison.' },
            { title: 'Full IC memo (PDF)', desc: 'Export a structured acquisition memo for any target: financials, evidence register and AI assessment.' },
            { title: 'Evidence comparison matrix', desc: 'Side-by-side evidence quality scores, conflict flags and source rankings across all targets.' },
            { title: 'PowerPoint IC pack', desc: 'Ready-to-present slide deck for the IC: ranked targets, fit scores, risk flags and recommended next action.' },
            { title: 'Save to Deal Cockpit', desc: 'Add any target to your pipeline, set IC status and track progress across the team.' },
            { title: 'Historical pipeline view', desc: 'See all previous comparisons, archived by deal, fund and date, with saved IC decisions.' },
          ].map(f => (
            <div key={f.title} className="rounded-lg border border-border bg-card/40 p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                <LockIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-0.5">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug mb-2">{f.desc}</p>
                <Link
                  href="/request-pilot"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  onClick={() => console.log('[analytics] clicked_request_private_beta_compare_locked')}
                >
                  Request private beta access <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-5">
        <p className="text-sm font-semibold text-foreground mb-1">Screen a full screen on your top target.</p>
        <p className="text-xs text-muted-foreground mb-4">
          A URL-only screen provides evidence cards, AI replica risk, strategic fit and IC readiness. Document-assisted analysis is available in private beta.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/app/run"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 rounded-md transition-colors"
            onClick={() => console.log('[analytics] clicked_run_from_compare_result')}
          >
            Screen company <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/request-pilot"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground"
            onClick={() => console.log('[analytics] clicked_request_beta_compare_cta')}
          >
            Request private beta access
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => console.log('[analytics] clicked_book_intro_compare_result')}
          >
            Book a 30-minute intro <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Screen another */}
      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          ← Start another comparison
        </button>
        <Link
          href="/app/cockpit"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Open Deal Cockpit
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompareTargetsPage() {
  const initialSavedTargets = readSavedCompareTargets();
  const [phase, setPhase]             = useState<Phase>('form');
  const [buyer, setBuyer]             = useState('');
  const [buyerThesis, setBuyerThesis] = useState('');
  const [companies, setCompanies]     = useState<CompanyRow[]>(initialCompanyRows);
  const [screenedTargets, setScreenedTargets] = useState<SavedCompareTarget[]>(initialSavedTargets.screened);
  const [needsScreeningTargets, setNeedsScreeningTargets] = useState<SavedCompareTarget[]>(initialSavedTargets.needsScreening);
  const [selectedSavedKeys, setSelectedSavedKeys] = useState<Set<string>>(() => new Set(
    initialSavedTargets.screened
      .filter(target => readCompareCandidates().some(candidate => candidate.company_name === target.companyName && normalizeWebsiteUrl(candidate.website) === target.website))
      .slice(0, 5)
      .map(target => target.key),
  ));
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressStage[]>(
    PROGRESS_STEPS.map(label => ({ label, status: 'pending' })),
  );
  const [result, setResult] = useState<CompareResult | null>(null);
  const [saveSource, setSaveSource] = useState<'backend' | 'local' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDiagnostics, setErrorDiagnostics] = useState<CompareRequestDiagnostics | null>(null);
  const [pendingCompareCandidates, setPendingCompareCandidates] = useState<StoredCompareCandidate[]>(readPendingCompareCandidates);
  const [invalidCompareRows, setInvalidCompareRows] = useState<CompanyRow[]>([]);
  const [manualQuickCompare, setManualQuickCompare] = useState(false);
  const [resultUsingScreenedCockpitTargets, setResultUsingScreenedCockpitTargets] = useState(false);

  function handleRemoveStoredCandidate(candidate: CompanyRow) {
    removeCompareCandidate({
      company_name: candidate.storageCompanyName || candidate.name,
      website: candidate.storageWebsite || candidate.url,
      jurisdiction: candidate.storageJurisdiction || candidate.jurisdiction,
    });
  }

  function clearCompareSelection() {
    writeCompareCandidates([]);
    setCompanies([EMPTY_COMPANY(), EMPTY_COMPANY()]);
    setPendingCompareCandidates([]);
    setInvalidCompareRows([]);
    setManualQuickCompare(false);
    setSelectedSavedKeys(new Set());
    refreshSavedTargets();
  }

  function removePendingCompareCandidate(candidate: StoredCompareCandidate) {
    removeCompareCandidate(candidate);
    setPendingCompareCandidates(readPendingCompareCandidates());
    refreshSavedTargets();
  }

  function refreshSavedTargets() {
    const next = readSavedCompareTargets();
    setScreenedTargets(next.screened);
    setNeedsScreeningTargets(next.needsScreening);
    setSelectedSavedKeys(prev => new Set([...prev].filter(key => next.screened.some(target => target.key === key))));
  }

  function handleToggleSavedTarget(target: SavedCompareTarget) {
    setSelectedSavedKeys(prev => {
      const next = new Set(prev);
      if (next.has(target.key)) next.delete(target.key);
      else if (next.size < 5) next.add(target.key);
      return next;
    });
  }

  function handleRemoveSavedTarget(target: SavedCompareTarget) {
    removeSavedCompareTargetFromStorage(target);
    setSelectedSavedKeys(prev => {
      const next = new Set(prev);
      next.delete(target.key);
      return next;
    });
    refreshSavedTargets();
    setPendingCompareCandidates(readPendingCompareCandidates());
  }

  function handleSaveLeadTarget(target: SavedCompareTarget) {
    saveLeadFromTarget(target);
    refreshSavedTargets();
  }

  async function handleCompareSelectedTargets() {
    const selectedTargets = screenedTargets.filter(target => selectedSavedKeys.has(target.key)).slice(0, 5);
    if (selectedTargets.length < 2) return;
    const storedCandidates = selectedTargets.map(storedCandidateFromSavedTarget);
    saveCompareCandidates(storedCandidates);
    writeStorageArray(COCKPIT_COMPARE_SELECTION_KEY, storedCandidates as unknown as Record<string, unknown>[]);
    setPendingCompareCandidates([]);
    const selectedRows = selectedTargets.map(rowFromSavedTarget);
    setCompanies(selectedRows);
    await handleSubmit(false, selectedRows, { ignorePendingCandidates: true });
  }

  async function handleSubmit(
    forceManualQuickCompare = false,
    companyOverride?: CompanyRow[],
    options: { ignorePendingCandidates?: boolean } = {},
  ) {
    const sourceCompanies = companyOverride ?? companies;
    const pendingForSubmit = options.ignorePendingCandidates ? [] : pendingCompareCandidates;
    const normalizedCompanies = sourceCompanies.map(company => ({
      ...company,
      name: company.name.trim(),
      url: normalizeWebsiteUrl(company.url),
    }));
    const submittedCompanies = normalizedCompanies.filter(company => company.name);
    const invalidSubmittedCompanies = submittedCompanies.filter(company => invalidCompareRowReason(company));
    const screenedRunKeys = readScreenedRunKeys();
    const unscreenedSubmittedCompanies = submittedCompanies.filter(company => !isScreenedCompany(company, screenedRunKeys));
    const hasInvalidTarget = submittedCompanies.length < 2
      || invalidSubmittedCompanies.length > 0
      || pendingForSubmit.length > 0;
    setCompanies(normalizedCompanies);
    if (hasInvalidTarget) {
      setManualQuickCompare(false);
      setInvalidCompareRows(invalidSubmittedCompanies);
      setError(
        pendingForSubmit.length > 0 || invalidSubmittedCompanies.length > 0
          ? COMPARE_READY_VALIDATION_MESSAGE
          : WEBSITE_URL_VALIDATION_MESSAGE,
      );
      setPhase('form');
      return;
    }
    if (unscreenedSubmittedCompanies.length > 0 && !forceManualQuickCompare) {
      setManualQuickCompare(false);
      setInvalidCompareRows([]);
      setError('These targets have not been individually screened yet. Screen the companies first for a stronger comparison.');
      setPhase('form');
      return;
    }

    // Reset progress
    const fresh: ProgressStage[] = PROGRESS_STEPS.map(label => ({ label, status: 'pending' }));
    setProgress(fresh);
    setResult(null);
    setError(null);
    setErrorDiagnostics(null);
    setInvalidCompareRows([]);
    setManualQuickCompare(unscreenedSubmittedCompanies.length > 0 || forceManualQuickCompare);
    setResultUsingScreenedCockpitTargets(submittedCompanies.some(company => (
      company.source === 'cockpit' && company.screeningStatus === 'screened'
    )));
    setPhase('loading');

    // Start API call with the strict compare contract.
    const comparePayload = normalizeComparePayload({
      buyer,
      buyerThesis,
      companies: submittedCompanies,
    });
    if (showCompareDebug()) {
      console.info('[compare] request payload', comparePayload);
    }
    let requestSettled = false;
    const apiPromise = compareCompanies(comparePayload).then(
      data => ({ data, error: null as Error | null }),
      err => ({ data: null as CompareResult | null, error: err instanceof Error ? err : new Error('Compare request failed.') }),
    ).finally(() => {
      requestSettled = true;
    });

    let activeProgressIndex = 0;
    const progressPromise = (async () => {
      const updated = [...fresh];
      for (let i = 0; i < updated.length; i++) {
        activeProgressIndex = i;
        updated[i] = { ...updated[i], status: 'running' };
        setProgress([...updated]);
        if (i === updated.length - 1) return;
        await new Promise<void>(r => setTimeout(r, 1200));
        if (requestSettled) return;
        updated[i] = { ...updated[i], status: 'completed' };
        setProgress([...updated]);
      }
    })();

    // Await API result (should already be resolved)
    let nextPhase: Phase = 'error';
    try {
      const { data: apiResult, error: apiError } = await apiPromise;
      if (apiError || !apiResult) throw apiError ?? new Error('Compare request failed.');
      await progressPromise;
      const safeResult: CompareResult = {
        ...apiResult,
        targets: Array.isArray(apiResult.targets) ? apiResult.targets : [],
      };
      if (safeResult.targets.length === 0 && (!Array.isArray(safeResult.company_results) || safeResult.company_results.length === 0)) {
        throw new Error('The backend compare endpoint did not return a usable comparison result.');
      }
      setProgress(PROGRESS_STEPS.map((label, index) => ({
        label,
        status: safeResult.partial_results && index === PROGRESS_STEPS.length - 1 ? 'partial' : 'completed',
      })));
      setResult(safeResult);
      // Save each target to local run history so the Deal Cockpit shows them
      try {
        if (safeResult.targets.length > 0) saveCompareRun(safeResult);
      } catch { /* storage not available */ }
      setSaveSource(safeResult.saved_to_cockpit ? 'backend' : 'local');
      nextPhase = 'result';
    } catch (err) {
      setProgress(PROGRESS_STEPS.map((label, index) => ({
        label,
        status: index < activeProgressIndex ? 'completed' : index === activeProgressIndex ? 'failed' : 'pending',
      })));
      if (err instanceof CompareRequestError) {
        console.warn('[compare] request failed', err.diagnostics);
        setError(err.status ? COMPARE_REQUEST_ERROR_MESSAGE : err.message || COMPARE_TIMEOUT_ERROR_MESSAGE);
        setErrorDiagnostics(err.diagnostics);
      } else {
        setError(err instanceof Error ? err.message : 'Compare request failed.');
        setErrorDiagnostics(null);
      }
      nextPhase = 'error';
    } finally {
      setPhase(nextPhase);
    }
  }

  function reset() {
    setPhase('form');
    setResult(null);
    setError(null);
    setErrorDiagnostics(null);
    setProgress(PROGRESS_STEPS.map(label => ({ label, status: 'pending' })));
    setManualQuickCompare(false);
    setResultUsingScreenedCockpitTargets(false);
  }

  const storedCompareCount = readCompareCandidates().length;
  const showBackToOrigination = hasStoredOriginationResult();
  const hasInvalidCompareItems = pendingCompareCandidates.length > 0 || invalidCompareRows.length > 0;
  const screenedRunKeys = readScreenedRunKeys();
  const populatedCompanies = companies.filter(company => company.name.trim());
  const unscreenedCompanies = populatedCompanies.filter(company => !isScreenedCompany(company, screenedRunKeys));
  const firstUnscreenedCompany = unscreenedCompanies[0];
  const hasUnscreenedCandidates = unscreenedCompanies.length > 0;
  const hasScreenedCandidates = populatedCompanies.length > 0 && unscreenedCompanies.length === 0;
  const hasScreenedCockpitCandidates = populatedCompanies.some(company => (
    company.source === 'cockpit' && company.screeningStatus === 'screened'
  ));
  const compareSubmitLabel = hasScreenedCandidates ? 'Compare screened candidates' : 'Review workflow guidance';

  const pageHeader = (
    <div className="w-full border-b border-border bg-card/30">
      <div className="app-container py-10">
        <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Target comparison</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
          Compare software acquisition targets.
        </h1>
        <p className="text-base text-muted-foreground">
          Compare works best with screened targets saved from Screen or Cockpit.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col w-full">
      {pageHeader}

      <div className="app-container flex-1 flex flex-col py-8">
        <ScreeningWorkflowGuide active="compare" className="mb-6" />

        {/* Beta notice */}
        <div className="mb-6 bg-primary/5 border border-primary/20 text-muted-foreground px-4 py-3 rounded-md flex items-center gap-3 text-sm">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">PRIVATE BETA</span>
          Public-source preview. Evidence checked. Gaps flagged.
        </div>

        {phase === 'form' && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Link href="/app/cockpit" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                Back to Cockpit
              </Link>
              {showBackToOrigination && (
                <Link href="/app/origination" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                  Back to Origination results
                </Link>
              )}
              <Link href="/app/run" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                Screen another company
              </Link>
            </div>

            <CompareTargetSelector
              screenedTargets={screenedTargets}
              needsScreeningTargets={needsScreeningTargets}
              selectedKeys={selectedSavedKeys}
              onToggle={handleToggleSavedTarget}
              onCompareSelected={handleCompareSelectedTargets}
              onRemove={handleRemoveSavedTarget}
              onSaveLead={handleSaveLeadTarget}
              onManualOpen={() => setManualFormOpen(true)}
            />

            <details
              open={manualFormOpen}
              onToggle={(event) => setManualFormOpen(event.currentTarget.open)}
              className="group rounded-lg border border-border bg-card/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Manual quick compare</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use this for a quick public-source preview. For stronger evidence, screen companies individually first.
                  </p>
                  {hasScreenedCandidates && (
                    <p className="mt-2 text-xs font-medium text-[var(--semantic-verified-text)]">
                      {hasScreenedCockpitCandidates ? 'Using screened Cockpit targets.' : 'Using screened candidates.'}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-border px-5 py-5">
                <div className="mb-5 flex flex-wrap gap-2">
                  {storedCompareCount > 0 && (
                    <button
                      type="button"
                      onClick={clearCompareSelection}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      Clear compare selection
                    </button>
                  )}
                </div>

                {hasUnscreenedCandidates && (
                  <div className="mb-6 rounded-lg border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-5 py-4">
                    <p className="text-sm font-semibold text-[var(--semantic-claim-text)] mb-1">
                      These targets have not been individually screened yet.
                    </p>
                    <p className="text-xs text-[var(--semantic-claim-text)]/90 mb-3">
                      Screen the companies first for a stronger comparison.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href="/app/run"
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Screen first company{firstUnscreenedCompany?.name ? `: ${firstUnscreenedCompany.name}` : ''}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        className="inline-flex items-center justify-center rounded-md border border-[var(--semantic-claim-border)] bg-background/70 px-3 py-1.5 text-xs font-semibold text-[var(--semantic-claim-text)] hover:bg-background transition-colors"
                      >
                        Manual quick compare
                      </button>
                    </div>
                  </div>
                )}

                {hasInvalidCompareItems && (
                  <div className="mb-6 rounded-lg border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-5 py-4">
                    <p className="text-sm font-semibold text-[var(--semantic-claim-text)] mb-1">
                      Some selected items are research sources or missing company websites.
                    </p>
                    <p className="text-xs text-[var(--semantic-claim-text)]/90 mb-3">
                      Remove them or confirm the company website before comparison.
                    </p>
                    <div className="space-y-2">
                      {pendingCompareCandidates.map(candidate => (
                        <div key={`${candidate.company_name}-${candidate.source_url || candidate.website}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[var(--semantic-claim-text)]">
                          <span>
                            {candidate.company_name || candidate.source_page_title || 'Pending lead'} · {candidate.source_url || candidate.website || 'Website missing'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePendingCompareCandidate(candidate)}
                            className="w-fit font-medium hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {invalidCompareRows.map((candidate, index) => (
                        <div key={`${candidate.name}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[var(--semantic-claim-text)]">
                          <span>
                            {candidate.name || 'Missing company name'} · {candidate.url || 'Website missing'} · {invalidCompareRowReason(candidate)}
                          </span>
                          <span className="text-[11px]">Edit the row below</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <CompareForm
                  buyer={buyer}             setBuyer={setBuyer}
                  buyerThesis={buyerThesis} setBuyerThesis={setBuyerThesis}
                  companies={companies}     setCompanies={setCompanies}
                  onRemoveStoredCandidate={handleRemoveStoredCandidate}
                  onSubmit={handleSubmit}
                  submitLabel={compareSubmitLabel}
                />
                {error && (
                  <div className="mt-4 rounded-md border border-[var(--semantic-claim-border)] bg-[var(--semantic-claim-bg)] px-4 py-3 text-sm text-[var(--semantic-claim-text)]">
                    {error}
                  </div>
                )}
              </div>
            </details>
          </>
        )}

        {phase === 'loading' && <CompareLoading stages={progress} manualQuickCompare={manualQuickCompare} />}

        {phase === 'result' && result && (
          <CompareResultView
            result={result}
            onReset={reset}
            saveSource={saveSource ?? 'local'}
            manualQuickCompare={manualQuickCompare}
            usingScreenedCockpitTargets={resultUsingScreenedCockpitTargets}
          />
        )}

          {phase === 'result' && !result && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Compare result unavailable.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The checklist completed without a usable result. Edit targets or screen companies individually first.
                  </p>
                </div>
              </div>
            </div>
          )}

        {phase === 'error' && (
          <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Compare request could not complete.</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {error || 'The backend compare endpoint did not return a usable response.'}
                </p>
                {errorDiagnostics && (
                  <details className="mt-4 rounded-md border border-border bg-background/70">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                      Developer diagnostics
                    </summary>
                    <div className="border-t border-border px-3 py-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Endpoint</p>
                        <p className="text-xs text-foreground break-all">{errorDiagnostics.endpoint}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Status</p>
                          <p className="text-xs text-foreground">{errorDiagnostics.status ?? 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Timeout / elapsed</p>
                          <p className="text-xs text-foreground">
                            {errorDiagnostics.timeout_ms ? `${errorDiagnostics.timeout_ms}ms` : 'Not set'}
                            {' · '}
                            {errorDiagnostics.elapsed_ms ? `${errorDiagnostics.elapsed_ms}ms elapsed` : 'elapsed unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Payload shape</p>
                          <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                            {formatDiagnostics(errorDiagnostics.request_payload_shape)}
                          </pre>
                        </div>
                      </div>
                      {errorDiagnostics.backend_validation_detail !== undefined && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Backend validation detail</p>
                          <pre className="max-h-56 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                            {formatDiagnostics(errorDiagnostics.backend_validation_detail)}
                          </pre>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Backend body</p>
                        <pre className="max-h-56 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                          {formatDiagnostics(errorDiagnostics.backend_body)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
                >
                  Edit targets
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <BetaCTA
        title="Want to test this on your own pipeline?"
        body="Screen a sample company, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Screen company"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="compare_targets_bottom"
      />
    </div>
  );
}

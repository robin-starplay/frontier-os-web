/**
 * DocumentReviewPanel
 *
 * Self-contained component for the document-assisted review prototype.
 * Embeddable in /app/evidence, /app/run, /app/exports.
 *
 * States: idle → uploading → result | error
 *
 * Safety copy rules enforced here:
 *  - Trust and temporary-processing caveats always visible
 *  - "Do not upload confidential information" always shown
 *  - Confirmation checkbox required before submit
 *  - Source attribution on every extracted item
 *  - No file content displayed in the result
 */

import React, { useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  FileText, Upload, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink, BookOpen, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { reviewDocument, type DocumentReviewResult } from '@/lib/documentReview';
import { saveDocumentRun } from '@/lib/runHistory';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

type ResultTab = 'claims' | 'metrics' | 'unknowns' | 'questions' | 'evidence' | 'limitations';

const RESULT_TABS: { id: ResultTab; label: string }[] = [
  { id: 'claims',      label: 'Claims' },
  { id: 'metrics',     label: 'Metrics' },
  { id: 'unknowns',    label: 'Unknowns' },
  { id: 'questions',   label: 'Questions' },
  { id: 'evidence',    label: 'Evidence cards' },
  { id: 'limitations', label: 'Limitations' },
];

const SOURCE_LABEL = 'Uploaded document · Status: Claim, not verified';

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBadge({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/40 border border-border rounded px-1.5 py-0.5">
      {label} · {count}
    </span>
  );
}

function SourceBadge() {
  return (
    <span className="inline-block text-[10px] font-mono text-muted-foreground/60 border border-border/60 rounded px-1.5 py-0.5 mt-1">
      Source: {SOURCE_LABEL}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DOC_CONTEXT_OPTIONS = [
  { value: '', label: 'Select document type (optional)' },
  { value: 'target_deck', label: 'Target company deck' },
  { value: 'buyer_profile', label: 'Buyer / acquirer profile' },
  { value: 'general_investment', label: 'General investment document' },
] as const;

type PanelState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'result'; data: DocumentReviewResult; fileName: string; saved: boolean }
  | { kind: 'error'; message: string; status?: number };

interface Props {
  /** When true, panel starts collapsed with a toggle. */
  collapsible?: boolean;
  /** When true, start expanded even if collapsible. */
  defaultExpanded?: boolean;
}

export function DocumentReviewPanel({ collapsible = false, defaultExpanded = false }: Props) {
  const [panelState,      setPanelState]      = useState<PanelState>({ kind: 'idle' });
  const [expanded,        setExpanded]        = useState(collapsible ? defaultExpanded : true);
  const [file,            setFile]            = useState<File | null>(null);
  const [fileError,       setFileError]       = useState('');
  const [companyName,     setCompanyName]     = useState('');
  const [website,         setWebsite]         = useState('');
  const [documentContext, setDocumentContext] = useState('');
  const [confirmed,       setConfirmed]       = useState(false);
  const [reviewDone,      setReviewDone]      = useState(false);
  const [activeTab,       setActiveTab]       = useState<ResultTab>('claims');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(f: File | null) {
    setFileError('');
    setFile(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setFileError('Document review currently supports PDF files only.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError('PDF must be 10MB or smaller for this prototype.');
      return;
    }
    setFile(f);
  }

  async function handleSubmit() {
    if (!file || !confirmed) return;

    setPanelState({ kind: 'uploading' });

    const outcome = await reviewDocument({
      file,
      companyName:     companyName.trim()     || undefined,
      website:         website.trim()         || undefined,
      documentContext: documentContext.trim() || undefined,
      saveToCockpit:   false,
    });

    if (!outcome.ok) {
      setPanelState({ kind: 'error', message: outcome.error, status: outcome.status });
      return;
    }

    setPanelState({ kind: 'result', data: outcome.data, fileName: file.name, saved: false });
    setActiveTab('claims');
    setReviewDone(true);
  }

  function handleReset() {
    setPanelState({ kind: 'idle' });
    setFile(null);
    setFileError('');
    setConfirmed(false);
    setCompanyName('');
    setWebsite('');
    setDocumentContext('');
  }

  function handleSaveToCockpit() {
    if (panelState.kind !== 'result') return;
    const { data, fileName } = panelState;
    saveDocumentRun({
      documentName:        fileName,
      companyName:         data.company_name || companyName.trim() || fileName.replace(/\.pdf$/i, ''),
      confidentiality_flag: data.confidentiality_flag,
      claims_count:        data.claims_extracted,
      metrics_count:       data.metrics_extracted,
      next_action:         data.recommended_next_action,
    });
    setPanelState({ ...panelState, saved: true });
  }

  // ── Header (always shown) ─────────────────────────────────────────────────

  const header = (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap',
        collapsible && 'cursor-pointer select-none',
      )}
      onClick={collapsible ? () => setExpanded(v => !v) : undefined}
    >
      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
      <p className="text-sm font-semibold text-foreground">Document-assisted review</p>
      <span className="text-[10px] font-mono border border-primary/30 text-primary/80 rounded px-1.5 py-0.5 bg-primary/5">
        Evidence-first screen
      </span>
      {collapsible && (
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      )}
    </div>
  );

  // ── Idle state (upload form) ──────────────────────────────────────────────

  const idleForm = (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Do not upload confidential information in this workspace.</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Upload one non-confidential PDF. Frontier OS extracts claims, metrics, unknowns
        and diligence questions.
      </p>
      <p className="text-[10px] text-muted-foreground/50">
        Temporary processing · Raw file not retained by default · Claims are not independently verified
      </p>
      <p className="text-[10px] text-muted-foreground/60 border border-border/40 rounded px-2 py-1.5 bg-muted/20">
        Free review includes one document review. More document reviews, saved evidence packs and
        IC-style exports are available in private beta.
      </p>

      {/* File picker */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'w-full flex flex-col items-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed transition-colors text-center',
            file
              ? 'border-primary/40 bg-primary/5'
              : 'border-border hover:border-primary/30 hover:bg-muted/20',
          )}
        >
          {file ? (
            <>
              <FileText className="w-6 h-6 text-primary" />
              <p className="text-xs font-medium text-foreground">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Click to select a PDF</p>
              <p className="text-[11px] text-muted-foreground/50">PDF only · max 10 MB · temporary processing · no retention by default</p>
            </>
          )}
        </button>
        {fileError && (
          <p className="mt-1.5 text-xs text-destructive">{fileError}</p>
        )}
      </div>

      {/* Optional metadata */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Document type <span className="text-muted-foreground/50">(optional)</span>
          </label>
          <select
            value={documentContext}
            onChange={e => setDocumentContext(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            {DOC_CONTEXT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Company name <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Cerillion plc"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Company website <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://www.cerillion.com"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
        />
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
          I confirm this document is non-confidential or approved for prototype review.
        </span>
      </label>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!file || !confirmed}
          onClick={handleSubmit}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-semibold transition-colors',
            file && confirmed
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Review PDF
        </button>
        <a
          href={BOOK_INTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
        >
          Book intro for confidential workflows <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );

  // ── Uploading state ───────────────────────────────────────────────────────

  const uploadingView = (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Extracting claims, metrics and diligence questions…</p>
      <p className="text-[11px] text-muted-foreground/50">This may take 20–60 seconds.</p>
    </div>
  );

  // ── Result state ──────────────────────────────────────────────────────────

  function resultView(data: DocumentReviewResult, fileName: string, saved: boolean) {
    const tabCount = (id: ResultTab) => {
      if (id === 'claims') return data.claims.length;
      if (id === 'metrics') return data.metrics.length;
      if (id === 'unknowns') return data.unknowns.length;
      if (id === 'questions') return data.diligence_questions.length;
      if (id === 'evidence') return data.evidence_cards.length;
      return data.limitations.length;
    };

    return (
      <div className="space-y-4">
        {/* Confidentiality warning — shown for flag OR warning string */}
        {(data.confidentiality_flag || data.confidentiality_warning) && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p>
                This document appears to contain confidentiality markings. Do not use the preview for
                confidential material unless a private pilot workspace has been agreed.
              </p>
              {data.confidentiality_warning && (
                <p className="mt-1 opacity-80">{data.confidentiality_warning}</p>
              )}
            </div>
          </div>
        )}

        {/* Top summary card */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Document review — prototype</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/60 truncate max-w-[140px]">{fileName}</span>
              {!reviewDone && (
                <button onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Pages processed',    value: String(data.pages_processed || '—') },
              { label: 'Confidentiality',    value: data.confidentiality_flag ? 'Flagged' : 'Not detected',
                extra: data.confidentiality_flag ? 'text-red-400' : 'text-green-400' },
              { label: 'Claims extracted',   value: String(data.claims_extracted) },
              { label: 'Metrics extracted',  value: String(data.metrics_extracted) },
              { label: 'Next action',        value: data.recommended_next_action },
            ].map(({ label, value, extra }) => (
              <div key={label}>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                <p className={cn('text-xs font-medium text-foreground leading-snug', extra)}>{value}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border bg-card/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Document summary</p>
            <p className="text-xs text-foreground leading-snug">{data.document_summary}</p>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-border overflow-x-auto">
            {RESULT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2.5 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label} <span className="text-muted-foreground/70">({tabCount(tab.id)})</span>
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-3">

            {/* Claims */}
            {activeTab === 'claims' && (
              data.claims.length === 0
                ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {data.metrics.length > 0
                      ? 'No non-metric claims extracted. Metric claims are shown under Metrics.'
                      : 'No claims extracted.'}
                  </p>
                )
                : data.claims.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card/30 px-4 py-3">
                    <p className="text-xs text-foreground leading-snug">{c.text}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <SectionBadge label={c.type || c.category || 'company claim'} count={1} />
                      <SectionBadge label={c.verification_status || 'not independently verified'} count={1} />
                    </div>
                    {c.page !== undefined && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Page {c.page}</p>
                    )}
                    <SourceBadge />
                  </div>
                ))
            )}

            {/* Metrics */}
            {activeTab === 'metrics' && (
              data.metrics.length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No metrics extracted.</p>
                : data.metrics.map((m, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card/30 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Company claim · Not independently verified
                      </p>
                      {m.page !== undefined && (
                        <p className="text-[10px] text-muted-foreground/60">Page {m.page}</p>
                      )}
                      <SourceBadge />
                    </div>
                    <span className="text-sm font-mono font-bold text-foreground shrink-0">{m.value}</span>
                  </div>
                ))
            )}

            {/* Unknowns */}
            {activeTab === 'unknowns' && (
              data.unknowns.length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No unknowns flagged.</p>
                : data.unknowns.map((u, i) => (
                  <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{u.field}</p>
                    {u.note && <p className="text-[11px] text-muted-foreground mt-1">{u.note}</p>}
                    <SourceBadge />
                  </div>
                ))
            )}

            {/* Diligence questions */}
            {activeTab === 'questions' && (
              data.diligence_questions.length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No diligence questions generated.</p>
                : data.diligence_questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card/30 px-4 py-3">
                    <span className="text-[10px] font-mono text-primary/60 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-xs text-foreground leading-snug">{q.question}</p>
                      {q.priority && (
                        <span className={cn(
                          'inline-block text-[10px] font-mono mt-1.5 px-1.5 py-0.5 rounded border',
                          q.priority === 'high'
                            ? 'text-red-400 border-red-500/20 bg-red-500/5'
                            : q.priority === 'medium'
                              ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                              : 'text-muted-foreground border-border bg-muted/20',
                        )}>
                          {q.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))
            )}

            {/* Evidence cards */}
            {activeTab === 'evidence' && (
              data.evidence_cards.length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No evidence cards extracted.</p>
                : data.evidence_cards.map((card, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card/30 px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">{card.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{card.content}</p>
                    <SourceBadge />
                  </div>
                ))
            )}

            {/* Limitations */}
            {activeTab === 'limitations' && (
              <div className="space-y-2">
                {(data.limitations.length === 0
                  ? [
                      'Extraction is based on a non-confidential prototype. No guarantee of completeness.',
                      'All extracted items are classified as claims — none have been independently verified.',
                      'Do not rely on this output for investment decisions without independent verification.',
                      'This is a prototype workflow. Outputs require human review before use in IC.',
                    ]
                  : data.limitations
                ).map((lim, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                    {lim}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            onClick={handleSaveToCockpit}
            disabled={saved}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors',
              saved
                ? 'border-green-500/30 text-green-400 bg-green-500/5 cursor-default'
                : 'border-border bg-background hover:bg-accent text-foreground',
            )}
          >
            {saved ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Saved to Cockpit</>
            ) : (
              'Save summary to Cockpit'
            )}
          </button>
          <Link
            href="/app/run"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
          >
            Run URL screen
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
          >
            Book intro <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* FOMO / private pilot upgrade card */}
        <div className="rounded-lg border border-border bg-card/50 p-5">
          <p className="text-sm font-semibold text-foreground mb-1.5">Need more document reviews?</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Private beta access includes multiple document reviews, saved evidence packs and IC-style
            exports. Confidential CIMs, management packs and financial models require a private pilot setup.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/request-pilot"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request private beta access
            </Link>
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
            >
              Book intro <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Trust reminder */}
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Temporary processing · Raw file not retained by default · Claims are not independently verified.
          This is not a secure data-room workflow. Confidential CIMs, financial models and management packs
          require a private pilot setup.{' '}
          <a href={BOOK_INTRO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">
            Book intro
          </a>.
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  function errorView(message: string, status?: number) {
    // Show the raw message for validation errors (PDF/file/size), otherwise
    // show the friendly fallback. Never show raw stack traces.
    const isValidationMsg =
      message?.toLowerCase().includes('pdf') ||
      message?.toLowerCase().includes('file') ||
      message?.toLowerCase().includes('size') ||
      message?.toLowerCase().includes('10 mb') ||
      message?.toLowerCase().includes('10mb');

    const friendlyMsg = isValidationMsg
      ? message
      : 'Document review is temporarily unavailable. Use website-only screening for now, or book an intro for private pilot access.';

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <p>{friendlyMsg}</p>
            {status != null && !isValidationMsg && (
              <p className="mt-1 opacity-70 font-mono">Status: {status}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
          >
            Try again
          </button>
          <Link
            href="/run"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
          >
            Run URL screen
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
          >
            Book intro <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-border bg-card/30 p-5 space-y-4">
      {header}

      {(!collapsible || expanded) && (
        <>
          {panelState.kind === 'idle'      && idleForm}
          {panelState.kind === 'uploading' && uploadingView}
          {panelState.kind === 'result'    && resultView(panelState.data, panelState.fileName, panelState.saved)}
          {panelState.kind === 'error'     && errorView(panelState.message, panelState.status)}
        </>
      )}
    </div>
  );
}

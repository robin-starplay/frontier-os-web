import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

type EvidenceStatus = 'Verified' | 'Caveated' | 'Candidate' | 'Blocking' | 'Diligence' | 'Unknown';
type ProcessStatus  = 'done' | 'warning' | 'pending';
type ImpactLevel    = 'green' | 'amber' | 'red' | 'muted' | 'blue';

// ─── data ─────────────────────────────────────────────────────────────────────

const PROCESS_STEPS: { label: string; status: ProcessStatus }[] = [
  { label: 'Entity resolved',           status: 'done' },
  { label: 'Sources ranked',            status: 'done' },
  { label: 'Financial evidence checked', status: 'done' },
  { label: 'Evidence registered',       status: 'warning' },
  { label: 'AI disruption assessed',    status: 'warning' },
  { label: 'Strategic fit assessed',    status: 'done' },
  { label: 'IC readiness assigned',     status: 'warning' },
];

const EVIDENCE_ROWS: { field: string; value: string; source: string; status: EvidenceStatus }[] = [
  { field: 'Revenue',              value: '—',             source: '—',             status: 'Unknown' },
  { field: 'Recurring revenue',    value: '—',             source: '—',             status: 'Unknown' },
  { field: 'Adjusted EBITDA',      value: '[illustrative]', source: 'Annual Report', status: 'Caveated' },
  { field: 'ARR',                  value: '—',             source: 'Not filed',     status: 'Blocking' },
  { field: 'AI module revenue',    value: '—',             source: 'Not disclosed', status: 'Diligence' },
  { field: 'Customer concentration', value: '—',           source: 'Mgmt pack',     status: 'Diligence' },
];

const IMPACT_ROWS: { label: string; value: string; level: ImpactLevel }[] = [
  { label: 'IC readiness',        value: 'Partial',          level: 'amber' },
  { label: 'Valuation readiness', value: 'Blocked',          level: 'red' },
  { label: 'Replica risk',        value: 'Medium-high',      level: 'amber' },
  { label: 'AI moat',             value: 'Unproven',         level: 'muted' },
  { label: 'Buyer fit',           value: 'Adjacent',         level: 'blue' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

const PROCESS_ICON: Record<ProcessStatus, React.ElementType> = {
  done:    CheckCircle2,
  warning: AlertCircle,
  pending: Clock,
};

const PROCESS_COLOR: Record<ProcessStatus, string> = {
  done:    'text-green-500',
  warning: 'text-amber-500',
  pending: 'text-muted-foreground',
};

const STATUS_CHIP: Record<EvidenceStatus, string> = {
  Verified:  'bg-green-500/10 text-green-700 border-green-500/20',
  Caveated:  'bg-amber-500/10 text-amber-700 border-amber-500/20',
  Candidate: 'bg-blue-500/10  text-blue-700  border-blue-500/20',
  Blocking:  'bg-red-500/10   text-red-700   border-red-500/20',
  Diligence: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  Unknown:   'bg-muted/30     text-muted-foreground border-border',
};

const IMPACT_COLOR: Record<string, string> = {
  green: 'text-green-700',
  amber: 'text-amber-700',
  red:   'text-red-700',
  blue:  'text-blue-700',
  muted: 'text-muted-foreground',
};

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2.5 border-b border-border bg-muted/20">
      <span className="text-[10px] font-semibold tracking-normal text-muted-foreground">{title}</span>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export function AnalysisCockpit() {
  const [analystMode, setAnalystMode] = useState(true);

  return (
    <div>
      {/* Analyst mode toggle */}
      <div className="flex items-center justify-end gap-3 mb-3">
        <span className="text-xs text-muted-foreground font-mono">Analyst mode</span>
        <button
          type="button"
          onClick={() => setAnalystMode((p) => !p)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${analystMode ? 'bg-primary' : 'bg-muted'}`}
          aria-label="Toggle analyst mode"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${analystMode ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
        {analystMode && (
          <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
            SOURCE · CONFIDENCE · CLASSIFICATION · NEXT ACTION
          </span>
        )}
      </div>

      {/* Three-column cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-lg border border-border overflow-hidden">

        {/* Left: Process timeline */}
        <div className="border-r border-border">
          <PanelHeader title="Process timeline" />
          <div className="divide-y divide-border/50">
            {PROCESS_STEPS.map(({ label, status }) => {
              const Icon = PROCESS_ICON[status];
              const color = PROCESS_COLOR[status];
              return (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                  <span className="text-xs text-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Evidence cards */}
        <div className="border-r border-border">
          <PanelHeader title="Evidence registry" />
          <div className="divide-y divide-border/50">
            {EVIDENCE_ROWS.map(({ field, value, source, status }) => (
              <div key={field} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{field}</span>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${STATUS_CHIP[status]}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-foreground">{value}</span>
                  {analystMode && (
                    <span className="text-[10px] text-muted-foreground">{source}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Decision impact */}
        <div>
          <PanelHeader title="Decision impact" />
          <div className="divide-y divide-border/50">
            {IMPACT_ROWS.map(({ label, value, level }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-xs font-semibold font-mono ${IMPACT_COLOR[level]}`}>{value}</span>
              </div>
            ))}
            <div className="px-4 py-4">
              <p className="text-[10px] text-muted-foreground font-semibold tracking-normal mb-1.5">Next action</p>
              <p className="text-xs text-foreground leading-snug">
                Request financials, ARR definition and product AI evidence before IC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

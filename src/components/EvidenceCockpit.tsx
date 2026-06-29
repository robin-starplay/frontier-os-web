import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceRow {
  field: string;
  value: string;
  source: string;
  status: 'verified' | 'caveated' | 'candidate' | 'diligence' | 'blocking' | 'unknown';
}

const EVIDENCE_ROWS: EvidenceRow[] = [
  { field: 'Revenue', value: '—', source: '—', status: 'unknown' },
  { field: 'Recurring revenue', value: '—', source: '—', status: 'unknown' },
  { field: 'Adjusted EBITDA', value: '[illustrative]', source: 'Annual Report', status: 'caveated' },
  { field: 'ARR', value: '—', source: 'Not disclosed', status: 'blocking' },
  { field: 'Top-5 customer concentration', value: '—', source: 'Management Pack', status: 'diligence' },
  { field: 'Ownership structure', value: 'Unknown', source: '—', status: 'blocking' },
];

const SOURCE_TIERS = [
  { tier: 1, label: 'Official filings', color: 'bg-green-500' },
  { tier: 2, label: 'Audited annual reports', color: 'bg-green-400' },
  { tier: 3, label: 'Uploaded diligence docs', color: 'bg-blue-500' },
  { tier: 4, label: 'Company website / press', color: 'bg-amber-500' },
  { tier: 5, label: 'Aggregators', color: 'bg-muted-foreground' },
];

const STATUS_CONFIG = {
  verified:   { label: 'Verified fact', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30', bar: 'bg-green-500' },
  caveated:   { label: 'Caveated',      icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', bar: 'bg-amber-500' },
  candidate:  { label: 'Candidate claim', icon: AlertTriangle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', bar: 'bg-blue-400' },
  diligence:  { label: 'Diligence item', icon: HelpCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', bar: 'bg-amber-400' },
  blocking:   { label: 'Blocking gap',  icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', bar: 'bg-red-500' },
  unknown:    { label: 'Unknown',       icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border', bar: 'bg-muted-foreground' },
};

const DECISION_IMPACT = [
  { label: 'IC readiness', value: 'Partially ready', color: 'text-amber-500' },
  { label: 'Valuation readiness', value: 'Financial evidence required', color: 'text-amber-500' },
  { label: 'Strategic fit confidence', value: 'Adjacent. Needs verification.', color: 'text-blue-400' },
  { label: 'Next best action', value: 'Request financials', color: 'text-foreground' },
];

export function EvidenceCockpit() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-6">
      {/* Left: Source Hierarchy Ladder */}
      <div className="rounded-lg bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Source hierarchy</h4>
        </div>
        <div className="space-y-2.5">
          {SOURCE_TIERS.map(({ tier, label, color }) => (
            <div key={tier} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 shrink-0">T{tier}</span>
              <div className={cn("h-2 w-2 rounded-full shrink-0", color)} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-4 pt-3 border-t border-border leading-tight">
          Higher tiers override lower tiers in conflict resolution.
        </p>
      </div>

      {/* Center: Evidence cards */}
      <div className="rounded-lg bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evidence registry</h4>
        </div>
        <div className="space-y-2">
          {EVIDENCE_ROWS.map((row) => {
            const cfg = STATUS_CONFIG[row.status];
            const Icon = cfg.icon;
            return (
              <div key={row.field} className={cn("flex items-start justify-between p-3 rounded border text-xs gap-3", cfg.bg)}>
                <div className="flex items-start gap-2 min-w-0">
                  <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.color)} />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{row.field}</p>
                    <p className="text-muted-foreground">{row.source}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-semibold text-foreground">{row.value}</p>
                  <p className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Decision impact */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Decision impact</h4>
        <div className="space-y-4">
          {DECISION_IMPACT.map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-sm font-semibold", color)}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Decision impact updates as evidence is verified and conflicts are resolved.
          </p>
        </div>
      </div>
    </div>
  );
}

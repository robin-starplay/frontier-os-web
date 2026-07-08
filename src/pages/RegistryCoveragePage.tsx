import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { BetaCTA } from '@/components/BetaCTA';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

type RegistryStatus = 'active' | 'connector' | 'manual' | 'planned';

interface Registry {
  jurisdiction: string;
  source: string;
  status: RegistryStatus;
  statusLabel: string;
  bestFor: string;
  uses: string[];
  limitations: string[];
  access: string;
  tier: number;
}

const REGISTRIES: Registry[] = [
  {
    jurisdiction: 'United Kingdom',
    source: 'Companies House',
    status: 'active',
    statusLabel: 'Active — v1',
    bestFor: 'Private UK companies — filings, accounts, director records.',
    uses: [
      'Company resolution and canonical entity identification',
      'Filed accounts extraction (revenue, EBITDA, balance sheet)',
      'Director and officer records',
      'Confirmation statements and share structure',
    ],
    limitations: ['Statutory accounts only — no management accounts or ARR disclosure', 'Filing lag of up to 9 months from period end'],
    access: 'Direct API — no authentication required for public filings',
    tier: 1,
  },
  {
    jurisdiction: 'United States',
    source: 'SEC EDGAR',
    status: 'connector',
    statusLabel: 'Connector — v1',
    bestFor: 'Public US companies — 10-K, 10-Q and 8-K filings.',
    uses: [
      'Public company resolution via CIK or ticker',
      '10-K, 10-Q and 8-K filing extraction',
      'Company facts API for structured financial data',
    ],
    limitations: ['Public companies only — private companies not covered', 'No private SaaS metrics or ARR disclosure in most filings'],
    access: 'Direct API — no authentication required. Rate limits apply.',
    tier: 1,
  },
  {
    jurisdiction: 'Germany',
    source: 'Unternehmensregister / Handelsregister',
    status: 'manual',
    statusLabel: 'Manual connector — v1',
    bestFor: 'Official search routing and filing lookup. Some access requires login or paid documents.',
    uses: [
      'Official company search routing',
      'Filing lookup guidance for GmbH and AG entities',
      'Trade register extract access (Handelsregisterauszug)',
    ],
    limitations: [
      'Direct API not publicly available — access routes through official portal',
      'Some documents require manual confirmation or paid download',
      'Full accounts not always filed for smaller entities',
    ],
    access: 'Manual routing via official portal. Paid documents may be required for full financials.',
    tier: 1,
  },
  {
    jurisdiction: 'France',
    source: 'Infogreffe / Registre du Commerce',
    status: 'planned',
    statusLabel: 'Planned',
    bestFor: 'French registered companies — planned coverage.',
    uses: [],
    limitations: [],
    access: 'Not yet implemented.',
    tier: 1,
  },
  {
    jurisdiction: 'Italy',
    source: 'Registro delle Imprese',
    status: 'planned',
    statusLabel: 'Planned',
    bestFor: 'Italian registered companies — planned coverage.',
    uses: [],
    limitations: [],
    access: 'Not yet implemented.',
    tier: 1,
  },
];

const STATUS_CONFIG: Record<RegistryStatus, { icon: React.ElementType; chip: string; iconColor: string }> = {
  active:    { icon: CheckCircle2, chip: 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',  iconColor: 'text-green-500' },
  connector: { icon: CheckCircle2, chip: 'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-[var(--semantic-info-border)]',   iconColor: 'text-blue-500' },
  manual:    { icon: AlertCircle,  chip: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',  iconColor: 'text-amber-500' },
  planned:   { icon: Clock,        chip: 'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',     iconColor: 'text-muted-foreground' },
};

export default function RegistryCoveragePage() {
  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>Registries</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            Official registry coverage.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-5">
            Registry coverage helps Frontier OS avoid treating weak web data as truth. Official filings outrank decks, websites and aggregator estimates. Where registry data is unavailable, that limitation is shown explicitly — not hidden.
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
            {(['active', 'connector', 'manual', 'planned'] as RegistryStatus[]).map((s) => {
              const { icon: Icon, iconColor } = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span>{s === 'active' ? 'Active' : s === 'connector' ? 'API connector' : s === 'manual' ? 'Manual connector' : 'Planned'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Registry cards */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-5">
        {REGISTRIES.map((reg) => {
          const { icon: Icon, chip, iconColor } = STATUS_CONFIG[reg.status];
          const isPlanned = reg.status === 'planned';
          return (
            <div key={reg.jurisdiction} className={`rounded-xl border bg-card overflow-hidden ${isPlanned ? 'border-border opacity-60' : 'border-border'}`}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-border bg-muted/10">
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${iconColor}`} />
                  <div>
                    <p className="text-base font-semibold text-foreground">{reg.jurisdiction}</p>
                    <p className="text-sm text-muted-foreground">{reg.source}</p>
                    {!isPlanned && (
                      <p className="text-sm text-foreground mt-1.5">{reg.bestFor}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-muted-foreground">Tier {reg.tier}</span>
                  <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded border ${chip}`}>
                    {reg.statusLabel}
                  </span>
                </div>
              </div>

              {!isPlanned && (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Uses */}
                  <div className="px-6 py-5">
                    <p className="text-[10px] font-semibold tracking-normal text-primary/60 mb-3">Used for</p>
                    <ul className="space-y-2">
                      {reg.uses.map((u, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-snug">{u}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Limitations */}
                  <div className="px-6 py-5">
                    <p className="text-[10px] font-semibold tracking-normal text-amber-500/60 mb-3">Limitations</p>
                    <ul className="space-y-2">
                      {reg.limitations.map((l, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground leading-snug">{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Access */}
                  <div className="px-6 py-5">
                    <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-3">Access</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{reg.access}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-8">
        <div className="rounded-lg border border-border bg-card/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Registry access varies by country. Missing registry data is shown as an evidence limitation, not hidden. Frontier OS does not claim unrestricted access to any registry.
          </p>
          <Link
            href="/evidence-workflow"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 shrink-0 transition-colors"
          >
            Evidence workflow <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <BetaCTA
        title="Want to test Frontier OS on your workflow?"
        body="Run a sample screen, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Run screen"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="registry_coverage_bottom"
      />
    </div>
  );
}

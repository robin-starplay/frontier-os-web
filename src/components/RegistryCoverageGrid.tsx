import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';

type RegistryStatus = 'active' | 'v1' | 'manual' | 'planned';

interface RegistryCapability {
  text: string;
}

interface RegistryLimitation {
  text: string;
}

interface Registry {
  country: string;
  flag: string;
  name: string;
  shortName: string;
  status: RegistryStatus;
  statusLabel: string;
  capabilities: RegistryCapability[];
  limitations?: RegistryLimitation[];
  note?: string;
}

const REGISTRIES: Registry[] = [
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    name: 'Companies House',
    shortName: 'UK',
    status: 'active',
    statusLabel: 'Active / v1',
    capabilities: [
      { text: 'Company entity resolution' },
      { text: 'Filed accounts extraction' },
      { text: 'Financial normalisation' },
      { text: 'Source hierarchy assignment (Tier 1)' },
    ],
  },
  {
    country: 'United States',
    flag: '🇺🇸',
    name: 'SEC EDGAR',
    shortName: 'US',
    status: 'v1',
    statusLabel: 'v1 connector',
    capabilities: [
      { text: 'Public company filings' },
      { text: 'CIK / ticker lookup' },
      { text: 'Company facts API' },
      { text: 'Filing links and periods' },
    ],
    limitations: [
      { text: 'Public companies only' },
      { text: 'Private company data limited' },
    ],
  },
  {
    country: 'Germany',
    flag: '🇩🇪',
    name: 'Unternehmensregister / Handelsregister',
    shortName: 'DE',
    status: 'manual',
    statusLabel: 'Manual connector v1',
    capabilities: [
      { text: 'Official search routing' },
      { text: 'Filing lookup guidance' },
      { text: 'Manual document evidence intake' },
    ],
    limitations: [
      { text: 'May require manual confirmation, login or paid document retrieval' },
      { text: 'No automated scraping' },
    ],
    note: 'Human-in-the-loop step required',
  },
  {
    country: 'France / Italy',
    flag: '🇫🇷 🇮🇹',
    name: 'Infogreffe / Registro delle Imprese',
    shortName: 'FR / IT',
    status: 'planned',
    statusLabel: 'Planned',
    capabilities: [
      { text: 'Registry routing mapping' },
      { text: 'Manual intake framework' },
    ],
    note: 'In design phase — not available for v1',
  },
];

const STATUS_CONFIG: Record<RegistryStatus, { color: string; icon: React.ElementType; bg: string }> = {
  active:  { color: 'text-green-500',  icon: CheckCircle2, bg: 'bg-green-500/10 border-green-500/30' },
  v1:      { color: 'text-blue-500',   icon: CheckCircle2, bg: 'bg-blue-500/10 border-blue-500/30' },
  manual:  { color: 'text-amber-500',  icon: AlertCircle,  bg: 'bg-amber-500/10 border-amber-500/30' },
  planned: { color: 'text-muted-foreground', icon: Clock,  bg: 'bg-muted/20 border-border' },
};

function RegistryCard({ registry }: { registry: Registry }) {
  const cfg = STATUS_CONFIG[registry.status];
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-lg border ${cfg.bg} p-5 flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{registry.flag}</span>
            <span className="text-sm font-mono font-bold text-foreground">{registry.shortName}</span>
          </div>
          <p className="text-xs font-semibold text-foreground">{registry.name}</p>
          <p className="text-xs text-muted-foreground">{registry.country}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded-full border shrink-0 ${cfg.color} ${cfg.bg}`}>
          <StatusIcon className="w-3 h-3" />
          {registry.statusLabel}
        </span>
      </div>

      {/* Capabilities */}
      <div>
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Capabilities</p>
        <ul className="space-y-1.5">
          {registry.capabilities.map((cap, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
              <span className="text-xs text-muted-foreground">{cap.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Limitations */}
      {registry.limitations && registry.limitations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Limitations</p>
          <ul className="space-y-1.5">
            {registry.limitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                <span className="text-xs text-muted-foreground">{lim.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Note */}
      {registry.note && (
        <p className="text-[10px] italic text-muted-foreground border-t border-border/50 pt-3">
          {registry.note}
        </p>
      )}
    </div>
  );
}

export function RegistryCoverageGrid() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {REGISTRIES.map((reg) => (
          <RegistryCard key={reg.shortName} registry={reg} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Registry connectors provide authoritative Tier 1 evidence. Coverage and access constraints vary by jurisdiction — see individual connector notes.
      </p>
    </div>
  );
}

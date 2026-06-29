import React from 'react';
import { BrainCircuit, ShieldAlert, Lock, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { AI_DISRUPTION_CARDS, type AICard, type EvidenceStatus } from '@/data/aiDisruptionData';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  blue:   { border: 'border-blue-500/30',   icon: 'bg-blue-500/10 text-blue-500',   badge: 'bg-blue-500/10 text-blue-400',   dot: 'bg-blue-500' },
  red:    { border: 'border-red-500/30',    icon: 'bg-red-500/10 text-red-500',     badge: 'bg-red-500/10 text-red-400',     dot: 'bg-red-500' },
  green:  { border: 'border-green-500/30',  icon: 'bg-green-500/10 text-green-500', badge: 'bg-green-500/10 text-green-400', dot: 'bg-green-500' },
  amber:  { border: 'border-amber-500/30',  icon: 'bg-amber-500/10 text-amber-500', badge: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-500' },
  purple: { border: 'border-purple-500/30', icon: 'bg-purple-500/10 text-purple-500', badge: 'bg-purple-500/10 text-purple-400', dot: 'bg-purple-500' },
};

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  Fact:       'bg-green-500/10 text-green-400',
  Claim:      'bg-amber-500/10 text-amber-400',
  Unknown:    'bg-muted/40 text-muted-foreground',
  Gap:        'bg-red-500/10 text-red-400',
};

const CARD_ICONS = [BrainCircuit, ShieldAlert, Lock, BarChart3, TrendingUp, HelpCircle];

// ─── row rendering ────────────────────────────────────────────────────────────

function CardRow({ label, value, status, accent }: { label: string; value?: string; status?: EvidenceStatus; accent: AICard['accent'] }) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-2">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      {status && (
        <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[status]}`}>
          {status.toUpperCase()}
        </span>
      )}
      {value && !status && (
        <span className="text-xs font-medium text-foreground shrink-0">{value}</span>
      )}
    </div>
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

function DisruptionCard({ card, icon: Icon }: { card: AICard; icon: React.ElementType }) {
  const cls = ACCENT_CLASSES[card.accent];
  return (
    <div className={`rounded-lg border ${cls.border} bg-card flex flex-col`}>
      <div className="p-4 border-b border-border/50">
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md mb-3 ${cls.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
        <p className="text-xs text-muted-foreground leading-snug">{card.subtitle}</p>
      </div>
      <div className="p-4 flex-1">
        {card.rows.map((row, i) => (
          <CardRow key={i} {...row} accent={card.accent} />
        ))}
      </div>
    </div>
  );
}

// ─── section ──────────────────────────────────────────────────────────────────

export function AIDisruptionSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {AI_DISRUPTION_CARDS.map((card, i) => (
        <DisruptionCard key={card.id} card={card} icon={CARD_ICONS[i]} />
      ))}
    </div>
  );
}

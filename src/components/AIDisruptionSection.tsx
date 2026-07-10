import React from 'react';
import { BrainCircuit, ShieldAlert, Lock, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { AI_DISRUPTION_CARDS, type AICard, type EvidenceStatus } from '@/data/aiDisruptionData';
import { semanticBadgeClass } from '@/components/SemanticBadge';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  blue:   { border: 'border-[var(--semantic-info-border)]',   icon: 'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)]',   badge: 'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border border-[var(--semantic-info-border)]',   dot: 'bg-blue-500' },
  red:    { border: 'border-[var(--semantic-blocker-border)]', icon: 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)]', badge: 'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border border-[var(--semantic-blocker-border)]', dot: 'bg-red-500' },
  green:  { border: 'border-[var(--semantic-verified-border)]',  icon: 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)]', badge: 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border border-[var(--semantic-verified-border)]', dot: 'bg-[var(--semantic-verified-text)]' },
  amber:  { border: 'border-[var(--semantic-claim-border)]',  icon: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)]', badge: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border border-[var(--semantic-claim-border)]', dot: 'bg-amber-500' },
  purple: { border: 'border-purple-500/30', icon: 'bg-purple-500/10 text-purple-500', badge: 'bg-purple-500/10 text-purple-400', dot: 'bg-purple-500' },
};

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  Fact:    'Verified public source',
  Claim:   'Company claim',
  Unknown: 'Unknown',
  Gap:     'Blocker',
};

const CARD_ICONS = [BrainCircuit, ShieldAlert, Lock, BarChart3, TrendingUp, HelpCircle];

// ─── row rendering ────────────────────────────────────────────────────────────

function CardRow({ label, value, status, accent }: { label: string; value?: string; status?: EvidenceStatus; accent: AICard['accent'] }) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-2">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      {status && (
        <span className={semanticBadgeClass(undefined, 'text-[10px] px-1.5 py-0.5 shrink-0', STATUS_LABELS[status])}>
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

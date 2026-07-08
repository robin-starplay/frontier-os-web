import React from 'react';
import { cn } from '@/lib/utils';

export type SemanticBadgeTone =
  | 'action'
  | 'partial'
  | 'blocker'
  | 'verified'
  | 'info'
  | 'unknown';

export type LegacyBadgeLevel = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'muted';

export const SEMANTIC_BADGE_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border px-[9px] py-[5px] text-xs font-semibold leading-none align-middle';

export const SEMANTIC_BADGE_TONE_CLASS: Record<SemanticBadgeTone, string> = {
  action:   'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  partial:  'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  blocker:  'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
  verified: 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',
  info:     'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-[var(--semantic-info-border)]',
  unknown:  'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
};

export const LEGACY_BADGE_LEVEL_TO_TONE: Record<LegacyBadgeLevel, SemanticBadgeTone> = {
  green: 'verified',
  amber: 'partial',
  red:   'blocker',
  blue:  'info',
  grey:  'unknown',
  muted: 'unknown',
};

export function semanticBadgeClass(toneOrLevel: SemanticBadgeTone | LegacyBadgeLevel, className?: string) {
  const tone = (toneOrLevel in LEGACY_BADGE_LEVEL_TO_TONE)
    ? LEGACY_BADGE_LEVEL_TO_TONE[toneOrLevel as LegacyBadgeLevel]
    : toneOrLevel as SemanticBadgeTone;
  return cn(SEMANTIC_BADGE_BASE, SEMANTIC_BADGE_TONE_CLASS[tone], className);
}

export function SemanticBadge({
  children,
  tone = 'info',
  className,
}: {
  children: React.ReactNode;
  tone?: SemanticBadgeTone | LegacyBadgeLevel;
  className?: string;
}) {
  return <span className={semanticBadgeClass(tone, className)}>{children}</span>;
}

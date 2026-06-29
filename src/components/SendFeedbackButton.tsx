import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FEEDBACK_EMAIL   = 'contact@getfrontieros.com';
export const FEEDBACK_SUBJECT = 'Frontier OS feedback';
export const FEEDBACK_BODY    = [
  'What felt useful?',
  '',
  '',
  'What felt unclear?',
  '',
  '',
  'Would this help in an investment/advisory workflow?',
  '',
  '',
  'What output would you need before sharing with an IC/client?',
  '',
  '',
].join('\n');

/** Returns the full mailto: href for the prefilled feedback email. */
export function getFeedbackMailto(): string {
  return (
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}` +
    `&body=${encodeURIComponent(FEEDBACK_BODY)}`
  );
}

interface SendFeedbackButtonProps {
  label?: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * Lightweight feedback CTA.
 * Opens the user's mail client with a pre-filled template.
 * Does not depend on any backend or modal state.
 */
export function SendFeedbackButton({
  label = 'Send feedback',
  showIcon = true,
  className,
}: SendFeedbackButtonProps) {
  return (
    <a
      href={getFeedbackMailto()}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
    >
      {showIcon && <MessageSquare className="w-3.5 h-3.5" />}
      {label}
    </a>
  );
}

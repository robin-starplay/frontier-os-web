import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Calendar } from 'lucide-react';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { cn } from '@/lib/utils';

function trackEvent(name?: string) {
  if (name) console.log('[analytics]', name);
}

interface BetaCTAProps {
  variant?: 'pageBottom' | 'compact' | 'sidebar';
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  calendarLabel?: string;
  /** Analytics event-name prefix — console.log placeholder */
  eventName?: string;
  className?: string;
}

const DEFAULT_CALENDAR_LABEL = 'Book a 30-minute intro';

// ─── compact ─────────────────────────────────────────────────────────────────

function CompactCTA({
  title, body,
  primaryLabel, primaryHref,
  calendarLabel = DEFAULT_CALENDAR_LABEL,
  eventName, className,
}: BetaCTAProps) {
  return (
    <div className={cn(
      'rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
      className,
    )}>
      <div>
        {title && <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>}
        {body && <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">{body}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {primaryHref && (
          <Link
            href={primaryHref}
            onClick={() => trackEvent(eventName ? `${eventName}_primary` : 'clicked_run_sample_screen')}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {primaryLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <a
          href={BOOK_INTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(eventName ? `${eventName}_calendar` : 'clicked_book_intro_page_bottom')}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-sm font-medium border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          {calendarLabel}
        </a>
      </div>
    </div>
  );
}

// ─── sidebar ──────────────────────────────────────────────────────────────────

function SidebarCTA({
  title, body,
  primaryLabel, primaryHref,
  calendarLabel = DEFAULT_CALENDAR_LABEL,
  eventName, className,
}: BetaCTAProps) {
  return (
    <div className={cn('rounded-lg border border-primary/20 bg-primary/5 p-5', className)}>
      {title && <p className="text-sm font-semibold text-foreground mb-1">{title}</p>}
      {body && <p className="text-xs text-muted-foreground leading-relaxed mb-4">{body}</p>}
      <div className="space-y-2">
        {primaryHref && (
          <Link
            href={primaryHref}
            onClick={() => trackEvent(eventName ? `${eventName}_primary` : 'clicked_run_sample_screen')}
            className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {primaryLabel}
          </Link>
        )}
        <a
          href={BOOK_INTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(eventName ? `${eventName}_calendar` : 'clicked_book_intro_page_bottom')}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          {calendarLabel}
        </a>
      </div>
    </div>
  );
}

// ─── pageBottom (default) ─────────────────────────────────────────────────────

function PageBottomCTA({
  title, body,
  primaryLabel, primaryHref,
  secondaryLabel, secondaryHref,
  calendarLabel = DEFAULT_CALENDAR_LABEL,
  eventName, className,
}: BetaCTAProps) {
  return (
    <div className={cn('w-full border-t border-border bg-card/30', className)}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            {title && <p className="text-xl font-bold text-foreground mb-2">{title}</p>}
            {body && <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>}
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {primaryHref && (
              <Link
                href={primaryHref}
                onClick={() => trackEvent(eventName ? `${eventName}_primary` : 'clicked_run_sample_screen')}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {primaryLabel} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {secondaryHref && secondaryLabel && (
              <Link
                href={secondaryHref}
                onClick={() => trackEvent(eventName ? `${eventName}_secondary` : 'clicked_request_private_beta')}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium border border-border hover:border-primary/40 text-foreground hover:text-primary transition-colors"
              >
                {secondaryLabel}
              </Link>
            )}
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent(eventName ? `${eventName}_calendar` : 'clicked_book_intro_page_bottom')}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              {calendarLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── public export ────────────────────────────────────────────────────────────

export function BetaCTA(props: BetaCTAProps) {
  const { variant = 'pageBottom' } = props;
  if (variant === 'compact')  return <CompactCTA {...props} />;
  if (variant === 'sidebar')  return <SidebarCTA {...props} />;
  return <PageBottomCTA {...props} />;
}

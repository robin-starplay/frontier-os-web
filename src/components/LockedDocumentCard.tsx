import React from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';

interface Props {
  /** When true, omits the secondary "Book an intro to discuss…" paragraph. */
  compact?: boolean;
  className?: string;
}

/**
 * Locked document-assisted review card.
 * Shows consistently across homepage, /app/run, /app/evidence, /app/exports,
 * /request-pilot and pricing.
 *
 * SPEC:
 *  - Title: Document-assisted review
 *  - Badge: Planned / locked
 *  - Do not show an active upload box.
 *  - Do not allow file selection.
 *  - Do not pretend documents were analysed.
 *  - Do not use the word "demo".
 */
export function LockedDocumentCard({ compact = false, className = '' }: Props) {
  return (
    <div className={`rounded-lg border border-border bg-card/30 p-5 space-y-3 ${className}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <p className="text-sm font-semibold text-foreground">Document-assisted review</p>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/70 border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
          Planned / locked
        </span>
      </div>

      {/* Body */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Document-assisted review is planned for private beta workflows, but is not enabled in this
        public-source preview. Use URL-only screening for now. Do not upload confidential
        information.
      </p>

      {/* Secondary copy */}
      {!compact && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Book an intro to discuss CIMs, pitch decks, management packs, financial models and
          evidence-retention requirements.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={BOOK_INTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Book intro <ExternalLink className="w-3 h-3" />
        </a>
        <Link
          href="/request-pilot"
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
        >
          Request private beta access
        </Link>
      </div>
    </div>
  );
}

import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BOOK_INTRO_URL = 'https://calendar.app.google/Xe1rJmP5mBd9MAyy8';

export type BookIntroVariant = 'primary' | 'outline' | 'ghost' | 'link';

interface BookIntroButtonProps {
  /** Analytics event label — logged to console as a placeholder (no real tracking yet) */
  eventName?: string;
  variant?: BookIntroVariant;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

const VARIANT_CLASSES: Record<BookIntroVariant, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-md transition-colors',
  outline:
    'inline-flex items-center justify-center gap-2 text-sm font-medium border border-border bg-background hover:bg-muted/20 h-10 px-5 rounded-md transition-colors text-foreground',
  ghost:
    'inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
  link:
    'inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2',
};

export function BookIntroButton({
  eventName,
  variant = 'outline',
  label = 'Book a 30-minute intro',
  className,
  showIcon = true,
}: BookIntroButtonProps) {
  function handleClick() {
    if (eventName) {
      // Analytics placeholder — no real tracking implemented yet
      console.log('[analytics]', eventName);
    }
  }

  return (
    <a
      href={BOOK_INTRO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(VARIANT_CLASSES[variant], className)}
    >
      {showIcon && <Calendar className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </a>
  );
}

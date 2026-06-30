import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Menu, X, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackModal } from './FeedbackModal';
import { SendFeedbackButton } from './SendFeedbackButton';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { getRuns } from '@/lib/runHistory';
import { OptionalUserButton } from '@/lib/optionalClerk';

// ── App nav items (all /app/* prefixed) ───────────────────────────────────────

const APP_NAV = [
  { label: 'Run',         href: '/app/run' },
  { label: 'Compare',     href: '/app/compare' },
  { label: 'Origination', href: '/app/origination' },
  { label: 'Cockpit',     href: '/app/cockpit' },
  { label: 'Evidence',    href: '/app/evidence' },
  { label: 'AI Risk',     href: '/app/ai-risk' },
  { label: 'Exports',     href: '/app/exports' },
];

// Primary app links — all /app/* prefixed.
// Secondary informational links (trust, pricing, faq) are intentionally included
// so signed-in users can access them without leaving the app shell.
const APP_MORE = [
  { label: 'Settings', href: '/app/settings' },
  { label: 'Trust',    href: '/trust' },
  { label: 'Pricing',  href: '/pricing' },
  { label: 'FAQ',      href: '/faq' },
];

// ── Trial usage badge ─────────────────────────────────────────────────────────

function TrialBadge() {
  const [used, setUsed] = useState(0);
  useEffect(() => {
    setUsed(getRuns().filter(r => r.type === 'url').length);
  }, []);
  const limit = 5;
  const remaining = Math.max(0, limit - used);
  const isLow = remaining <= 1;
  return (
    <span className={cn(
      'hidden lg:inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded-md border whitespace-nowrap',
      isLow
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-green-500/5 text-green-400/80 border-green-500/15',
    )}>
      {remaining}/{limit} screens left
    </span>
  );
}

// ── More dropdown ─────────────────────────────────────────────────────────────

function AppMoreDropdown({
  isActive,
  onFeedback,
}: {
  isActive: (href: string) => boolean;
  onFeedback: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const anyActive = APP_MORE.some(({ href }) => isActive(href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap',
          anyActive
            ? 'bg-accent/60 text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
        )}
      >
        More <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
          {APP_MORE.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className={cn(
                'block px-3 py-2 text-sm transition-colors',
                isActive(href)
                  ? 'text-foreground font-medium bg-accent/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
              )}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onFeedback(); }}
              role="menuitem"
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AppNavbar ─────────────────────────────────────────────────────────────────

export function AppNavbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const isActive = (href: string) =>
    location === href || location.startsWith(href + '/');

  return (
    <>
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto flex h-14 items-center px-4 md:px-8 gap-3">

          {/* Logo → cockpit */}
          <Link href="/app/cockpit" className="flex items-center gap-2 shrink-0">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm tracking-widest uppercase text-foreground">
              Frontier OS
            </span>
          </Link>

          {/* Desktop product nav */}
          <div className="hidden lg:flex items-center gap-0.5 ml-4">
            {APP_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-2 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap',
                  isActive(href)
                    ? 'bg-accent/60 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                )}
              >
                {label}
              </Link>
            ))}
            <AppMoreDropdown
              isActive={isActive}
              onFeedback={() => setFeedbackOpen(true)}
            />
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <TrialBadge />
            <SendFeedbackButton
              label="Feedback"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 h-8 px-3 rounded-md transition-colors whitespace-nowrap"
            />
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 h-8 px-3 rounded-md transition-colors whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" />
              Intro
            </a>
            <div className="flex items-center">
              <OptionalUserButton />
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-3">
            <div className="space-y-0.5 mb-3">
              {[...APP_NAV, ...APP_MORE].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'block px-3 py-2.5 rounded-md text-sm transition-colors',
                    isActive(href)
                      ? 'bg-accent/60 text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="pt-3 flex flex-col gap-2 border-t border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <OptionalUserButton />
                <a
                  href={BOOK_INTRO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border h-8 px-3 rounded-md"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Intro
                </a>
              </div>
              <button
                onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-accent/40 transition-colors"
              >
                Feedback
              </button>
            </div>
          </div>
        )}
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

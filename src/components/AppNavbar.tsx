import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Menu, X, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackModal } from './FeedbackModal';
import { ThemeToggle } from './ThemeToggle';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { OptionalUserButton } from '@/lib/optionalClerk';
import {
  HEADER_ICON_CONTROL_CLASS,
  HEADER_NAV_ACTIVE_CLASS,
  HEADER_NAV_INACTIVE_CLASS,
  HEADER_NAV_ITEM_CLASS,
} from './headerStyles';

// ── App nav items (all /app/* prefixed) ───────────────────────────────────────

const APP_NAV = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Origination', href: '/app/origination' },
  { label: 'Screen',      href: '/app/run' },
  { label: 'Cockpit',     href: '/app/cockpit' },
  { label: 'Compare',     href: '/app/compare' },
  { label: 'Pricing',     href: '/pricing' },
  { label: 'AI risk',     href: '/app/ai-risk' },
  { label: 'Trust',       href: '/trust' },
];

// Primary app links — all /app/* prefixed.
// Secondary informational links (trust, pricing, faq) are intentionally included
// so signed-in users can access them without leaving the app shell.
const APP_MORE = [
  { label: 'Request pilot',     href: '/request-pilot' },
  { label: 'Book intro',        href: BOOK_INTRO_URL, external: true },
  { label: 'Workspace',         href: '/app/settings' },
  { label: 'Exports',           href: '/app/exports' },
  { label: 'Evidence workflow', href: '/app/evidence' },
  { label: 'FAQ',               href: '/faq' },
];

const APP_MOBILE_PRIMARY = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Origination', href: '/app/origination' },
  { label: 'Screen',      href: '/app/run' },
  { label: 'Cockpit',     href: '/app/cockpit' },
];

const APP_MOBILE_MORE = [
  {
    label: 'Workflow',
    links: [
      { label: 'Compare', href: '/app/compare' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'AI risk', href: '/app/ai-risk' },
      { label: 'Trust',   href: '/trust' },
    ],
  },
  {
    label: 'Commercial',
    links: [
      { label: 'Request pilot', href: '/request-pilot' },
    ],
  },
  {
    label: 'Support',
    links: [],
  },
];

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
        data-header-nav-item
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          `${HEADER_NAV_ITEM_CLASS} gap-1`,
          anyActive
            ? HEADER_NAV_ACTIVE_CLASS
            : HEADER_NAV_INACTIVE_CLASS,
        )}
      >
        More <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
          {APP_MORE.map(({ label, href, external }) => (
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="block px-3 py-2 text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ) : (
              <Link
                data-header-nav-item
                key={href}
                href={href}
                role="menuitem"
                className={cn(
                  'block px-3 py-2 text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] transition-colors',
                  isActive(href)
                    ? 'text-primary font-semibold bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/70',
                )}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            )
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onFeedback(); }}
              role="menuitem"
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
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
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 sticky top-0 z-50">
        <div className="app-container flex h-16 items-center gap-3">

          {/* Logo → cockpit */}
          <Link href="/app/cockpit" className="flex items-center gap-2 shrink-0">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold leading-tight tracking-normal text-foreground">
              Frontier OS
            </span>
          </Link>

          {/* Desktop product nav */}
          <div className="ml-7 hidden min-w-0 items-center gap-1 xl:flex">
            {APP_NAV.map(({ label, href }) => (
              <Link
                data-header-nav-item
                key={href}
                href={href}
                className={cn(
                  HEADER_NAV_ITEM_CLASS,
                  isActive(href)
                    ? HEADER_NAV_ACTIVE_CLASS
                    : HEADER_NAV_INACTIVE_CLASS,
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

          <div className="ml-7 hidden min-w-0 items-center gap-1 lg:flex xl:hidden">
            {APP_NAV.filter(({ label }) => ['Origination', 'Screen', 'Cockpit', 'Compare'].includes(label)).map(({ label, href }) => (
              <Link data-header-nav-item key={href} href={href} className={cn(HEADER_NAV_ITEM_CLASS, isActive(href) ? HEADER_NAV_ACTIVE_CLASS : HEADER_NAV_INACTIVE_CLASS)}>
                {label}
              </Link>
            ))}
            <AppMoreDropdown isActive={isActive} onFeedback={() => setFeedbackOpen(true)} />
          </div>

          {/* Right side */}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <ThemeToggle compact className={cn('hidden sm:inline-flex', HEADER_ICON_CONTROL_CLASS)} />
            <div className="flex items-center">
              <OptionalUserButton />
            </div>

            {/* Mobile hamburger */}
            <button
              className={cn(HEADER_ICON_CONTROL_CLASS, 'rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground lg:hidden')}
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {APP_MOBILE_PRIMARY.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex min-h-11 items-center justify-center rounded-md px-3 text-[var(--font-size-nav)] font-semibold leading-[var(--line-height-compact)] transition-colors',
                    isActive(href)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/70',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div
                className={cn(
                  'flex min-h-11 items-center justify-center rounded-md px-3 text-[var(--font-size-nav)] font-semibold',
                  APP_MOBILE_MORE.some(group => group.links.some(({ href }) => isActive(href)))
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/40 text-foreground',
                )}
              >
                More
              </div>
            </div>

            <div className="space-y-4 mb-3">
              {APP_MOBILE_MORE.map(group => (
                <div key={group.label}>
                  <p className="px-3 pb-1 text-[11px] font-semibold text-muted-foreground">{group.label}</p>
                  <div className="space-y-1">
                    {group.links.map(({ label, href }) => (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          'flex min-h-11 items-center rounded-md px-3 text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] transition-colors',
                          isActive(href)
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/70',
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </Link>
                    ))}
                    {group.label === 'Commercial' && (
                      <a
                        href={BOOK_INTRO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-11 items-center gap-2 rounded-md px-3 text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Book intro
                      </a>
                    )}
                    {group.label === 'Support' && (
                      <button
                        onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
                        className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
                      >
                        Feedback
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 flex flex-col gap-2 border-t border-border">
              <ThemeToggle className="w-fit" />
              <div className="flex items-center gap-3 flex-wrap">
                <OptionalUserButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

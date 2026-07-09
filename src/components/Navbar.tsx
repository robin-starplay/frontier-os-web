import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Menu, X, MessageSquare, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackModal } from './FeedbackModal';
import { ThemeToggle } from './ThemeToggle';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { clerkEnabled, OptionalUserButton, useOptionalUser } from '@/lib/optionalClerk';
import { hasLocalWorkspaceSession } from '@/lib/trialAccount';

// ── Public nav ────────────────────────────────────────────────────────────────
// Always shown on public pages regardless of auth state.
// Signed-in users in /app/* use AppNavbar instead.

const PUBLIC_NAV = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Origination', href: '/app/origination' },
  { label: 'Run',         href: '/app/run' },
  { label: 'Cockpit',     href: '/app/cockpit' },
  { label: 'Compare',     href: '/app/compare' },
  { label: 'Pricing',     href: '/pricing' },
  { label: 'AI risk',     href: '/app/ai-risk' },
  { label: 'Trust',       href: '/trust' },
];

const PUBLIC_MORE = [
  { label: 'Request pilot',        href: '/request-pilot' },
  { label: 'Book intro',           href: BOOK_INTRO_URL, external: true },
  { label: 'Product',              href: '/product' },
  { label: 'Registry coverage',    href: '/registry-coverage' },
  { label: 'Evidence workflow',    href: '/evidence' },
  { label: 'Exports · team beta',   href: '/app/exports' },
  { label: 'FAQ',                  href: '/faq' },
  { label: 'Private Equity',        href: '/private-equity' },
  { label: 'Software Roll-ups',     href: '/software-rollups' },
  { label: 'Corporate Development', href: '/corporate-development' },
  { label: 'Search Funds',          href: '/search-funds' },
  { label: 'Founders',              href: '/founders' },
  { label: 'VC / Growth',           href: '/vc-growth' },
];

const PUBLIC_MOBILE_PRIMARY = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Origination', href: '/app/origination' },
  { label: 'Run',         href: '/app/run' },
  { label: 'Cockpit',     href: '/app/cockpit' },
];

const PUBLIC_MOBILE_MORE = [
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

const PUBLIC_MOBILE_MORE_LINKS = PUBLIC_MOBILE_MORE.flatMap(group => group.links);

function getLocalRunCount(): number {
  try {
    const raw = localStorage.getItem('fos_run_history');
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// ── More dropdown ─────────────────────────────────────────────────────────────

function MoreDropdown({
  items,
  isActive,
  onFeedback,
}: {
  items: { label: string; href: string; external?: boolean }[];
  isActive: (href: string) => boolean;
  onFeedback: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const anyActive = items.some(({ href }) => isActive(href));

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
          'flex items-center gap-1 px-2 py-1.5 rounded-md text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] transition-colors whitespace-nowrap',
          anyActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/70',
        )}
      >
        More <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
          {items.map(({ label, href, external }) => (
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
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Navbar component ──────────────────────────────────────────────────────
// Renders the public navigation. Shown on all routes outside /app/*.
// Signed-in users visiting public pages see "Open app" + UserButton on the right.

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { isLoaded, isSignedIn } = useOptionalUser();
  const [hasLocalWorkspace, setHasLocalWorkspace] = useState(() => hasLocalWorkspaceSession());
  const [runCount, setRunCount] = useState(0);

  useEffect(() => {
    function refreshWorkspaceState() {
      setHasLocalWorkspace(hasLocalWorkspaceSession());
      try {
        setRunCount(getLocalRunCount());
      } catch {
        setRunCount(0);
      }
    }
    refreshWorkspaceState();
    window.addEventListener('storage', refreshWorkspaceState);
    window.addEventListener('focus', refreshWorkspaceState);
    return () => {
      window.removeEventListener('storage', refreshWorkspaceState);
      window.removeEventListener('focus', refreshWorkspaceState);
    };
  }, []);

  const hasWorkspace = isSignedIn || hasLocalWorkspace;
  const workspaceHref = runCount > 0 ? '/app/cockpit' : '/app/run';

  const isActive = (href: string) =>
    href === '/' ? location === '/' : location.startsWith(href);

  return (
    <>
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="app-container flex h-14 items-center gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm tracking-normal text-foreground">
              Frontier OS
            </span>
          </Link>

          {/* Desktop public nav — always the same set */}
          <div className="hidden lg:flex items-center gap-0.5 ml-4">
            {PUBLIC_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-2 py-1.5 rounded-md text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] transition-colors whitespace-nowrap',
                  isActive(href)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/70',
                )}
              >
                {label}
              </Link>
            ))}
            <MoreDropdown
              items={PUBLIC_MORE}
              isActive={isActive}
              onFeedback={() => setFeedbackOpen(true)}
            />
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle compact className="hidden sm:inline-flex" />

            {!isLoaded && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                BETA
              </span>
            )}

            {isLoaded && hasWorkspace && (
              /* Signed-in or local reviewer workspace on a public page — return to workspace */
              <>
                <Link
                  href={workspaceHref}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 text-[var(--font-size-nav)] font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors whitespace-nowrap"
                >
                  Open workspace
                </Link>
                <div className="flex items-center">
                  <OptionalUserButton />
                </div>
              </>
            )}

            {isLoaded && !hasWorkspace && (
              /* Public / signed-out right rail */
              <>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  BETA
                </span>
                <a
                  href={BOOK_INTRO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:inline-flex items-center gap-1.5 text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 h-8 px-3 rounded-md transition-colors whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Intro
                </a>
                <Link
                  href={clerkEnabled ? '/sign-in' : '/create-workspace'}
                  className="hidden sm:inline-flex items-center justify-center text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 h-8 px-3 rounded-md transition-colors"
                >
                  {clerkEnabled ? 'Sign in' : 'Beta workspace'}
                </Link>
                <Link
                  href={clerkEnabled ? '/run?mode=sample' : '/create-workspace'}
                  className="hidden sm:inline-flex items-center justify-center text-[var(--font-size-nav)] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors whitespace-nowrap"
                >
                  {clerkEnabled ? 'Run screen' : 'Start free'}
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
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
              {PUBLIC_MOBILE_PRIMARY.map(({ label, href }) => (
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
                  PUBLIC_MOBILE_MORE_LINKS.some(({ href }) => isActive(href))
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/40 text-foreground',
                )}
              >
                More
              </div>
            </div>

            <div className="space-y-4 mb-3">
              {PUBLIC_MOBILE_MORE.map(group => (
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
                        className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-[var(--font-size-nav)] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Feedback
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Auth section */}
            <div className="pt-3 flex flex-col gap-2 border-t border-border">
              <ThemeToggle className="w-fit" />
              {isLoaded && hasWorkspace ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <OptionalUserButton />
                  <Link
                    href={workspaceHref}
                    className="inline-flex items-center justify-center text-[var(--font-size-nav)] font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Open workspace
                  </Link>
                </div>
              ) : isLoaded && !hasWorkspace ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                      BETA
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={clerkEnabled ? '/sign-in' : '/create-workspace'}
                      className="inline-flex items-center justify-center text-[var(--font-size-nav)] font-medium text-muted-foreground border border-border h-8 px-3 rounded-md"
                      onClick={() => setMobileOpen(false)}
                    >
                      {clerkEnabled ? 'Sign in' : 'Beta workspace'}
                    </Link>
                    <Link
                      href={clerkEnabled ? '/sign-up' : '/create-workspace'}
                      className="inline-flex items-center justify-center text-[var(--font-size-nav)] font-medium border border-border h-8 px-3 rounded-md hover:bg-accent/70 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {clerkEnabled ? 'Create account' : 'Create workspace'}
                    </Link>
                    <Link
                      href={clerkEnabled ? '/run?mode=sample' : '/create-workspace'}
                      className="inline-flex items-center justify-center text-[var(--font-size-nav)] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 rounded-md transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {clerkEnabled ? 'Run screen' : 'Start free'}
                    </Link>
                  </div>
                </>
              ) : null}

            </div>
          </div>
        )}
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

import React, { useState } from 'react';
// useSignIn from the legacy entry-point gives the classic { signIn, isLoaded, setActive }
// API with authenticateWithRedirect — the new v6 signal-based useSignIn lacks these.
import { useSignIn } from '@clerk/react/legacy';

// Clerk OAuth strategies used here: oauth_google, oauth_microsoft, oauth_linkedin_oidc
type Strategy = 'oauth_google' | 'oauth_microsoft' | 'oauth_linkedin_oidc';

// ── Inline SVG provider icons ─────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ── OAuthButtons ──────────────────────────────────────────────────────────────

interface ProviderConfig {
  strategy: Strategy;
  label: string;
  Icon: () => React.ReactElement;
}

const PROVIDERS: ProviderConfig[] = [
  { strategy: 'oauth_google',        label: 'Continue with Google',    Icon: GoogleIcon    },
  { strategy: 'oauth_microsoft',     label: 'Continue with Microsoft', Icon: MicrosoftIcon },
  { strategy: 'oauth_linkedin_oidc', label: 'Continue with LinkedIn',  Icon: LinkedInIcon  },
];

// Per-provider label shown to the user when that provider is not configured.
const COMING_SOON_LABEL: Record<Strategy, string> = {
  oauth_google:        'Google sign-up is coming soon. Use email sign-up or book a 30-minute intro.',
  oauth_microsoft:     'Microsoft sign-up is coming soon. Use email sign-up or book a 30-minute intro.',
  oauth_linkedin_oidc: 'LinkedIn sign-up is coming soon. Use email sign-up or book a 30-minute intro.',
};

interface OAuthButtonsProps {
  /** Where to navigate after a successful OAuth sign-in or sign-up. */
  redirectUrlComplete?: string;
}

/**
 * Renders real Clerk OAuth redirect buttons for Google, Microsoft, and LinkedIn.
 * Uses useSignIn — Clerk automatically handles account creation for new users
 * arriving via the sign-in OAuth flow.
 *
 * When a provider is not yet configured in Clerk, the button is disabled and
 * shows an inline "coming soon" message. No dead buttons, no fake auth.
 */
export function OAuthButtons({ redirectUrlComplete }: OAuthButtonsProps) {
  const { signIn, isLoaded } = useSignIn();

  // Strategy currently in flight (spinner shown)
  const [active, setActive] = useState<Strategy | null>(null);

  // Per-provider error — set when authenticateWithRedirect throws (provider not configured).
  // Once set, the button is permanently disabled with a "coming soon" notice.
  const [errors, setErrors] = useState<Partial<Record<Strategy, string>>>({});

  async function startOAuth(strategy: Strategy) {
    if (!isLoaded || !signIn || active !== null || errors[strategy]) return;
    setActive(strategy);
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        // Clerk resolves the SSO callback at the current route path + /sso-callback
        redirectUrl:         `${window.location.origin}${window.location.pathname.replace(/\/?$/, '')}/sso-callback`,
        redirectUrlComplete: redirectUrlComplete ?? window.location.origin,
      });
      // If authenticateWithRedirect resolves without throwing, the browser is
      // already navigating — no cleanup needed.
    } catch (err) {
      // Provider not configured or network error — show inline "coming soon"
      // message instead of silently re-enabling the button.
      console.info('[OAuthButtons] SSO redirect failed for', strategy, err);
      setErrors((prev) => ({ ...prev, [strategy]: COMING_SOON_LABEL[strategy] }));
      setActive(null);
    }
  }

  // Whether ANY provider produced an error (used to show the shared fallback block)
  const anyError = Object.keys(errors).length > 0;

  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map(({ strategy, label, Icon }) => {
        const comingSoonMsg = errors[strategy];
        const isDisabled = !isLoaded || active !== null || Boolean(comingSoonMsg);
        const isSpinning  = active === strategy;

        return (
          <div key={strategy} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => startOAuth(strategy)}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-label={comingSoonMsg ? `${label}: ${comingSoonMsg}` : label}
              className={[
                'w-full flex items-center justify-center gap-3 h-10 px-4 rounded-md border',
                'border-[hsl(222,20%,22%)] bg-[hsl(222,30%,14%)]',
                'text-[hsl(210,40%,98%)] text-sm font-medium transition-colors',
                comingSoonMsg
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-[hsl(222,30%,18%)] disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {isSpinning ? (
                <span
                  className="w-4 h-4 rounded-full border-2 border-[hsl(210,40%,98%)] border-t-transparent animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Icon />
              )}
              {comingSoonMsg ? `${label.replace('Continue', 'Coming soon:')}` : label}
            </button>

            {/* Inline per-provider notice — visible only after a failed redirect */}
            {comingSoonMsg && (
              <p
                role="status"
                className="text-xs text-[hsl(215,20%,55%)] px-1"
              >
                {comingSoonMsg}
              </p>
            )}
          </div>
        );
      })}

      {/* Shared fallback block — shown once any provider fails */}
      {anyError && (
        <div className="mt-3 rounded-md border border-[hsl(222,20%,22%)] bg-[hsl(222,35%,12%)] px-4 py-3 flex flex-col gap-2.5">
          <p className="text-xs text-[hsl(215,20%,55%)] leading-relaxed">
            SSO is being configured for private beta. You can request access
            with email or book a 30-minute intro.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="/request-pilot"
              className="w-full flex items-center justify-center h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[hsl(222,35%,12%)]"
            >
              Request private beta access
            </a>
            <a
              href="https://calendar.app.google/Xe1rJmP5mBd9MAyy8"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center h-9 px-4 rounded-md border border-[hsl(222,20%,25%)] hover:bg-[hsl(222,30%,18%)] text-[hsl(210,40%,98%)] text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(215,70%,50%)] focus:ring-offset-2 focus:ring-offset-[hsl(222,35%,12%)]"
            >
              Book a 30-minute intro
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { ensureTrialAccount, createBackendAccount } from '@/lib/trialAccount';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';

// ── Profile storage ───────────────────────────────────────────────────────────
// Persists the reviewer's basic info so we can pass it to the backend account
// call and have it available in the app for personalisation.

const PROFILE_KEY = 'fos_profile';

function saveProfile(
  name: string,
  email: string,
  org: string,
  role: string,
): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, email, org, role }));
  } catch { /* storage quota */ }
}

// ── Role suggestions ──────────────────────────────────────────────────────────

const ROLE_SUGGESTIONS = [
  'Investment Director',
  'VP Corporate Development',
  'Deal Analyst',
  'Operating Partner',
  'Managing Director',
  'Portfolio Manager',
  'Founder / CEO',
  'Other',
];

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  id, label, type = 'text', value, onChange, placeholder, required = true,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-foreground mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'email' ? 'email' : 'off'}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkspaceCreationPage() {
  const [, setLocation] = useLocation();

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [org,       setOrg]       = useState('');
  const [role,      setRole]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // 1. Persist profile
    saveProfile(name, email, org, role);

    // 2. Create local trial account (idempotent)
    ensureTrialAccount();

    // 3. Attempt backend provisioning — non-blocking on failure
    const buyerThesis = [org, role].filter(Boolean).join(' · ');
    try {
      await createBackendAccount(name || email, buyerThesis);
    } catch {
      // Local workspace is sufficient — never block on backend failure
    }

    setLoading(false);
    // Show onboarding guide before redirect
    setShowGuide(true);
  }

  // ── Onboarding guide (shown after workspace creation) ───────────────────────
  if (showGuide) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
              Workspace created
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Try Frontier OS in 3 minutes
            </h1>
            <p className="text-sm text-muted-foreground">
              {name ? `Welcome, ${name.split(' ')[0]}. ` : ''}
              Run a sample acquisition screen to see the workflow before using your own target.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
            {[
              { n: '1', label: 'Run sample screen', desc: 'Review the sample acquisition screen before using your own target.' },
              { n: '2', label: 'Compare with Checkit', desc: 'Add a second target and rank them side-by-side in the Compare view.' },
              { n: '3', label: 'Open Deal Cockpit', desc: 'See both targets saved to your private Cockpit with IC readiness scores.' },
              { n: '4', label: 'Send feedback', desc: 'Use the Feedback button to tell us what you think.' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-4">
                <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/app/run"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors w-full"
            >
              Run sample screen
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex gap-2">
              <Link
                href="/app/run"
                className="flex-1 inline-flex items-center justify-center text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground"
              >
                Run screen
              </Link>
              <a
                href={BOOK_INTRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 rounded-md transition-colors text-foreground"
              >
                Book intro <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-3">
            Private beta · free access
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Create private beta workspace
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No payment required. Public-source screening only.<br />
            Do not upload confidential information.
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">

            <Field
              id="ws-name"
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Your name"
            />

            <Field
              id="ws-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@firm.com"
            />

            <Field
              id="ws-org"
              label="Organisation"
              value={org}
              onChange={setOrg}
              placeholder="e.g. Acme Capital"
            />

            {/* Role — free text with datalist suggestions */}
            <div>
              <label htmlFor="ws-role" className="block text-xs font-medium text-foreground mb-1.5">
                Role
              </label>
              <input
                id="ws-role"
                type="text"
                required
                list="role-suggestions"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Investment Director"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <datalist id="role-suggestions">
                {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace…</>
              ) : (
                <>Create workspace <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {/* Placeholder for future email sign-in */}
            <p className="text-center text-xs text-muted-foreground/50 pt-1">
              Email sign-in coming soon.
            </p>

          </form>
        </div>

        {/* Sample screen escape */}
        <p className="text-center text-xs text-muted-foreground/60 mt-5">
          Want to try first?{' '}
          <Link
            href="/run?mode=sample"
            className="text-primary/80 hover:text-primary hover:underline transition-colors"
          >
            Run the example screen without an account
          </Link>
        </p>

      </div>
    </div>
  );
}

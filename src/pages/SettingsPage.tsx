import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, LogOut, Trash2, RotateCcw, Activity, Loader2, WifiOff, ChevronDown } from 'lucide-react';
import {
  getTrialAccount,
  getWorkspaceId,
  getUserId,
  clearLocalWorkspace,
} from '@/lib/trialAccount';
import { getRuns, clearRuns } from '@/lib/runHistory';
import { getBackendBaseUrl, isBackendConfigured } from '@/lib/frontierApi';
import { BackendStatusBadge } from '@/components/BackendStatusBadge';
import { SendFeedbackButton } from '@/components/SendFeedbackButton';
import { clerkEnabled, useOptionalClerk, useOptionalUser } from '@/lib/optionalClerk';

// ─── Optional developer API health ────────────────────────────────────────────

type LocalApiStatus = 'checking' | 'ok' | 'error';

function useLocalApiHealth() {
  const [status, setStatus]       = useState<LocalApiStatus>('checking');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function check() {
    setStatus('checking');
    try {
      const base = getBackendBaseUrl();
      const endpoint = base ? `${base}/api/health` : '/api/health';
      const res = await fetch(endpoint, { method: 'GET' });
      setCheckedAt(new Date());
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setCheckedAt(new Date());
      setStatus('error');
    }
  }

  useEffect(() => { check(); }, []);
  return { status, checkedAt, recheck: check };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useOptionalUser();
  const { signOut } = useOptionalClerk();
  const localApi = useLocalApiHealth();
  const showDeveloperDiagnostics = import.meta.env.DEV;

  const trial = getTrialAccount();
  const runs  = getRuns();
  const urlScreensUsed   = runs.filter(r => r.type === 'url').length;
  const compareRunsUsed  = runs.filter(r => r.type === 'compare').length;
  const urlScreensLimit  = trial?.url_screens_limit ?? 5;
  const urlScreensLeft   = Math.max(0, urlScreensLimit - urlScreensUsed);

  const workspaceId = getWorkspaceId();
  const userId      = getUserId();
  const apiBaseUrl  = getBackendBaseUrl();

  const [workspaceCleared, setWorkspaceCleared] = useState(false);

  function handleClearHistory() {
    if (!window.confirm('Clear all saved run history? This cannot be undone.')) return;
    clearRuns();
    window.location.reload();
  }

  function handleClearWorkspace() {
    if (!window.confirm(
      'Clear all local workspace data, including run history, workspace IDs and session? This cannot be undone.',
    )) return;
    clearLocalWorkspace();
    setWorkspaceCleared(true);
    setTimeout(() => window.location.reload(), 800);
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!isSignedIn && !trial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {clerkEnabled ? 'Sign in to view your settings.' : 'Create a private beta workspace to view your settings.'}
        </p>
        <Link href={clerkEnabled ? '/sign-in' : '/create-workspace'} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md transition-colors">
          {clerkEnabled ? 'Sign in' : 'Create workspace'} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Workspace</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Workspace</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your reviewer workspace, saved screens and private beta usage.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-8">

        {/* Account */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Your account</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Name</p>
                <p className="text-sm text-foreground">{user?.fullName ?? 'Private beta reviewer'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Email</p>
                <p className="text-sm text-foreground">{user?.primaryEmailAddress?.emailAddress ?? 'Local workspace'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {clerkEnabled && isSignedIn
                ? 'Profile details are managed through your Clerk account. Use the avatar menu in the top nav to update your profile or change your password.'
                : 'This reviewer workspace is stored locally in this browser. Create a workspace or run a screen to keep building your saved acquisition screens.'}
            </p>
          </div>
        </section>

        {/* Workspace */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Workspace</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
              workspaceId
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted/20 text-muted-foreground border-border'
            }`}>
              {workspaceId ? 'PROVISIONED' : 'LOCAL ONLY'}
            </span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Workspace name</p>
                <p className="text-sm text-foreground">
                  {trial?.workspace_name ?? user?.fullName ?? 'Private beta workspace'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Account</p>
                <p className="text-sm text-foreground">
                  {user?.primaryEmailAddress?.emailAddress ?? trial?.email ?? 'Local reviewer workspace'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Account mode</p>
                <p className="text-sm text-foreground">
                  {workspaceId ? 'Backend workspace available' : 'Local browser workspace'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Plan</p>
                <p className="text-sm text-foreground">Free Preview</p>
              </div>
            </div>

            {!workspaceId && (
              <p className="text-xs text-muted-foreground">
                Workspace IDs are provisioned when you run your first analysis with the backend configured.
                Until then, all data is stored in your browser's local storage.
              </p>
            )}

            {workspaceCleared ? (
              <p className="text-xs text-green-700">Workspace cleared. Reloading…</p>
            ) : (
              <div className="pt-1">
                <button
                  onClick={handleClearWorkspace}
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 h-8 px-3 rounded-md transition-colors text-red-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear local workspace
                </button>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  Removes all local run history, workspace IDs, and session data.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Plan */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Private beta plan</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              FREE TRIAL
            </span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">URL screens used</p>
                <p className="text-lg font-bold text-foreground">{urlScreensUsed}<span className="text-muted-foreground font-normal text-sm">/{urlScreensLimit}</span></p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Screens left</p>
                <p className={`text-lg font-bold ${urlScreensLeft <= 1 ? 'text-amber-700' : 'text-green-700'}`}>{urlScreensLeft}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Compare runs</p>
                <p className="text-lg font-bold text-foreground">{compareRunsUsed}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Total runs saved</p>
                <p className="text-lg font-bold text-foreground">{runs.length}</p>
              </div>
            </div>
            {trial?.created_at && (
              <p className="text-xs text-muted-foreground">
                Trial account active since {new Date(trial.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/request-pilot" className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                Request plan upgrade <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-3 rounded-md transition-colors">
                View pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Screen history */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Screen history</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-muted-foreground mb-4">
              {runs.length > 0
                ? `${runs.length} screen${runs.length !== 1 ? 's' : ''} saved in local browser storage on this device. Open the Deal Cockpit to view and manage your pipeline.`
                : 'No screens saved yet. Screen a company URL or compare targets to start building your pipeline.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/cockpit" className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                Open cockpit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {runs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 h-8 px-3 rounded-md transition-colors text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear run history
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Feedback */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Private beta feedback</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-muted-foreground mb-4">
              Share what works, what's unclear, and what you'd need before using this in a live deal.
              Responses go directly to the Frontier OS team.
            </p>
            <SendFeedbackButton
              label="Send feedback email"
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
            />
          </div>
        </section>

        {/* Developer diagnostics */}
        {showDeveloperDiagnostics && (
        <details className="group rounded-lg border border-border bg-card overflow-hidden">
          <summary className="px-5 py-3.5 bg-muted/20 cursor-pointer list-none flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Developer diagnostics</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                API connection details and local identifiers for debugging.
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" />
          </summary>
          <div className="px-5 py-5 space-y-5 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-normal text-primary">Backend connection</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                isBackendConfigured()
                  ? 'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]'
                  : 'bg-muted/20 text-muted-foreground border-border'
              }`}>
                {isBackendConfigured() ? 'CONFIGURED' : 'NOT SET'}
              </span>
            </div>

            <div className="rounded-md border border-border bg-background/60 px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  localApi.status === 'ok' ? 'bg-green-400' :
                  localApi.status === 'error' ? 'bg-muted-foreground/40' : 'bg-muted-foreground/40'
                }`} />
                {localApi.status === 'checking'
                  ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  : localApi.status === 'ok'
                    ? <Activity className="w-3 h-3 text-green-700" />
                    : <WifiOff className="w-3 h-3 text-muted-foreground" />}
                <span className={`font-medium ${
                  localApi.status === 'ok' ? 'text-green-700' : 'text-muted-foreground'
                }`}>
                {localApi.status === 'ok' ? 'Configured Frontier OS backend healthy' :
                   localApi.status === 'error' ? 'Configured backend health check did not respond' : 'Checking configured Frontier OS backend…'}
                </span>
                <span className="text-muted-foreground/50 font-mono text-[10px]">/api/health</span>
                <button
                  type="button"
                  onClick={localApi.recheck}
                  className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
                >
                  recheck
                </button>
              </div>
              {localApi.checkedAt && (
                <p className="text-[10px] text-muted-foreground/40 pl-5">
                  Backend last checked {localApi.checkedAt.toLocaleTimeString()}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/70">
                Reviewer runs use the configured Frontier OS backend. Local API availability is not required when Railway is configured.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-2">Configured backend</p>
              <BackendStatusBadge showUrl={import.meta.env.DEV} showCheckTime />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {apiBaseUrl && (
                <div className="rounded-md bg-muted/10 border border-border px-4 py-3 space-y-1">
                  <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">API base URL</p>
                  <p className="text-xs font-mono text-foreground break-all">{apiBaseUrl}</p>
                </div>
              )}
              <div className="rounded-md bg-muted/10 border border-border px-4 py-3 space-y-1">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">Workspace ID</p>
                <p className="text-xs font-mono text-foreground/80 break-all">{workspaceId ?? 'Not provisioned'}</p>
              </div>
              <div className="rounded-md bg-muted/10 border border-border px-4 py-3 space-y-1">
                <p className="text-[10px] font-semibold tracking-normal text-muted-foreground">User ID</p>
                <p className="text-xs font-mono text-foreground/80 break-all">{userId ?? 'Local browser user'}</p>
              </div>
            </div>
          </div>
        </details>
        )}

        {/* Data & legal */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-semibold tracking-normal text-primary">Data &amp; legal</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-muted-foreground mb-4">
              Screen history is stored in your browser's local storage on this device only. No analysis data is sent to external servers beyond the Frontier OS API pipeline.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {[
                { label: 'Privacy policy',      href: '/privacy' },
                { label: 'Terms of service',    href: '/terms' },
                { label: 'Data processing',     href: '/data-processing' },
                { label: 'Cookie policy',       href: '/cookies' },
                { label: 'Disclaimer',          href: '/disclaimer' },
                { label: 'Trust & data',        href: '/trust' },
              ].map(({ label, href }) => (
                <Link key={href} href={href} className="hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Sign out */}
        {clerkEnabled && isSignedIn && (
          <div className="pb-6">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-700 border border-border hover:border-red-500/20 h-9 px-4 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

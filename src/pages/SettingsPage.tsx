import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useUser, useClerk } from '@clerk/react';
import { ArrowRight, LogOut, Trash2, RotateCcw, Activity, Loader2, WifiOff } from 'lucide-react';
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

// ─── Local API health ─────────────────────────────────────────────────────────

type LocalApiStatus = 'checking' | 'ok' | 'error';

function useLocalApiHealth() {
  const [status, setStatus]       = useState<LocalApiStatus>('checking');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function check() {
    setStatus('checking');
    try {
      const res = await fetch('/api/healthz', { method: 'GET' });
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
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const localApi = useLocalApiHealth();

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

  if (!isSignedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Sign in to view your settings.</p>
        <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md transition-colors">
          Sign in <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">Settings</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Account settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-8">

        {/* Account */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Your account</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Name</p>
                <p className="text-sm text-foreground">{user.fullName ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Email</p>
                <p className="text-sm text-foreground">{user.primaryEmailAddress?.emailAddress ?? '—'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Profile details are managed through your Clerk account. Use the avatar menu in the top nav to update your profile or change your password.
            </p>
          </div>
        </section>

        {/* Backend connection */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Backend connection</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
              isBackendConfigured()
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-muted/20 text-muted-foreground border-border'
            }`}>
              {isBackendConfigured() ? 'CONFIGURED' : 'NOT SET'}
            </span>
          </div>
          <div className="px-5 py-5 space-y-4">
            {/* Local API server */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                localApi.status === 'ok' ? 'bg-green-400' :
                localApi.status === 'error' ? 'bg-red-400' : 'bg-muted-foreground/40'
              }`} />
              {localApi.status === 'checking'
                ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                : localApi.status === 'ok'
                  ? <Activity className="w-3 h-3 text-green-400" />
                  : <WifiOff className="w-3 h-3 text-red-400" />}
              <span className={`font-medium ${
                localApi.status === 'ok' ? 'text-green-400' :
                localApi.status === 'error' ? 'text-red-400' : 'text-muted-foreground'
              }`}>
                {localApi.status === 'ok' ? 'Local API server healthy' :
                 localApi.status === 'error' ? 'Local API server unreachable' : 'Checking local API…'}
              </span>
              <span className="text-muted-foreground/50 font-mono text-[10px]">/api/healthz</span>
              <button
                type="button"
                onClick={localApi.recheck}
                className="ml-1 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
              >
                recheck
              </button>
            </div>
            {localApi.checkedAt && (
              <p className="text-[10px] text-muted-foreground/40 pl-5">
                Local API last checked {localApi.checkedAt.toLocaleTimeString()}
              </p>
            )}

            {/* Railway backend */}
            <div className="pt-1 border-t border-border">
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Railway backend</p>
              <BackendStatusBadge showUrl showCheckTime />
            </div>

            {apiBaseUrl ? (
              <div className="rounded-md bg-muted/10 border border-border px-4 py-3 space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">API base URL</p>
                <p className="text-xs font-mono text-foreground break-all">{apiBaseUrl}</p>
              </div>
            ) : (
              <div className="rounded-md bg-muted/10 border border-border/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Set <span className="font-mono text-foreground/80">VITE_FRONTIER_API_BASE_URL</span> in your environment to connect to the Railway backend.
                  Local analysis will use the preview path via the API server.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Workspace */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Workspace</p>
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
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Workspace ID</p>
                <p className="text-xs font-mono text-foreground/80 break-all">{workspaceId ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">User ID</p>
                <p className="text-xs font-mono text-foreground/80 break-all">{userId ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Account mode</p>
                <p className="text-xs text-foreground/80">
                  {workspaceId ? 'Backend workspace · data synced' : 'Local browser storage only'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Plan</p>
                <p className="text-xs text-foreground/80">Free trial · private beta</p>
              </div>
            </div>

            {!workspaceId && (
              <p className="text-xs text-muted-foreground">
                Workspace IDs are provisioned when you run your first analysis with the backend configured.
                Until then, all data is stored in your browser's local storage.
              </p>
            )}

            {workspaceCleared ? (
              <p className="text-xs text-green-400">Workspace cleared. Reloading…</p>
            ) : (
              <div className="pt-1">
                <button
                  onClick={handleClearWorkspace}
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 h-8 px-3 rounded-md transition-colors text-red-400"
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
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Private beta plan</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              FREE TRIAL
            </span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">URL screens used</p>
                <p className="text-lg font-bold text-foreground">{urlScreensUsed}<span className="text-muted-foreground font-normal text-sm">/{urlScreensLimit}</span></p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Screens left</p>
                <p className={`text-lg font-bold ${urlScreensLeft <= 1 ? 'text-amber-400' : 'text-green-400'}`}>{urlScreensLeft}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Compare runs</p>
                <p className="text-lg font-bold text-foreground">{compareRunsUsed}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Total runs saved</p>
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

        {/* Run history */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Run history</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-muted-foreground mb-4">
              {runs.length > 0
                ? `${runs.length} run${runs.length !== 1 ? 's' : ''} saved in local browser storage on this device. Open the Deal Cockpit to view and manage your pipeline.`
                : 'No runs saved yet. Run a URL screen or compare targets to start building your pipeline.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/cockpit" className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground">
                Open cockpit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {runs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 h-8 px-3 rounded-md transition-colors text-red-400"
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
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Private beta feedback</p>
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

        {/* Data & legal */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Data &amp; legal</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-muted-foreground mb-4">
              Run history is stored in your browser's local storage on this device only. No analysis data is sent to external servers beyond the Frontier OS API pipeline.
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
        <div className="pb-6">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-400 border border-border hover:border-red-500/20 h-9 px-4 rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

      </div>
    </div>
  );
}

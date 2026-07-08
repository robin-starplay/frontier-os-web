import React, { useEffect, useState } from 'react';
import { Switch, Route, Link } from 'wouter';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { AppNavbar } from './AppNavbar';
import { BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { ensureTrialAccount, hasLocalWorkspaceSession } from '@/lib/trialAccount';
import { useOptionalUser } from '@/lib/optionalClerk';

// Pages served inside the app shell
import AnalysisSetupBase from '@/pages/AnalysisSetup';

// Wouter's component prop passes RouteComponentProps; AnalysisSetup takes sampleMode.
// Wrap with a plain component to avoid the type conflict.
function AnalysisSetup() { return <AnalysisSetupBase />; }
import CompareTargetsPage from '@/pages/CompareTargetsPage';
import DealCockpitPage from '@/pages/DealCockpitPage';
import OriginationPage from '@/pages/OriginationPage';
import EvidenceWorkflowPage from '@/pages/EvidenceWorkflowPage';
import AIDisruptionPage from '@/pages/AIDisruptionPage';
import ExportsPage from '@/pages/ExportsPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFound from '@/pages/not-found';

// ── Workspace gate ────────────────────────────────────────────────────────────
// Shown when a user reaches /app/* without a workspace or sign-in.

function WorkspaceGate() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <p className="text-xs font-medium text-primary mb-3">
          Pilot workspace
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Create a diligence workspace
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed text-sm">
          Run acquisition screens, compare targets and track IC readiness in the deal pipeline.
          No payment required. Public-source screening is available immediately.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/create-workspace"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
          >
            Create workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/app/run"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-5 rounded-md transition-colors text-foreground"
          >
            Start public-source screen
          </Link>
          <a
            href={BOOK_INTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-5 rounded-md transition-colors text-foreground"
          >
            Book intro <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/50">
          No payment required · public-source screening available immediately
        </p>
      </div>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
// Wraps all /app/* routes. Checks workspace state and shows a gate for
// unauthenticated users who have not created a local workspace.

export function AppShell() {
  const { isLoaded, isSignedIn } = useOptionalUser();
  // Read trial account synchronously — updated via useEffect after sign-in
  const [hasLocalWorkspace, setHasLocalWorkspace] = useState(() => hasLocalWorkspaceSession());

  // Idempotently provision trial account on every sign-in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const account = ensureTrialAccount();
      setHasLocalWorkspace(Boolean(account));
    }
  }, [isLoaded, isSignedIn]);

  // A workspace exists if the user is signed in or any local workspace identity is present.
  const hasWorkspace = !!isSignedIn || hasLocalWorkspace;

  // ── Clerk still loading — show spinner to avoid flash of gate ───────────────
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
        <AppNavbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        </main>
      </div>
    );
  }

  // ── No workspace — show gate ────────────────────────────────────────────────
  if (!hasWorkspace) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
        <AppNavbar />
        <main className="flex-1 flex flex-col">
          <WorkspaceGate />
        </main>
      </div>
    );
  }

  // ── Workspace confirmed — render app shell with inner router ────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
      <AppNavbar />
      <main className="flex-1 flex flex-col relative">
        <Switch>
          <Route path="/app/run"         component={AnalysisSetup} />
          <Route path="/app/compare"     component={CompareTargetsPage} />
          <Route path="/app/origination" component={OriginationPage} />
          <Route path="/app/cockpit"     component={DealCockpitPage} />
          <Route path="/app/evidence"    component={EvidenceWorkflowPage} />
          <Route path="/app/ai-risk"     component={AIDisruptionPage} />
          <Route path="/app/exports"     component={ExportsPage} />
          <Route path="/app/settings"    component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
} from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, useSearch } from 'wouter';
import { getRuns } from '@/lib/runHistory';
import { ensureTrialAccount } from '@/lib/trialAccount';
import { Navbar } from '@/components/Navbar';
import { AppShell } from '@/components/AppShell';
import { Activity, BarChart3, ShieldCheck, X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { GateModal } from '@/components/GateModal';
import { OAuthButtons } from '@/components/OAuthButtons';
import { ThemeScript } from '@/components/ThemeToggle';
import { AccessProvider } from '@/contexts/AccessContext';
import { BetaGate } from '@/components/BetaGate';
import Landing from '@/pages/Landing';
import WorkspaceCreationPage from '@/pages/WorkspaceCreationPage';
import NotFound from '@/pages/not-found';
import AnalysisSetup from '@/pages/AnalysisSetup';
import LiveWorkflow from '@/pages/LiveWorkflow';
import ResultsPreview from '@/pages/ResultsPreview';
import ICMemo from '@/pages/ICMemo';
import ReportsPage from '@/pages/ReportsPage';
import AIDisruptionPage from '@/pages/AIDisruptionPage';
import ProductPage from '@/pages/ProductPage';
import EvidenceWorkflowPage from '@/pages/EvidenceWorkflowPage';
import RegistryCoveragePage from '@/pages/RegistryCoveragePage';
import TrustPage from '@/pages/TrustPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import UseCasesPage from '@/pages/UseCasesPage';
import FAQPage from '@/pages/FAQPage';
import DealCockpitPage from '@/pages/DealCockpitPage';
import CompareTargetsPage from '@/pages/CompareTargetsPage';
import BuyerThesisPage from '@/pages/BuyerThesisPage';
import OriginationPage from '@/pages/OriginationPage';
import ExportsPage from '@/pages/ExportsPage';
import SettingsPage from '@/pages/SettingsPage';
import PrivateEquityPage from '@/pages/PrivateEquityPage';
import SoftwareRollupsPage from '@/pages/SoftwareRollupsPage';
import CorporateDevelopmentPage from '@/pages/CorporateDevelopmentPage';
import SearchFundsPage from '@/pages/SearchFundsPage';
import FoundersPage from '@/pages/FoundersPage';
import VCGrowthPage from '@/pages/VCGrowthPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import CookiesPage from '@/pages/CookiesPage';
import DataProcessingPage from '@/pages/DataProcessingPage';
import DisclaimerPage from '@/pages/DisclaimerPage';
import ContactPage from '@/pages/ContactPage';
import RequestPilotPage from '@/pages/RequestPilotPage';
import PricingPage from '@/pages/PricingPage';
import PublicEvidencePage from '@/pages/PublicEvidencePage';
import PublicAIRiskPage from '@/pages/PublicAIRiskPage';
import { clerkEnabled, clerkPublishableKey, useOptionalUser } from '@/lib/optionalClerk';

// ── Clerk setup ───────────────────────────────────────────────────────────────
// Clerk is optional for reviewer/private-beta workspaces. When a publishable key
// is absent, the app uses the local workspace flow backed by /api/trial/create-account.

// REQUIRED — empty in dev (intentional), auto-populated in prod.
// Do NOT gate on import.meta.env.PROD / NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clerk passes full paths; wouter's setLocation prepends the base — strip it.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

// ── Appearance: Frontier OS light enterprise theme ────────────────────────────

const clerkAppearance = {
  baseTheme:    shadcn,
  cssLayerName: 'clerk',
  layout: {
    logoPlacement:          'inside'      as const,
    logoLinkUrl:            basePath || '/',
    logoImageUrl:           `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'bottom'      as const,
    socialButtonsVariant:   'blockButton' as const,
  },
  variables: {
    colorPrimary:         'hsl(217, 91%, 45%)',
    colorForeground:      'hsl(222, 47%, 11%)',
    colorMutedForeground: 'hsl(215, 18%, 40%)',
    colorDanger:          'hsl(0, 72%, 45%)',
    colorBackground:      'hsl(0, 0%, 100%)',
    colorInput:           'hsl(214, 32%, 84%)',
    colorInputForeground: 'hsl(222, 47%, 11%)',
    colorNeutral:         'hsl(215, 18%, 40%)',
    fontFamily:           '"Inter", system-ui, sans-serif',
    borderRadius:         '0.375rem',
  },
  elements: {
    rootBox:                      'w-full flex justify-center',
    cardBox:                      'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(214,32%,88%)] shadow-xl',
    card:                         '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer:                       '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle:                  'text-[hsl(222,47%,11%)] font-bold tracking-tight',
    headerSubtitle:               'text-[hsl(215,18%,40%)]',
    socialButtonsBlockButtonText: 'text-[hsl(222,47%,11%)] font-medium',
    formFieldLabel:               'text-[hsl(222,47%,11%)] text-sm font-medium',
    footerActionLink:             'text-[hsl(217,91%,45%)] hover:text-[hsl(217,91%,36%)]',
    footerActionText:             'text-[hsl(215,18%,40%)]',
    dividerText:                  'text-[hsl(215,18%,40%)] text-xs',
    identityPreviewEditButton:    'text-[hsl(217,91%,45%)]',
    formFieldSuccessText:         'text-green-700',
    alertText:                    'text-[hsl(222,47%,11%)]',
    logoBox:                      'mb-1',
    logoImage:                    'h-7 w-auto',
    socialButtonsBlockButton:     'border-[hsl(214,32%,88%)] bg-white hover:bg-[hsl(214,48%,95%)] transition-colors',
    formButtonPrimary:            'bg-[hsl(217,91%,45%)] hover:bg-[hsl(217,91%,38%)] text-white font-semibold transition-colors',
    formFieldInput:               'bg-white border-[hsl(214,32%,84%)] text-[hsl(222,47%,11%)] focus:border-[hsl(217,91%,45%)] transition-colors',
    footerAction:                 'bg-[hsl(210,33%,98%)] border-t border-[hsl(214,32%,88%)]',
    dividerLine:                  'bg-[hsl(214,32%,88%)]',
    alert:                        'border-[hsl(214,32%,88%)] bg-[hsl(214,48%,95%)]',
    otpCodeFieldInput:            'bg-white border-[hsl(214,32%,84%)] text-[hsl(222,47%,11%)]',
    formFieldRow:                 'gap-2',
    main:                         'gap-4',
  },
};

// ── QueryClient ───────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

// ── Render safety ────────────────────────────────────────────────────────────

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  state: { hasError: boolean; message?: string } = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.setState({
      message: error instanceof Error ? error.message : String(error),
    });
    if (import.meta.env.DEV) {
      console.error('[app] Render failed', error);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md text-center">
            <p className="text-[10px] font-semibold tracking-normal text-primary mb-3">
              Private beta workspace
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Frontier OS could not load this workspace view.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Open the public home page or create a fresh local workspace. Existing backend data is not changed.
            </p>
            {import.meta.env.DEV && this.state.message && (
              <pre className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-xs text-destructive whitespace-pre-wrap">
                {this.state.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-5 rounded-md transition-colors text-foreground"
              >
                Home
              </a>
              <a
                href="/create-workspace"
                className="inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-md transition-colors"
              >
                Create workspace
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

// ── React-Query cache invalidation when Clerk user changes ───────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ── Auth pages ────────────────────────────────────────────────────────────────

const strippedCardAppearance = {
  elements: {
    rootBox:           'w-full',
    cardBox:           '!bg-transparent !shadow-none !border-0 !rounded-none w-full',
    card:              '!bg-transparent !shadow-none !border-0 !rounded-none',
    header:            '!hidden',
    socialButtonsRoot: '!hidden',
    socialButtons:     '!hidden',
    dividerRow:        '!hidden',
  },
} as const;

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-background px-6 py-16">
      <div className="grid w-full max-w-[1100px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden min-h-[680px] overflow-hidden bg-[linear-gradient(145deg,#173f88_0%,#0b2759_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Activity className="h-7 w-7 text-blue-300" />
            <h2 className="mt-16 max-w-sm text-4xl font-bold leading-tight">Welcome to Frontier OS</h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-blue-100">Evidence-first acquisition screening, built for investors and operators.</p>
          </div>
          <div className="grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
            {[['Evidence first', Activity], ['Secure by design', ShieldCheck], ['Built for investors', BarChart3]].map(([label, Icon]) => (
              <div key={String(label)} className="space-y-2">
                <Icon className="h-5 w-5 text-blue-300" />
                <p className="text-xs leading-relaxed text-blue-100">{String(label)}</p>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-h-[620px] flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:px-16">
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-start px-0 pb-8 text-left">
      <img src={`${basePath}/logo.svg`} alt="Frontier OS" className="mb-8 h-7 w-auto lg:hidden" />
      <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-2 text-base text-slate-600">{subtitle}</p>
    </div>
  );
}

function OAuthDivider() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs text-slate-500">or</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function SignInPage() {
  if (!clerkEnabled) return <WorkspaceCreationPage />;
  // After Clerk auth, PostSignInRedirector picks the destination (/app/cockpit or /app/run)
  const redirectUrlComplete = `${window.location.origin}${basePath}/app/run`;
  return (
    <AuthCard>
      <AuthHeader title="Join the private beta" subtitle="Sign in to run your own screens." />
      <div className="pb-2">
        <OAuthButtons redirectUrlComplete={redirectUrlComplete} />
      </div>
      <OAuthDivider />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={strippedCardAppearance}
      />
    </AuthCard>
  );
}

function SignUpPage() {
  if (!clerkEnabled) return <WorkspaceCreationPage />;
  const redirectUrlComplete = `${window.location.origin}${basePath}/app/run`;
  return (
    <AuthCard>
      <AuthHeader title="Join the private beta" subtitle="Create a free account to run your own screens." />
      <div className="pb-2">
        <OAuthButtons redirectUrlComplete={redirectUrlComplete} />
      </div>
      <OAuthDivider />
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={strippedCardAppearance}
      />
    </AuthCard>
  );
}

// ── Post-sign-in redirect ─────────────────────────────────────────────────────
// Detects signed-out → signed-in transition and sends to /app/cockpit (existing
// runs) or /app/run (first-run experience). Also bootstraps the trial account.

function PostSignInRedirector() {
  const { isLoaded, isSignedIn } = useOptionalUser();
  const [, setLocation] = useLocation();
  const prevSignedIn = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      ensureTrialAccount(); // idempotent — only creates if not already present
      if (prevSignedIn.current === false) {
        // Transitioned from signed-out → signed-in: choose app destination
        let dest = '/app/run';
        try {
          dest = getRuns().length > 0 ? '/app/cockpit' : '/app/run';
        } catch {
          dest = '/app/run';
        }
        setLocation(dest);
      }
    }
    prevSignedIn.current = isSignedIn ?? false;
  }, [isLoaded, isSignedIn, setLocation]);

  return null;
}

// ── AppRedirect ───────────────────────────────────────────────────────────────
// Redirects signed-in users from a public route to the corresponding /app/* URL.
// For signed-out users, renders the provided fallback (the public page).
// This lets legacy paths (/run, /cockpit, /compare, etc.) keep working for
// unauthenticated visitors while seamlessly upgrading signed-in users.

function AppRedirect({ to, fallback }: { to: string; fallback: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useOptionalUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation(to, { replace: true });
    }
  }, [isLoaded, isSignedIn, to, setLocation]);

  // Clerk loading — show nothing briefly to avoid flicker
  if (!isLoaded) return null;
  // Signed in — redirect is firing, stay silent
  if (isSignedIn) return null;
  // Signed out — render the public fallback
  return <>{fallback}</>;
}

// ── Protected route wrappers (public shell) ───────────────────────────────────
// Signed-in users are redirected to the corresponding /app/* route.
// Signed-out users see the public version (BetaGate or open page).

function ProtectedRun() {
  const search = useSearch();
  const isSampleMode = new URLSearchParams(search).get('mode') === 'sample';
  if (isSampleMode) return <SafeRouteRedirect to="/app/run" />;
  // AppRedirect returns null for signed-in users (redirect fires in useEffect),
  // so the fallback is only ever rendered for signed-out visitors.
  return <AppRedirect to="/app/run" fallback={<BetaGate page="run" />} />;
}

function SafeRouteRedirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [setLocation, to]);
  return null;
}

function ProtectedCockpit() {
  // Signed-out users can still browse the cockpit with local run history
  return <AppRedirect to="/app/cockpit" fallback={<DealCockpitPage />} />;
}

function ProtectedCompare() {
  return <AppRedirect to="/app/compare" fallback={<CompareTargetsPage />} />;
}

function ProtectedOrigination() {
  return <AppRedirect to="/app/origination" fallback={<OriginationPage />} />;
}

function ProtectedExports() {
  return <AppRedirect to="/app/exports" fallback={<ExportsPage />} />;
}

function ProtectedSettings() {
  return <AppRedirect to="/app/settings" fallback={<SettingsPage />} />;
}

// ── Public router ─────────────────────────────────────────────────────────────
// Handles all non-/app routes. Signed-in users hitting product routes are
// transparently redirected to the /app/* equivalents via AppRedirect.

function PublicRouter() {
  return (
    <Switch>
      {/* Home */}
      <Route path="/" component={Landing} />

      {/* Auth — /*? wildcard required for Clerk OAuth sub-paths */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Product routes — redirect signed-in users to /app/* */}
      <Route path="/run"         component={ProtectedRun} />
      <Route path="/compare"     component={ProtectedCompare} />
      <Route path="/cockpit"     component={ProtectedCockpit} />
      <Route path="/origination" component={ProtectedOrigination} />
      <Route path="/exports"     component={ProtectedExports} />
      <Route path="/settings"    component={ProtectedSettings} />

      {/* Retired static demo: use the real source-backed workflow. */}
      <Route path="/platform-demo"><SafeRouteRedirect to="/app/run" /></Route>

      {/* Buyer landing pages */}
      <Route path="/private-equity"        component={PrivateEquityPage} />
      <Route path="/software-rollups"      component={SoftwareRollupsPage} />
      <Route path="/corporate-development" component={CorporateDevelopmentPage} />
      <Route path="/search-funds"          component={SearchFundsPage} />
      <Route path="/founders"              component={FoundersPage} />
      <Route path="/vc-growth"             component={VCGrowthPage} />

      {/* Public marketing & content */}
      <Route path="/product"           component={ProductPage} />
      <Route path="/ai-disruption"     component={AIDisruptionPage} />
      <Route path="/evidence-workflow" component={EvidenceWorkflowPage} />
      <Route path="/registry-coverage" component={RegistryCoveragePage} />
      <Route path="/trust"             component={TrustPage} />
      <Route path="/how-it-works"      component={HowItWorksPage} />
      <Route path="/use-cases"         component={UseCasesPage} />
      <Route path="/faq"               component={FAQPage} />
      <Route path="/buyer-thesis"      component={BuyerThesisPage} />

      {/* Legal */}
      <Route path="/terms"           component={TermsPage} />
      <Route path="/privacy"         component={PrivacyPage} />
      <Route path="/cookies"         component={CookiesPage} />
      <Route path="/data-processing" component={DataProcessingPage} />
      <Route path="/disclaimer"      component={DisclaimerPage} />

      {/* Company */}
      <Route path="/contact"            component={ContactPage} />
      <Route path="/request-pilot"      component={RequestPilotPage} />
      <Route path="/pricing"            component={PricingPage} />
      <Route path="/create-workspace"   component={WorkspaceCreationPage} />
      <Route path="/evidence"           component={PublicEvidencePage} />
      <Route path="/ai-risk"            component={PublicAIRiskPage} />

      {/* Internal demo flow */}
      <Route path="/workflow" component={LiveWorkflow} />
      <Route path="/results"  component={ResultsPreview} />
      <Route path="/memo"     component={ICMemo} />
      <Route path="/reports"  component={ReportsPage} />
      <Route path="/report"   component={ReportsPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

// ── Public shell ──────────────────────────────────────────────────────────────
// Renders the public Navbar, public router, and footer.
// Signed-in users viewing public pages see "Open app" in the Navbar.

function PublicShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
      <PrivateBetaBanner />
      <Navbar />
      <main className="flex-1 flex flex-col relative">
        <PublicRouter />
      </main>
      <Footer />
    </div>
  );
}

// ── Private-beta banner ───────────────────────────────────────────────────────

function PrivateBetaBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('fos_beta_banner_dismissed') === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 relative flex items-center justify-center">
      <p className="text-[11px] font-mono text-primary/90 leading-snug text-center px-8">
        Private beta preview · Public-source screening only · Do not upload confidential information
      </p>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => {
          try { localStorage.setItem('fos_beta_banner_dismissed', '1'); } catch { /* quota */ }
          setDismissed(true);
        }}
        className="absolute right-3 text-primary/60 hover:text-primary transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title:    'Welcome back',
            subtitle: 'Sign in to run your own screens',
          },
        },
        signUp: {
          start: {
            title:    'Join the private beta',
            subtitle: 'Free account · run URL-only analysis on your own targets',
          },
        },
      }}
      routerPush={(to)    => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <PostSignInRedirector />
        <AccessProvider>
          <GateModal />
          {/* /app/* routes use the AppShell (product nav, workspace gate).
              All other routes use the PublicShell (public nav, footer). */}
          <Switch>
            <Route path="/app/:rest*" component={AppShell} />
            <Route component={PublicShell} />
          </Switch>
        </AccessProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function LocalWorkspaceProviderWithRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessProvider>
        <GateModal />
        <Switch>
          <Route path="/app/:rest*" component={AppShell} />
          <Route component={PublicShell} />
        </Switch>
      </AccessProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <ThemeScript />
      <WouterRouter base={basePath}>
        {clerkEnabled ? <ClerkProviderWithRoutes /> : <LocalWorkspaceProviderWithRoutes />}
      </WouterRouter>
    </AppErrorBoundary>
  );
}

export default App;

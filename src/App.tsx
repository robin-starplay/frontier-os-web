import React, { useEffect, useRef, useState } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, useSearch } from 'wouter';
import { getRuns } from '@/lib/runHistory';
import { ensureTrialAccount } from '@/lib/trialAccount';
import { Navbar } from '@/components/Navbar';
import { AppShell } from '@/components/AppShell';
import { X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { GateModal } from '@/components/GateModal';
import { OAuthButtons } from '@/components/OAuthButtons';
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
import UseCasesPage from '@/pages/UseCasesPage';
import FAQPage from '@/pages/FAQPage';
import DealCockpitPage from '@/pages/DealCockpitPage';
import PlatformDemoPage from '@/pages/PlatformDemoPage';
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

// ── Clerk setup ───────────────────────────────────────────────────────────────
// REQUIRED — copy verbatim. Resolves key from hostname so the same build serves
// multiple Clerk custom domains. Never inline the raw env var.

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

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

if (!clerkPubKey) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY — add it to .env (see .env.example)',
  );
}

// ── Appearance: Frontier OS dark-navy theme ───────────────────────────────────

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
    colorPrimary:         'hsl(221, 83%, 53%)',
    colorForeground:      'hsl(210, 40%, 98%)',
    colorMutedForeground: 'hsl(215, 20%, 65%)',
    colorDanger:          'hsl(0, 72%, 51%)',
    colorBackground:      'hsl(222, 47%, 8%)',
    colorInput:           'hsl(222, 30%, 13%)',
    colorInputForeground: 'hsl(210, 40%, 98%)',
    colorNeutral:         'hsl(222, 20%, 28%)',
    fontFamily:           '"Inter", system-ui, sans-serif',
    borderRadius:         '0.5rem',
  },
  elements: {
    rootBox:                      'w-full flex justify-center',
    cardBox:                      'bg-[hsl(222,47%,11%)] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(222,20%,20%)] shadow-2xl',
    card:                         '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer:                       '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle:                  'text-[hsl(210,40%,98%)] font-bold tracking-tight',
    headerSubtitle:               'text-[hsl(215,20%,65%)]',
    socialButtonsBlockButtonText: 'text-[hsl(210,40%,98%)] font-medium',
    formFieldLabel:               'text-[hsl(210,40%,98%)] text-sm font-medium',
    footerActionLink:             'text-[hsl(221,83%,65%)] hover:text-[hsl(221,83%,75%)]',
    footerActionText:             'text-[hsl(215,20%,65%)]',
    dividerText:                  'text-[hsl(215,20%,65%)] text-xs',
    identityPreviewEditButton:    'text-[hsl(221,83%,65%)]',
    formFieldSuccessText:         'text-green-400',
    alertText:                    'text-[hsl(210,40%,98%)]',
    logoBox:                      'mb-1',
    logoImage:                    'h-7 w-auto',
    socialButtonsBlockButton:     'border-[hsl(222,20%,22%)] bg-[hsl(222,30%,14%)] hover:bg-[hsl(222,30%,18%)] transition-colors',
    formButtonPrimary:            'bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,46%)] text-white font-semibold transition-colors',
    formFieldInput:               'bg-[hsl(222,30%,13%)] border-[hsl(222,20%,22%)] text-[hsl(210,40%,98%)] focus:border-[hsl(221,83%,53%)] transition-colors',
    footerAction:                 'bg-[hsl(222,47%,9%)] border-t border-[hsl(222,20%,18%)]',
    dividerLine:                  'bg-[hsl(222,20%,20%)]',
    alert:                        'border-[hsl(222,20%,22%)] bg-[hsl(222,30%,13%)]',
    otpCodeFieldInput:            'bg-[hsl(222,30%,13%)] border-[hsl(222,20%,22%)] text-[hsl(210,40%,98%)]',
    formFieldRow:                 'gap-2',
    main:                         'gap-4',
  },
};

// ── QueryClient ───────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

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
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-background px-4 py-12">
      <div className="bg-[hsl(222,47%,11%)] rounded-2xl w-[440px] max-w-full border border-[hsl(222,20%,20%)] shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center px-8 pt-8 pb-4 text-center">
      <img src={`${basePath}/logo.svg`} alt="Frontier OS" className="h-7 w-auto mb-4" />
      <h1 className="text-xl font-bold text-[hsl(210,40%,98%)]">{title}</h1>
      <p className="text-sm text-[hsl(215,20%,65%)] mt-1">{subtitle}</p>
    </div>
  );
}

function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 px-8 pb-2">
      <div className="flex-1 h-px bg-[hsl(222,20%,20%)]" />
      <span className="text-xs text-[hsl(215,20%,65%)]">or</span>
      <div className="flex-1 h-px bg-[hsl(222,20%,20%)]" />
    </div>
  );
}

function SignInPage() {
  // After Clerk auth, PostSignInRedirector picks the destination (/app/cockpit or /app/run)
  const redirectUrlComplete = `${window.location.origin}${basePath}/app/run`;
  return (
    <AuthCard>
      <AuthHeader title="Join the private beta" subtitle="Sign in to run your own screens." />
      <div className="px-8 pb-4">
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
  const redirectUrlComplete = `${window.location.origin}${basePath}/app/run`;
  return (
    <AuthCard>
      <AuthHeader title="Join the private beta" subtitle="Create a free account to run your own screens." />
      <div className="px-8 pb-4">
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
  const { isLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const prevSignedIn = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      ensureTrialAccount(); // idempotent — only creates if not already present
      if (prevSignedIn.current === false) {
        // Transitioned from signed-out → signed-in: choose app destination
        const dest = getRuns().length > 0 ? '/app/cockpit' : '/app/run';
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
  const { isLoaded, isSignedIn } = useUser();
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
  // ?mode=sample is a public bypass — skip auth redirect for sample views
  if (isSampleMode) return <AnalysisSetup sampleMode key="sample" />;
  // AppRedirect returns null for signed-in users (redirect fires in useEffect),
  // so the fallback is only ever rendered for signed-out visitors.
  return <AppRedirect to="/app/run" fallback={<BetaGate page="run" />} />;
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

      {/* Platform workflow preview — public */}
      <Route path="/platform-demo" component={PlatformDemoPage} />

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
      publishableKey={clerkPubKey}
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

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;

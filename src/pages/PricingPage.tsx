import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { BookIntroButton, BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { getBackendBaseUrl } from '@/lib/frontierApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tier {
  plan_id: string;
  name: string;
  price_label: string;
  audience: string;
  cta_label: string;
  cta_url: string;
  ctaVariant: 'primary' | 'outline';
  showBookIntro?: boolean;
  bookIntroEvent?: string;
  features: string[];
}

// ─── Static fallback tier data ────────────────────────────────────────────────

const STATIC_TIERS: Tier[] = [
  {
    plan_id: 'free_preview',
    name: 'Free Preview',
    price_label: 'Free',
    audience: 'Screen public-source acquisition targets before a pilot conversation.',
    cta_label: 'Start free',
    cta_url: '/app/run',
    ctaVariant: 'primary',
    features: [
      '5 public-source acquisition screens',
      'On-screen acquisition dashboard',
      'Evidence cards',
      'AI replica risk view',
      'Saved runs in pipeline',
      '1 document-assisted review',
      'Non-confidential PDF only',
      'Claims extracted, not independently verified',
    ],
  },
  {
    plan_id: 'professional',
    name: 'Professional',
    price_label: 'Pricing on request',
    audience: 'For founders, searchers, independent sponsors and solo operators.',
    cta_label: 'Request pilot',
    cta_url: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_starter',
    features: [
      'More public-source screens',
      'Compare targets',
      'Deal pipeline',
      'Document-assisted review',
      'Save summaries to pipeline',
      'Export-ready summaries',
    ],
  },
  {
    plan_id: 'team_platform',
    name: 'Team',
    price_label: 'Pricing on request',
    audience: 'For advisors, small funds, corp dev and software roll-ups.',
    cta_label: 'Request pilot',
    cta_url: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_team',
    features: [
      'Everything in Professional',
      'Buyer thesis templates',
      'Full document workflows',
      'PowerPoint IC pack',
      'Excel diligence tracker',
      'Team workspace',
    ],
  },
  {
    plan_id: 'enterprise',
    name: 'Enterprise',
    price_label: 'Pricing on request',
    audience: 'For evidence retention rules, custom integrations and pilot setup.',
    cta_label: 'Request pilot',
    cta_url: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_enterprise',
    features: [
      'Everything in Team',
      'API access',
      'Custom data and retention rules',
      'CRM integrations',
      'Dedicated onboarding',
      'Pilot setup',
    ],
  },
];

// ─── Feature comparison ───────────────────────────────────────────────────────

const TIER_NAMES = ['Free Preview', 'Professional', 'Team', 'Enterprise'];

const COMPARISON_ROWS: { label: string; vals: string[] }[] = [
  { label: 'Public-source screens',       vals: ['5 screens', 'More screens',  'Volume',    'Volume+'] },
  { label: 'Full on-screen result',       vals: ['✓', '✓', '✓', '✓'] },
  { label: 'Compare targets',             vals: ['Not included', '✓', '✓', '✓'] },
  { label: 'Deal pipeline',               vals: ['Not included', '✓', '✓', '✓'] },
  { label: 'Document-assisted review',    vals: ['1 review', '✓', '✓', '✓'] },
  { label: 'Save summaries to pipeline',  vals: ['Not included', '✓', '✓', '✓'] },
  { label: 'Export-ready summaries',      vals: ['Not included', '✓', '✓', '✓'] },
  { label: 'Buyer thesis templates',      vals: ['Not included', 'Not included', '✓', '✓'] },
  { label: 'PowerPoint IC pack',          vals: ['Not included', 'Not included', '✓', '✓'] },
  { label: 'API access',                  vals: ['Not included', 'Not included', 'Not included', '✓'] },
  { label: 'Custom data / retention',     vals: ['Not included', 'Not included', 'Not included', '✓'] },
  { label: 'Pilot setup',                 vals: ['Not included', 'Not included', 'Not included', '✓'] },
];

// ─── Backend plan shape ───────────────────────────────────────────────────────

interface BackendPlan {
  plan_id: string;
  name: string;
  price_label: string;
  audience: string;
  features: string[];
  cta_label: string;
  cta_url?: string;
}

interface PricingResponse {
  status?: string;
  plans?: BackendPlan[];
}

type PricingLoadState = 'loading' | 'loaded' | 'fallback';

function tierVariant(planId: string): Tier['ctaVariant'] {
  return planId === 'free_preview' ? 'primary' : 'outline';
}

function bookIntroEvent(planId: string): string | undefined {
  if (planId === 'professional' || planId === 'starter_growth') return 'clicked_book_intro_pricing_professional';
  if (planId === 'team_platform') return 'clicked_book_intro_pricing_team';
  if (planId === 'enterprise') return 'clicked_book_intro_pricing_enterprise';
  return undefined;
}

function normalisePriceLabel(plan: BackendPlan): string {
  return plan.plan_id === 'free_preview' ? 'Free' : 'Pricing on request';
}

function tierFromBackend(plan: BackendPlan): Tier {
  const fallback = STATIC_TIERS.find(tier => tier.plan_id === plan.plan_id);
  const isFree = plan.plan_id === 'free_preview';

  return {
    plan_id: plan.plan_id,
    name: plan.plan_id === 'starter_growth' ? 'Professional' : (plan.plan_id === 'team_platform' ? 'Team' : plan.name),
    price_label: normalisePriceLabel(plan),
    audience: plan.audience,
    cta_label: isFree ? (plan.cta_label || 'Start free') : 'Request pilot',
    cta_url: isFree ? (plan.cta_url || fallback?.cta_url || '/app/run') : '/request-pilot',
    ctaVariant: tierVariant(plan.plan_id),
    showBookIntro: plan.plan_id !== 'free_preview',
    bookIntroEvent: bookIntroEvent(plan.plan_id),
    features: Array.isArray(plan.features) ? plan.features : [],
  };
}

function resolveCtaHref(url?: string): { href: string; external: boolean } {
  if (!url) return { href: '/request-pilot', external: false };
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { href: url, external: true };
  }
  return { href: url, external: false };
}

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  pricingState,
  onPlanCta,
}: {
  tier: Tier;
  pricingState: PricingLoadState;
  onPlanCta: (tier: Tier) => void;
}) {
  const { external } = resolveCtaHref(tier.cta_url);
  void pricingState;

  return (
    <div className={cn(
      'min-w-0 rounded-xl border bg-card flex flex-col p-8 relative h-full overflow-hidden',
      'border-border',
    )}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2 mb-1.5">
          <p className="min-w-0 break-words text-lg font-bold text-foreground">{tier.name}</p>
        </div>
        <p className={cn(
          'min-w-0 break-words font-bold text-foreground',
          tier.price_label === 'Free' ? 'text-3xl' : 'text-2xl',
        )}>
          {tier.price_label}
        </p>
      </div>

      {/* Description */}
      <p className="min-w-0 break-words text-sm text-muted-foreground leading-relaxed mb-8">{tier.audience}</p>

      {/* Features — flex-1 pushes CTA block to card bottom */}
      <div className="flex-1 space-y-3 mb-8">
        {tier.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
            <span className="text-sm text-muted-foreground leading-relaxed">{f}</span>
          </div>
        ))}
      </div>

      {/* Action rows — pinned to a shared baseline across equal-height cards */}
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onPlanCta(tier)}
          className={cn(
            'inline-flex min-w-0 items-center justify-center gap-2 w-full min-h-13 rounded-md px-3 py-3 text-center text-sm font-semibold leading-snug transition-colors whitespace-normal break-words',
            tier.ctaVariant === 'primary'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-primary/40 bg-transparent text-foreground hover:bg-primary/5 hover:border-primary/60',
          )}
        >
          {tier.cta_label}
          {external && <ExternalLink className="w-3 h-3 shrink-0" />}
          {tier.ctaVariant === 'primary' && !external && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
        </button>
        <div className="mt-2 h-8">
          {tier.showBookIntro && (
            <BookIntroButton
              eventName={tier.bookIntroEvent ?? 'clicked_book_intro_pricing'}
              variant="ghost"
              label="Book intro"
              className="w-full justify-center text-xs text-muted-foreground hover:text-foreground h-8"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const [tiers, setTiers] = useState<Tier[]>(STATIC_TIERS);
  const [pricingState, setPricingState] = useState<PricingLoadState>('loading');

  function handlePlanCta(tier: Tier) {
    const { href, external } = resolveCtaHref(tier.cta_url);
    if (import.meta.env.DEV) {
      console.debug('[pricing] CTA', {
        plan_id: tier.plan_id,
        cta_url: tier.cta_url,
      });
    }

    if (external) {
      window.location.assign(href);
      return;
    }

    setLocation(href);
  }

  // Backend pricing is canonical. Fallback remains GBP-safe if the endpoint is unavailable.
  useEffect(() => {
    let cancelled = false;
    const base = getBackendBaseUrl();
    const url  = base ? `${base}/api/pricing/plans` : '/api/pricing/plans';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then((data: PricingResponse | null) => {
        if (cancelled) return;
        if (!data?.plans) {
          setPricingState('fallback');
          return;
        }
        const backendTiers = data.plans.map(plan => tierFromBackend(plan));
        if (backendTiers.length > 0) {
          setTiers(backendTiers);
          setPricingState('loaded');
        } else {
          setPricingState('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setPricingState('fallback');
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-16 text-center">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
            Start free. Scale as you screen.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start with the public-source preview or request a private beta pilot for a wider team workflow.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">

        {/* Tier cards */}
        <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-20 items-stretch [&>*]:min-w-0">
          {tiers.map(t => {
            if (import.meta.env.DEV) {
              console.log('pricing plan', t.plan_id, t.cta_url);
            }
            return (
              <TierCard
                key={t.plan_id}
                tier={t}
                pricingState={pricingState}
                onPlanCta={handlePlanCta}
              />
            );
          })}
        </div>

        {/* Comparison table — desktop only */}
        <div className="hidden xl:block mb-16">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-6">Feature comparison</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-5 bg-muted/20 border-b border-border">
              <div className="px-4 py-3 text-xs font-medium text-muted-foreground">Feature</div>
              {TIER_NAMES.map(name => (
                <div key={name} className="px-4 py-3 text-xs font-semibold text-center text-foreground">
                  {name}
                </div>
              ))}
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'grid grid-cols-5 border-b border-border/50 last:border-0',
                  i % 2 === 0 ? 'bg-card' : 'bg-muted/5',
                )}
              >
                <div className="px-4 py-3 text-xs text-muted-foreground">{row.label}</div>
                {row.vals.map((v, vi) => (
                  <div
                    key={vi}
                    className={cn(
                      'px-4 py-3 text-xs text-center font-medium',
                      v === 'Not included' ? 'text-muted-foreground/50 font-normal' : 'text-foreground',
                      v === '✓' ? 'text-primary' : '',
                    )}
                  >
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ strip */}
        <div className="border-t border-border pt-10 mb-14">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-6">Common questions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'What is included in the free preview?',
                a: 'The free preview includes 5 public-source screens.',
              },
              {
                q: 'What is included in Professional?',
                a: 'Professional includes expanded screening, document-assisted review, Deal Cockpit and Compare.',
              },
              {
                q: 'Can I run without uploading documents?',
                a: 'Yes. Public-source screens use public sources and registry data. Document upload is optional.',
              },
              {
                q: 'How do Team and Enterprise plans work?',
                a: 'Team and Enterprise plans are configured around workflow scope, data handling and integration requirements.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-xl border border-card-border bg-card p-8 text-center shadow-xs">
          <p className="text-xl font-bold text-foreground mb-2">Ready to run your first screen?</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start with the free public-source preview or request a pilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/run"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
            >
              Screen company <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-sm font-medium border border-input bg-card hover:bg-accent h-10 px-6 rounded-md transition-colors text-foreground"
            >
              Book intro
            </a>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            Outputs are decision support and require human review.
          </p>
        </div>

      </div>
    </div>
  );
}

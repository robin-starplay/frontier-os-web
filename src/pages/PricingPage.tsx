import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { BookIntroButton, BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { getBackendBaseUrl } from '@/lib/frontierApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tier {
  id: string;
  name: string;
  badge?: string;
  price: string;
  priceNote: string;
  description: string;
  cta: string;
  /** Default href used when backend cta_url is absent. */
  ctaHrefDefault: string;
  ctaVariant: 'primary' | 'outline';
  showBookIntro?: boolean;
  bookIntroEvent?: string;
  /** Show "Paid beta access is currently activated manually after payment." */
  showPaymentNote?: boolean;
  features: string[];
}

// ─── Static fallback tier data ────────────────────────────────────────────────

const STATIC_TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free Preview',
    price: 'Free',
    priceNote: 'No payment required',
    description: 'Run URL-only acquisition screens with no commitment. See how Frontier OS surfaces evidence, AI risk and diligence gaps.',
    cta: 'Start free',
    ctaHrefDefault: '/create-workspace',
    ctaVariant: 'primary',
    features: [
      '5 URL-only acquisition screens',
      'Full on-screen result',
      'Basic evidence cards',
      'Basic AI disruption view',
      'Basic saved runs',
      '1 document-assisted review (prototype)',
      'Non-confidential PDF only',
      'Claims extracted, not independently verified',
    ],
  },
  {
    id: 'starter',
    name: 'Starter / Growth',
    badge: 'Private beta',
    price: '$99/month',
    priceNote: 'Billed monthly · private beta',
    description:
      'For founders, searchers, independent sponsors and solo operators who want to screen targets, compare buyer-fit and prepare diligence questions.',
    cta: 'Start beta',
    ctaHrefDefault: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_starter',
    showPaymentNote: true,
    features: [
      'More URL screens',
      'Compare targets',
      'Deal Cockpit',
      'Document-assisted review prototype',
      'Save summaries to Cockpit',
      'Export-ready markdown-style summaries',
    ],
  },
  {
    id: 'team',
    name: 'Team / Platform',
    badge: 'Private beta',
    price: 'Pricing on request',
    priceNote: 'Private beta pricing',
    description:
      'For advisors, small funds, corp dev and software roll-ups that need buyer-thesis workflows, document workflows and IC pack preparation.',
    cta: 'Request pilot',
    ctaHrefDefault: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_team',
    features: [
      'Everything in Starter / Growth',
      'Buyer thesis templates',
      'Full document workflows',
      'PowerPoint IC pack',
      'Excel diligence tracker',
      'Team workspace',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Custom',
    price: 'Pricing on request',
    priceNote: 'Custom terms',
    description:
      'For confidential workflows, evidence retention rules, custom integrations and private pilot setup.',
    cta: 'Discuss access',
    ctaHrefDefault: '/request-pilot',
    ctaVariant: 'outline',
    showBookIntro: true,
    bookIntroEvent: 'clicked_book_intro_pricing_enterprise',
    features: [
      'Everything in Team / Platform',
      'API access',
      'Custom data and retention rules',
      'CRM integrations',
      'Dedicated onboarding',
      'Private pilot setup',
    ],
  },
];

// ─── Feature comparison ───────────────────────────────────────────────────────

const TIER_NAMES = ['Free Preview', 'Starter / Growth', 'Team / Platform', 'Enterprise'];

const COMPARISON_ROWS: { label: string; vals: string[] }[] = [
  { label: 'URL-only screens',            vals: ['5 screens', 'More screens',  'Volume',    'Volume+'] },
  { label: 'Full on-screen result',       vals: ['✓', '✓', '✓', '✓'] },
  { label: 'Compare targets',             vals: ['—', '✓', '✓', '✓'] },
  { label: 'Deal Cockpit',                vals: ['—', '✓', '✓', '✓'] },
  { label: 'Document-assisted review',    vals: ['1 (prototype)', '✓', '✓', '✓'] },
  { label: 'Save summaries to Cockpit',   vals: ['—', '✓', '✓', '✓'] },
  { label: 'Export-ready summaries',      vals: ['—', '✓', '✓', '✓'] },
  { label: 'Buyer thesis templates',      vals: ['—', '—', '✓', '✓'] },
  { label: 'PowerPoint IC pack',          vals: ['—', '—', '✓', '✓'] },
  { label: 'API access',                  vals: ['—', '—', '—', '✓'] },
  { label: 'Custom data / retention',     vals: ['—', '—', '—', '✓'] },
  { label: 'Private pilot setup',         vals: ['—', '—', '—', '✓'] },
];

// ─── Backend plan shape ───────────────────────────────────────────────────────

interface BackendPlan {
  id: string;
  cta_url?: string;
}

/** Resolve the Starter / Growth CTA href.
 *  Uses backend cta_url if it is an absolute URL (Stripe Payment Link or similar).
 *  Falls back to /request-pilot otherwise. */
function resolveStarterHref(backendCtaUrl: string | null): { href: string; external: boolean } {
  if (backendCtaUrl && (backendCtaUrl.startsWith('https://') || backendCtaUrl.startsWith('http://'))) {
    return { href: backendCtaUrl, external: true };
  }
  if (backendCtaUrl && backendCtaUrl.startsWith('/')) {
    return { href: backendCtaUrl, external: false };
  }
  return { href: '/request-pilot', external: false };
}

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  starterCtaUrl,
}: {
  tier: Tier;
  starterCtaUrl: string | null;
}) {
  const isStarter = tier.id === 'starter';
  const { href, external } = isStarter
    ? resolveStarterHref(starterCtaUrl)
    : { href: tier.ctaHrefDefault, external: false };

  return (
    <div className={cn(
      'rounded-xl border bg-card flex flex-col p-6 relative h-full',
      'border-border',
    )}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-sm font-bold text-foreground">{tier.name}</p>
          {tier.badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary whitespace-nowrap shrink-0">
              {tier.badge}
            </span>
          )}
        </div>
        <p className={cn(
          'font-bold text-foreground',
          tier.price === 'Free' ? 'text-2xl' : 'text-xl',
        )}>
          {tier.price}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{tier.priceNote}</p>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-5">{tier.description}</p>

      {/* Features — flex-1 pushes CTA block to card bottom */}
      <div className="flex-1 space-y-2 mb-6">
        {tier.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>

      {/* CTA block — pinned to card bottom */}
      <div className="space-y-2">
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-md text-sm font-semibold transition-colors whitespace-nowrap',
              tier.ctaVariant === 'primary'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-primary/40 bg-transparent text-foreground hover:bg-primary/5 hover:border-primary/60',
            )}
          >
            {tier.cta}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <Link
            href={href}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-md text-sm font-semibold transition-colors whitespace-nowrap',
              tier.ctaVariant === 'primary'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-primary/40 bg-transparent text-foreground hover:bg-primary/5 hover:border-primary/60',
            )}
          >
            {tier.cta}
            {tier.ctaVariant === 'primary' && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
          </Link>
        )}

        {tier.showPaymentNote && (
          <p className="text-[10px] text-muted-foreground/60 text-center leading-snug px-1">
            Paid beta access is currently activated manually after payment.
          </p>
        )}

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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [starterCtaUrl, setStarterCtaUrl] = useState<string | null>(null);

  // Try to fetch backend pricing plans; only use cta_url for the starter tier.
  // Fails silently — static TIERS data is the fallback.
  useEffect(() => {
    let cancelled = false;
    const base = getBackendBaseUrl();
    const url  = base ? `${base}/api/pricing/plans` : '/api/pricing/plans';
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then((data: { plans?: BackendPlan[] } | null) => {
        if (cancelled || !data?.plans) return;
        const starterPlan = data.plans.find(p => p.id === 'starter' || p.id === 'starter_growth');
        if (starterPlan?.cta_url) setStarterCtaUrl(starterPlan.cta_url);
      })
      .catch(() => { /* silent fallback — STATIC_TIERS remain */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 w-full">

      {/* Header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">Pricing</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Start free. Scale as you screen.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Free preview includes 5 URL-only screens. Starter / Growth is $99/month in private beta.
            Team and Enterprise pricing available on request.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary/80 text-xs">
            Private beta · Do not upload confidential information in the public preview
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-14">

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-16 items-stretch">
          {STATIC_TIERS.map(t => (
            <TierCard key={t.id} tier={t} starterCtaUrl={starterCtaUrl} />
          ))}
        </div>

        {/* Trust / safety copy */}
        <div className="mb-12 rounded-lg border border-border bg-muted/20 px-5 py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Payments support paid beta access. Confidential document workflows require a private pilot setup.
            Do not upload confidential information in the public preview.
          </p>
        </div>

        {/* Comparison table — desktop only */}
        <div className="hidden lg:block mb-16">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-6">Feature comparison</p>
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
                      'px-4 py-3 text-xs text-center font-mono',
                      v === '—' ? 'text-muted-foreground/30' : 'text-foreground',
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-6">Common questions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Do I need to pay to try Frontier OS?',
                a: 'No. The free preview includes 5 URL-only screens. No payment required.',
              },
              {
                q: 'What happens after I pay for Starter / Growth?',
                a: 'Paid beta access is activated manually after payment. We will confirm your access within one business day.',
              },
              {
                q: 'Can I run without uploading documents?',
                a: 'Yes. URL-only mode uses public sources and registry data. Document upload is optional.',
              },
              {
                q: 'What does "private beta" mean?',
                a: 'The product is live but access is limited. Paid plans are available now; Team and Enterprise pricing is agreed directly.',
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
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
          <p className="text-xl font-bold text-foreground mb-2">Ready to run your first screen?</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start with the free preview. No payment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/run"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors"
            >
              Run screen <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href={BOOK_INTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-sm font-medium border border-primary/40 bg-transparent hover:bg-primary/5 h-10 px-6 rounded-md transition-colors text-foreground"
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

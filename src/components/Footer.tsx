import React from 'react';
import { Link } from 'wouter';
import { BookIntroButton } from '@/components/BookIntroButton';
import { SendFeedbackButton } from '@/components/SendFeedbackButton';

const PRODUCT_LINKS = [
  { label: 'Screen company',    href: '/run' },
  { label: 'Deal Cockpit',      href: '/cockpit' },
  { label: 'AI Disruption',     href: '/ai-disruption' },
  { label: 'Evidence Workflow', href: '/evidence-workflow' },
  { label: 'Registry Coverage', href: '/registry-coverage' },
];

const COMPANY_LINKS = [
  { label: 'Pricing',          href: '/pricing' },
  { label: 'Request Pilot',    href: '/request-pilot' },
  { label: 'Contact',          href: '/contact' },
  { label: 'Trust',            href: '/trust' },
  { label: 'FAQ',              href: '/faq' },
];

const LEGAL_LINKS = [
  { label: 'Terms of Use',    href: '/terms' },
  { label: 'Privacy Notice',  href: '/privacy' },
  { label: 'Cookie Notice',   href: '/cookies' },
  { label: 'Data Processing', href: '/data-processing' },
  { label: 'Disclaimer',      href: '/disclaimer' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-normal text-muted-foreground/60 mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 mt-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        {/* columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm font-semibold text-foreground mb-1">Frontier OS</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Software acquisition screening grounded in evidence.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Frontier Intelligence Systems Ltd<br />
              71–75 Shelton Street<br />
              Covent Garden, London WC2H 9JQ<br />
              <a href="mailto:contact@getfrontieros.com" className="hover:text-foreground transition-colors">
                contact@getfrontieros.com
              </a>
            </p>
          </div>
          <FooterColumn title="Product"  links={PRODUCT_LINKS} />
          <FooterColumn title="Company"  links={COMPANY_LINKS} />
          <FooterColumn title="Legal"    links={LEGAL_LINKS} />
        </div>

        {/* bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Frontier Intelligence Systems Ltd. All rights reserved.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/30">
              Build: railway-connected-private-beta-v1
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SendFeedbackButton
              label="Send feedback"
              className="text-xs text-muted-foreground/60 hover:text-foreground"
            />
            <BookIntroButton
              eventName="clicked_book_intro_footer"
              variant="ghost"
              label="Book a 30-minute intro"
              className="text-xs text-muted-foreground/60 hover:text-foreground gap-1.5"
            />
            <a href="mailto:contact@getfrontieros.com" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
              contact@getfrontieros.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

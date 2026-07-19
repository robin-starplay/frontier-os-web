import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { BetaCTA } from '@/components/BetaCTA';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

interface FAQItem {
  category: string;
  q: string;
  a: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  // Workflow
  {
    category: 'Workflow',
    q: 'Is this an IC memo generator?',
    a: 'No. The memo is an output. The product is the evidence workflow behind it: source hierarchy, confidence propagation, contradiction handling and diligence-gap generation. A memo produced without those inputs is a formatted summary, not an acquisition screen.',
  },
  {
    category: 'Differentiation',
    q: 'How is this different from asking ChatGPT?',
    a: 'A general LLM generates plausible-sounding text based on training data. Frontier OS applies a structured evidence workflow: sources are ranked, each claim is classified, conflicts are flagged, and unknowns become diligence questions. The output reflects evidence quality, not fluency.',
  },
  {
    category: 'Differentiation',
    q: 'How is this different from a company research database?',
    a: 'Research databases help find and enrich targets. Frontier OS is focused on acquisition judgement for a specific buyer: what is verified, what is uncertain, whether the strategic fit holds, and what needs diligence before IC. It starts where research databases end.',
  },
  {
    category: 'Differentiation',
    q: 'How is this different from a data room?',
    a: 'Data rooms store and organise documents. Frontier OS analyses the evidence inside those documents, reconciles claims against the source hierarchy, and generates source-aware IC and diligence outputs. Documents are inputs, not the product.',
  },
  // AI disruption
  {
    category: 'AI disruption',
    q: 'Does it prove a company has an AI moat?',
    a: 'No. It identifies the evidence that would support or weaken that claim and turns missing proof into diligence questions. Frontier OS does not infer an AI moat from marketing language.',
  },
  {
    category: 'AI disruption',
    q: 'What is AI replica risk?',
    a: 'An assessment of whether AI-native competitors or internal customer teams could rebuild the product\'s core workflow. It considers data uniqueness, integration depth, switching costs and domain complexity. High replica risk may affect price and structure assumptions.',
  },
  {
    category: 'AI disruption',
    q: 'What is inference economics?',
    a: 'The P&L impact of using AI models: model costs per customer, usage intensity, pricing power, gross margin effects and whether AI features are separately monetised. A product that uses expensive models without charging for AI features has a different margin profile than one that has priced AI explicitly.',
  },
  // Trust / data
  {
    category: 'Trust',
    q: 'Can it run without confidential documents?',
    a: 'Yes. URL-only mode uses public sources and registry connectors where available. Document upload is optional and only needed when deeper analysis is required. The initial screen is designed to be run without any confidential material.',
  },
  {
    category: 'Trust',
    q: 'How are uploaded documents handled?',
    a: 'Documents are used for the analysis workflow only. They are scoped to the company-specific workspace and should not be used for model training. Provider configuration and retention terms must be disclosed before paid pilots.',
  },
  {
    category: 'Trust',
    q: 'Does Frontier OS make investment recommendations?',
    a: 'No. Outputs are decision support. Every output requires source review, professional judgement and diligence confirmation before any investment decision. Frontier OS is a workflow tool, not an advisor.',
  },
  // Registries
  {
    category: 'Registries',
    q: 'Which registries are supported?',
    a: (
      <span>
        Current coverage: UK Companies House (active v1), US SEC EDGAR (connector v1, public companies only), Germany Handelsregister (manual connector v1). France and Italy are planned.{' '}
        <Link href="/registry-coverage" className="text-primary underline underline-offset-2 hover:text-primary/80">
          See registry coverage page.
        </Link>
      </span>
    ),
  },
  // Upload and documents
  {
    category: 'Upload',
    q: 'Can I upload pitch decks, CIMs or Excel files?',
    a: 'Document-assisted review is part of the product direction. In the private beta sample workflow, upload is simulated. Files are selected locally but not transmitted. Controlled pilots should define retention, deletion and provider data-use settings before confidential documents are processed.',
  },
  {
    category: 'Upload',
    q: 'Who do I contact about privacy or data handling?',
    a: (
      <span>
        Contact{' '}
        <a href="mailto:contact@getfrontieros.com" className="text-primary underline underline-offset-2 hover:text-primary/80">
          contact@getfrontieros.com
        </a>
        . The{' '}
        <Link href="/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Notice</Link>
        {' '}and{' '}
        <Link href="/data-processing" className="text-primary underline underline-offset-2 hover:text-primary/80">Data Processing</Link>
        {' '}pages explain how data and documents are handled.
      </span>
    ),
  },
  // People
  {
    category: 'Fit',
    q: 'Who is this for?',
    a: 'PE deal teams, software roll-up acquirers, VC and growth investors assessing AI defensibility, investment banks preparing sell-side materials, corp dev teams and operating partners conducting AI disruption reviews. Each has a different workflow entry point and evidence priority.',
  },
];

const CATEGORIES = Array.from(new Set(FAQ_ITEMS.map((f) => f.category)));

function FAQItemRow({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between py-4 text-left gap-4 hover:text-foreground/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <span className="text-sm font-medium text-foreground leading-snug">{item.q}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-0.5', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="pb-4 pr-8">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory ? FAQ_ITEMS.filter((f) => f.category === activeCategory) : FAQ_ITEMS;
  const globalIdx = (item: FAQItem) => FAQ_ITEMS.indexOf(item);

  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>FAQ</SectionLabel>
          <h1 className="text-3xl font-bold text-foreground mb-3">Common questions.</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Workflow, AI disruption, trust and differentiation.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              'text-xs font-mono px-3 py-1.5 rounded border transition-colors',
              activeCategory === null
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'text-muted-foreground border-border hover:text-foreground'
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'text-xs font-mono px-3 py-1.5 rounded border transition-colors',
                activeCategory === cat
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="rounded-lg border border-border bg-card px-6">
          {filtered.map((item) => {
            const idx = globalIdx(item);
            return (
              <FAQItemRow
                key={item.q}
                item={item}
                isOpen={openIdx === idx}
                onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
              />
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="mt-8 text-xs text-muted-foreground">
          Have a question not answered here?{' '}
          <Link href="/trust" className="text-primary hover:text-primary/80 underline underline-offset-2">
            See the trust page
          </Link>{' '}
          for document handling and security posture.
        </p>
      </div>

      <BetaCTA
        title="Want to test Frontier OS on your workflow?"
        body="Screen a sample company, request private beta access, or book a 30-minute intro to discuss your acquisition screening process."
        primaryLabel="Screen company"
        primaryHref="/run"
        secondaryLabel="Request private beta access"
        secondaryHref="/request-pilot"
        eventName="faq_bottom"
      />
    </div>
  );
}

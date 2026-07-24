import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  // Workflow
  {
    q: 'Is this an IC memo generator?',
    a: 'No. The memo is an output. The product is the evidence workflow behind it: source hierarchy, confidence propagation, contradiction handling and diligence-gap generation.',
  },
  {
    q: 'Does it prove a company has an AI moat?',
    a: 'No. It identifies the evidence that would support or weaken that claim and turns missing proof into diligence questions.',
  },
  {
    q: 'Can it run without confidential documents?',
    a: 'Yes. URL-only mode uses public sources and registry connectors where available. Document upload is optional for deeper analysis.',
  },
  {
    q: 'How should confidential documents be handled?',
    a: 'Keep documents in a company-specific workspace. Do not use confidential material outside a defined pilot. Deletion and retention rules should be explicit before a pilot begins.',
  },
  // AI disruption
  {
    q: 'Why does Frontier OS assess AI disruption?',
    a: 'Software assets are being repriced by AI. Buyers need to know whether AI expands the product, compresses services, reduces OPEX or makes the workflow easier to replicate.',
  },
  {
    q: 'What is AI replica risk?',
    a: 'An assessment of whether AI-native competitors or internal customer teams could rebuild the product\'s core workflow. It considers data, integrations, switching costs and domain complexity.',
  },
  {
    q: 'What is inference economics?',
    a: 'The P&L impact of using AI models: model costs, usage intensity, pricing power, gross margin effects and whether AI features are monetised separately.',
  },
  {
    q: 'Can Frontier OS replace technical diligence?',
    a: 'No. It surfaces the questions that technical diligence needs to answer. Product review, customer reference calls and architecture assessment remain essential.',
  },
  // Trust & privacy
  {
    q: 'Are uploaded documents used to train models?',
    a: 'No. Uploaded documents are private workflow inputs. They are not used as model-training data.',
  },
  {
    q: 'Can documents from one company affect another analysis?',
    a: 'The design uses company-isolated workspaces. Evidence from one project is not available in another.',
  },
  {
    q: 'What happens when a document conflicts with official filings?',
    a: 'The conflict is flagged and routed to diligence output. Official filings remain higher in the source hierarchy unless a user explicitly overrides.',
  },
  {
    q: 'What is stored in private beta?',
    a: 'The private beta uses sample data only. No real diligence is performed and no real documents are processed in the sample workflow.',
  },
  // Differentiation
  {
    q: 'How is this different from a company research database?',
    a: 'Research databases find and enrich targets. Frontier records the current investment view, supporting evidence and diligence required before IC.',
  },
  {
    q: 'What makes the source hierarchy useful?',
    a: 'It prevents management claims from being treated as fact. A management deck is Tier 4. Companies House filings are Tier 1. Conflicts between tiers are flagged, not silently merged.',
  },
];

interface FAQItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ q, a, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 text-left gap-4 hover:text-foreground/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="pb-3.5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function SecurityFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const toggle = (idx: number) => setOpenIdx(openIdx === idx ? null : idx);
  const half = Math.ceil(FAQ_ITEMS.length / 2);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        <div className="divide-y divide-border">
          {FAQ_ITEMS.slice(0, half).map((item, idx) => (
            <FAQItem key={idx} q={item.q} a={item.a} isOpen={openIdx === idx} onToggle={() => toggle(idx)} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {FAQ_ITEMS.slice(half).map((item, idx) => (
            <FAQItem key={idx + half} q={item.q} a={item.a} isOpen={openIdx === idx + half} onToggle={() => toggle(idx + half)} />
          ))}
        </div>
      </div>
    </div>
  );
}

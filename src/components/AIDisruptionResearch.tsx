import React from 'react';

type ResearchStatus = 'Claimed' | 'Medium-high' | 'Unproven' | 'Unknown' | 'Mixed';
type ConfidenceLevel = 'High' | 'Medium' | 'Low';

interface ResearchPanel {
  title: string;
  status: ResearchStatus;
  statusVariant: 'amber' | 'red' | 'muted' | 'blue';
  confidence: ConfidenceLevel;
  evidence: string;
  verifyNext: string;
}

const STATUS_CHIP: Record<string, string> = {
  amber: 'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  red:   'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
  muted: 'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
  blue:  'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-[var(--semantic-info-border)]',
};

const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  High:   'text-green-700',
  Medium: 'text-amber-700',
  Low:    'text-muted-foreground',
};

const PANELS: ResearchPanel[] = [
  {
    title: 'AI already used?',
    status: 'Claimed',
    statusVariant: 'amber',
    confidence: 'Medium',
    evidence:
      'Product page mentions an AI assistant. No live usage metrics, customer adoption data or monetised AI module confirmed in public sources.',
    verifyNext:
      'Live AI feature usage, customer adoption rate, monetisation structure and whether AI is roadmap or revenue-generating.',
  },
  {
    title: 'Replica risk',
    status: 'Medium-high',
    statusVariant: 'red',
    confidence: 'Medium',
    evidence:
      'Workflow appears partly replicable without confirmed proprietary data. Integration depth is medium. No evidence of deep customer workflow lock-in from public sources.',
    verifyNext:
      'Integration architecture, data uniqueness, customer switching costs and whether any workflows require domain-specific training data.',
  },
  {
    title: 'AI moat',
    status: 'Unproven',
    statusVariant: 'muted',
    confidence: 'Low',
    evidence:
      'No verified proprietary dataset or model advantage disclosed. Claims of AI capability present but no evidence of feedback loops, exclusive data rights or measurable AI performance advantage.',
    verifyNext:
      'Data rights and provenance, model training sources, feedback loops and AI performance metrics vs generic alternatives.',
  },
  {
    title: 'Inference economics',
    status: 'Unknown',
    statusVariant: 'muted',
    confidence: 'Low',
    evidence:
      'No disclosed AI model usage cost, gross margin impact or inference cost per customer. Vendor and model dependency not stated publicly.',
    verifyNext:
      'Model provider and contract structure, monthly inference cost per active customer, pricing power and AI feature impact on gross margin.',
  },
  {
    title: 'P&L impact',
    status: 'Mixed',
    statusVariant: 'blue',
    confidence: 'Medium',
    evidence:
      'AI could reduce support and implementation effort, improving OPEX margins. However, inference costs may increase COGS, and AI features are not confirmed as priced modules.',
    verifyNext:
      'Support ticket volume pre/post AI, implementation hours per customer, AI module pricing and whether AI is absorbed in base subscription or charged separately.',
  },
];

function ResearchCard({ panel }: { panel: ResearchPanel }) {
  const chipCls = STATUS_CHIP[panel.statusVariant];
  const confColor = CONFIDENCE_COLOR[panel.confidence];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
        <span className="text-sm font-semibold text-foreground">{panel.title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${chipCls}`}>
            {panel.status}
          </span>
          <span className={`text-[10px] font-mono font-semibold ${confColor}`}>
            {panel.confidence} confidence
          </span>
        </div>
      </div>

      {/* Evidence */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-semibold tracking-normal text-muted-foreground mb-1">Evidence</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{panel.evidence}</p>
      </div>

      {/* Verify next */}
      <div className="px-4 pt-2 pb-3 border-t border-border/50 mt-1">
        <p className="text-[10px] font-semibold tracking-normal text-primary/60 mb-1">Verify next</p>
        <p className="text-xs text-foreground leading-relaxed">{panel.verifyNext}</p>
      </div>
    </div>
  );
}

export function AIDisruptionResearch() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {PANELS.map((panel) => (
        <ResearchCard key={panel.title} panel={panel} />
      ))}
    </div>
  );
}

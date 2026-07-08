import React from 'react';

type AnswerLevel = 'yes' | 'partial' | 'no' | 'conditional' | 'blocked';

interface InvestabilityRow {
  question: string;
  currentAnswer: string;
  answerLevel: AnswerLevel;
  evidenceStatus: string;
  nextAction: string;
}

const ANSWER_CHIP: Record<AnswerLevel, string> = {
  yes:         'bg-[var(--semantic-verified-bg)] text-[var(--semantic-verified-text)] border-[var(--semantic-verified-border)]',
  partial:     'bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-[var(--semantic-claim-border)]',
  no:          'bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)] border-[var(--semantic-unknown-border)]',
  conditional: 'bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-[var(--semantic-info-border)]',
  blocked:     'bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-[var(--semantic-blocker-border)]',
};

const ROWS: InvestabilityRow[] = [
  {
    question: 'Is revenue quality proven?',
    currentAnswer: 'Not yet',
    answerLevel: 'partial',
    evidenceStatus: 'Recurring revenue disclosed. ARR not filed.',
    nextAction: 'Request revenue split and SaaS / services breakdown.',
  },
  {
    question: 'Is EBITDA reliable?',
    currentAnswer: 'Caveated',
    answerLevel: 'partial',
    evidenceStatus: 'Adjusted EBITDA is non-GAAP. No statutory reconciliation provided.',
    nextAction: 'Request GAAP EBITDA reconciliation and normalisation bridge.',
  },
  {
    question: 'Is AI a moat?',
    currentAnswer: 'Unproven',
    answerLevel: 'no',
    evidenceStatus: 'AI claims visible. No usage, data-moat or inference cost proof.',
    nextAction: 'Request AI roadmap, customer adoption data and inference cost structure.',
  },
  {
    question: 'Can the product be replicated?',
    currentAnswer: 'Needs technical diligence',
    answerLevel: 'blocked',
    evidenceStatus: 'Integration depth and data uniqueness unknown from public sources.',
    nextAction: 'Technical architecture review and customer switching cost assessment.',
  },
  {
    question: 'Is this a fit for buyer?',
    currentAnswer: 'Conditional',
    answerLevel: 'conditional',
    evidenceStatus: 'Vertical-software logic plausible. Synergies not underwritten.',
    nextAction: 'Define buyer thesis and confirm integration assumptions before IC.',
  },
];

export function InvestabilityTable() {
  return (
    <>
    {/* Mobile: stacked cards */}
    <div className="flex flex-col gap-3 sm:hidden">
      {ROWS.map(({ question, currentAnswer, answerLevel, evidenceStatus, nextAction }) => (
        <div key={question} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-foreground leading-snug">{question}</p>
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${ANSWER_CHIP[answerLevel]}`}>
              {currentAnswer}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-snug">{evidenceStatus}</p>
          <p className="text-[10px] font-semibold tracking-normal text-primary/60">Next action</p>
          <p className="text-xs text-foreground leading-snug">{nextAction}</p>
        </div>
      ))}
    </div>

    {/* Desktop: table */}
    <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 bg-muted/30 px-4 py-2.5 border-b border-border">
        <div className="col-span-3 text-[10px] font-semibold tracking-normal text-muted-foreground">Question</div>
        <div className="col-span-2 text-[10px] font-semibold tracking-normal text-muted-foreground">Current answer</div>
        <div className="col-span-4 text-[10px] font-semibold tracking-normal text-muted-foreground">Evidence status</div>
        <div className="col-span-3 text-[10px] font-semibold tracking-normal text-muted-foreground">Next action</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50 bg-card">
        {ROWS.map(({ question, currentAnswer, answerLevel, evidenceStatus, nextAction }) => (
          <div key={question} className="grid grid-cols-12 px-4 py-3.5 items-start gap-2">
            <div className="col-span-3">
              <p className="text-xs font-medium text-foreground leading-snug">{question}</p>
            </div>
            <div className="col-span-2">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${ANSWER_CHIP[answerLevel]}`}>
                {currentAnswer}
              </span>
            </div>
            <div className="col-span-4">
              <p className="text-xs text-muted-foreground leading-snug">{evidenceStatus}</p>
            </div>
            <div className="col-span-3">
              <p className="text-xs text-foreground leading-snug">{nextAction}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

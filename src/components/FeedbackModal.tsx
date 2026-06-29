import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react';
import { getFeedbackMailto } from '@/components/SendFeedbackButton';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const SCALE_OPTIONS = ['1', '2', '3', '4', '5'];

type Answer = string;
type Answers = Record<string, Answer>;

const QUESTIONS = [
  {
    id: 'q1',
    kind: 'scale' as const,
    label: 'How clearly does the platform communicate the core value proposition?',
    scaleLabels: ['Not clear', 'Very clear'],
  },
  {
    id: 'q2',
    kind: 'radio' as const,
    label: 'Which page or feature was most useful to you?',
    options: ['Run screen (URL analysis)', 'Deal Cockpit', 'Compare targets', 'AI Disruption', 'Evidence workflow', 'Other'],
  },
  {
    id: 'q3',
    kind: 'text' as const,
    label: 'What felt useful?',
    placeholder: 'e.g. "The evidence confidence scores made it easy to see gaps"',
  },
  {
    id: 'q4',
    kind: 'text' as const,
    label: 'What felt unclear?',
    placeholder: 'e.g. "The AI moat scoring wasn\'t obvious"',
  },
  {
    id: 'q5',
    kind: 'scale' as const,
    label: 'How confident are you that this could hold up in a real IC process?',
    scaleLabels: ['Not confident', 'Very confident'],
  },
  {
    id: 'q6',
    kind: 'text' as const,
    label: 'Would this help in an investment/advisory workflow? How?',
    placeholder: 'In your own words…',
  },
  {
    id: 'q7',
    kind: 'text' as const,
    label: 'What output would you need before sharing with an IC/client?',
    placeholder: 'e.g. "Source audit trail, auditor sign-off, PDF export…"',
  },
  {
    id: 'q8',
    kind: 'radio' as const,
    label: 'Would you use this in a live deal at its current stage?',
    options: ['Yes, today', 'Yes, after a few improvements', 'Needs significant work first', 'No'],
  },
  {
    id: 'q9',
    kind: 'text' as const,
    label: 'Any other feedback, questions, or requests?',
    placeholder: 'Anything else on your mind…',
  },
];

function buildEmailBody(answers: Answers): string {
  const lines: string[] = ['Frontier OS — private beta feedback\n'];
  QUESTIONS.forEach((q, idx) => {
    const answer = answers[q.id] ?? '(no answer)';
    lines.push(`${idx + 1}. ${q.label}`);
    lines.push(`   ${answer}`);
    lines.push('');
  });
  return lines.join('\n');
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Build the mailto with answers prefilled as the email body
    const body   = buildEmailBody(answers);
    const mailto = `mailto:contact@getfrontieros.com?subject=${encodeURIComponent('Frontier OS feedback')}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    setSubmitted(true);
  }

  function handleClose() {
    setSubmitted(false);
    setAnswers({});
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Share feedback</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* Thank-you state */
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Your mail client should have opened</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your answers are prefilled in the email. Hit send to share them with the Frontier OS team.
              </p>
            </div>
            <a
              href={getFeedbackMailto()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open feedback email again
            </a>
            <button
              onClick={handleClose}
              className="mt-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <p className="text-xs text-muted-foreground">
                {QUESTIONS.length} questions — takes about 3 minutes. Answers are sent directly to{' '}
                <span className="font-mono">contact@getfrontieros.com</span> via your mail client.
              </p>

              {QUESTIONS.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <label className="text-xs font-medium text-foreground leading-snug block">
                    <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                    {q.label}
                  </label>

                  {q.kind === 'text' && (
                    <textarea
                      rows={2}
                      placeholder={q.placeholder}
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  )}

                  {q.kind === 'radio' && (
                    <div className="flex flex-col gap-1.5">
                      {q.options!.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswer(q.id, opt)}
                            className="accent-primary"
                          />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.kind === 'scale' && (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        {SCALE_OPTIONS.map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAnswer(q.id, val)}
                            className={`w-9 h-9 rounded-md border text-xs font-mono font-semibold transition-colors ${
                              answers[q.id] === val
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>{q.scaleLabels![0]}</span>
                        <span>{q.scaleLabels![1]}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0 bg-card">
              <p className="text-[10px] text-muted-foreground">
                Sent via your mail client to{' '}
                <span className="font-mono">contact@getfrontieros.com</span>
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-5 rounded-md transition-colors"
              >
                Open feedback email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

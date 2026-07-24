import React from 'react';
import { cn } from '@/lib/utils';

interface Dimension {
  label: string;
  score: number; // 0–10
  direction: 'higher-better' | 'lower-better';
  note: string;
}

const DIMENSIONS: Dimension[] = [
  { label: 'Workflow embeddedness',       score: 8, direction: 'higher-better', note: 'Telco operations are deeply integrated into operator systems' },
  { label: 'Data advantage',              score: 6, direction: 'higher-better', note: 'Some proprietary workflow logic, no clear unique dataset' },
  { label: 'Implementation complexity',   score: 7, direction: 'higher-better', note: 'Complex regulatory and carrier integrations raise switching cost' },
  { label: 'Switching costs',             score: 7, direction: 'higher-better', note: 'Moderate-high. Embedded in core telco workflows.' },
  { label: 'AI-native substitution risk', score: 4, direction: 'lower-better',  note: 'Moderate risk. Workflow logic is complex, while AI tooling continues to advance.' },
  { label: 'Services automation exposure',score: 5, direction: 'lower-better',  note: 'Implementation services could partially automate over time' },
  { label: 'Rebuildability risk',         score: 3, direction: 'lower-better',  note: 'Regulatory compliance and carrier integrations limit rebuildability' },
];

function getBarColor(score: number, direction: 'higher-better' | 'lower-better') {
  const effective = direction === 'lower-better' ? 10 - score : score;
  if (effective >= 7) return 'bg-green-500';
  if (effective >= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number, direction: 'higher-better' | 'lower-better') {
  const effective = direction === 'lower-better' ? 10 - score : score;
  if (effective >= 7) return { text: 'Positive', color: 'text-green-500' };
  if (effective >= 4) return { text: 'Moderate', color: 'text-amber-500' };
  return { text: 'Elevated', color: 'text-red-700' };
}

export function AIDisruptionScorecard() {
  return (
    <div className="space-y-5">
      {DIMENSIONS.map((dim) => {
        const barColor = getBarColor(dim.score, dim.direction);
        const { text, color } = getScoreLabel(dim.score, dim.direction);
        const pct = (dim.score / 10) * 100;

        return (
          <div key={dim.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">{dim.label}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn("text-xs font-semibold", color)}>{text}</span>
                <span className="text-xs font-mono text-muted-foreground">{dim.score}/10</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{dim.note}</p>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border italic">
        Indicative only. Requires product, customer and technical diligence to confirm.
      </p>
    </div>
  );
}

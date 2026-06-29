import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BlockingGaps() {
  const gaps = [
    {
      id: 1,
      level: 'critical',
      title: 'Customer Concentration Risk',
      description: 'Top 3 customers represent 41% of ARR. Requires contract review before close.',
    },
    {
      id: 2,
      level: 'moderate',
      title: 'Pending IP Assignment',
      description: '2 engineers have not completed IP assignment agreements. Legal must resolve pre-LOI.',
    },
    {
      id: 3,
      level: 'moderate',
      title: 'ARR Quality',
      description: '$2.1M of ARR classified as professional services. Adjust recurring revenue baseline to $16.1M.',
    }
  ];

  return (
    <div className="space-y-4">
      {gaps.map((gap) => (
        <div 
          key={gap.id}
          className={cn(
            "flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-lg border",
            gap.level === 'critical' 
              ? "bg-destructive/5 border-destructive/20" 
              : "bg-amber-500/5 border-amber-500/20"
          )}
        >
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0">
              {gap.level === 'critical' 
                ? <AlertOctagon className="h-5 w-5 text-destructive" />
                : <AlertTriangle className="h-5 w-5 text-amber-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  gap.level === 'critical' ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"
                )}>
                  {gap.level}
                </span>
                <h4 className="font-semibold text-foreground">{gap.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{gap.description}</p>
            </div>
          </div>
          <button 
            type="button" 
            className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Resolved
          </button>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface ProcessGateMapProps {
  completedStages: number;
}

export function ProcessGateMap({ completedStages }: ProcessGateMapProps) {
  const flowNodes = ["Input", "Research", "Evidence Registry", "Verification", "Analysis", "IC Output"];
  
  const gates = [
    { id: 1, label: "Entity resolved", req: 2 },
    { id: 2, label: "Financials extracted", req: 3 },
    { id: 3, label: "Conflicts adjudicated", req: 7 },
    { id: 4, label: "Valuation caveated", req: 9 },
    { id: 5, label: "IC readiness assigned", req: 11 },
  ];

  return (
    <div className="w-full rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {flowNodes.map((node, i) => (
          <React.Fragment key={node}>
            <div className="rounded border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground">
              {node}
            </div>
            {i < flowNodes.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {gates.map((gate) => {
          const isLit = completedStages >= gate.req;
          return (
            <div key={gate.id} className="flex flex-col items-center text-center gap-1.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isLit ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight font-medium",
                  isLit ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {gate.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
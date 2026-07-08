import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { StatusChip } from './StatusChip';

interface AgentTimelineProps {
  stages: {
    id: number;
    label: string;
    summary: string;
  }[];
  stageStatuses: Record<number, "pending" | "running" | "completed" | "warning">;
  elapsedTimes: Record<number, string>;
}

export function AgentTimeline({ stages, stageStatuses, elapsedTimes }: AgentTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeElement = containerRef.current.querySelector('.is-running');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [stageStatuses]);

  return (
    <div ref={containerRef} className="space-y-4 p-4">
      {stages.map((stage) => {
        const status = stageStatuses[stage.id] || "pending";
        const isRunning = status === "running";
        const isCompleted = status === "completed";
        const isWarning = status === "warning";

        return (
          <div
            key={stage.id}
            className={cn(
              "relative flex flex-col gap-2 rounded-md border p-3 transition-colors",
              isRunning ? "is-running border-blue-500/50 bg-blue-500/5 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "border-transparent hover:bg-muted/10"
            )}
          >
            {isRunning && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-l-md animate-pulse" />
            )}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                  {stage.id}
                </div>
                <span className={cn("text-sm font-medium", isRunning ? "text-blue-700" : "text-foreground")}>
                  {stage.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {elapsedTimes[stage.id] && (
                  <span className="font-mono text-xs text-muted-foreground">{elapsedTimes[stage.id]}</span>
                )}
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : isWarning ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : null}
              </div>
            </div>
            
            {(isRunning || isCompleted || isWarning) && (
              <div className="pl-7 flex items-center justify-between">
                <StatusChip 
                  status={status.charAt(0).toUpperCase() + status.slice(1)} 
                  variant={status} 
                />
              </div>
            )}
            
            {(isCompleted || isWarning) && (
              <div className="pl-7">
                <p className="text-xs italic text-muted-foreground">{stage.summary}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
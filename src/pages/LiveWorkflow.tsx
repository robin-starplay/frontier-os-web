import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Activity, Info } from 'lucide-react';
import { WorkspaceScopeIndicator } from '@/components/WorkspaceScopeIndicator';
import { AGENT_STAGES, EVIDENCE_CARDS } from '@/data/mockData';
import { AgentTimeline } from '@/components/AgentTimeline';
import { SourceHierarchy } from '@/components/SourceHierarchy';
import { ProcessGateMap } from '@/components/ProcessGateMap';
import { EvidenceCard } from '@/components/EvidenceCard';
import { StatusChip } from '@/components/StatusChip';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function LiveWorkflow() {
  const [, setLocation] = useLocation();
  const [stageStatuses, setStageStatuses] = useState<Record<number, "pending" | "running" | "completed" | "warning">>({});
  const [elapsedTimes, setElapsedTimes] = useState<Record<number, string>>({});
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);
  const [visibleEvidenceCount, setVisibleEvidenceCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);

  useEffect(() => {
    let cumulativeDelay = 500;
    const startTime = Date.now();
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const timer = setInterval(() => setTotalElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);

    AGENT_STAGES.forEach((stage, idx) => {
      timeoutIds.push(setTimeout(() => {
        setCurrentStageIdx(idx);
        setStageStatuses(prev => ({ ...prev, [stage.id]: "running" }));
      }, cumulativeDelay));

      timeoutIds.push(setTimeout(() => {
        setStageStatuses(prev => ({ ...prev, [stage.id]: stage.hasWarning ? "warning" : "completed" }));
        setElapsedTimes(prev => ({ ...prev, [stage.id]: (stage.durationMs / 1000).toFixed(1) + "s" }));
        if (idx <= 5) setVisibleEvidenceCount(prev => Math.min(prev + 1, EVIDENCE_CARDS.length));
        if (idx === AGENT_STAGES.length - 1) {
          setIsComplete(true);
          clearInterval(timer);
        }
      }, cumulativeDelay + stage.durationMs));

      cumulativeDelay += stage.durationMs + 200;
    });

    return () => {
      clearInterval(timer);
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  const currentStage = currentStageIdx >= 0 ? AGENT_STAGES[currentStageIdx] : null;
  const currentStatus = currentStage ? stageStatuses[currentStage.id] : null;
  const completedStagesCount = Object.values(stageStatuses).filter(s => s === "completed" || s === "warning").length;

  return (
    <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* LEFT SIDEBAR: Agent Timeline */}
      <div className="w-80 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border bg-sidebar/95 backdrop-blur z-10 sticky top-0">
          <h2 className="text-sm font-semibold text-sidebar-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Agent Pipeline
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AgentTimeline 
            stages={AGENT_STAGES} 
            stageStatuses={stageStatuses} 
            elapsedTimes={elapsedTimes} 
          />
        </div>
      </div>

      {/* CENTER: Main Stage Area */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-background p-6 custom-scrollbar">
        <div className="mb-6 bg-card px-4 py-3 rounded-md border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Analysis / <span className="font-semibold text-foreground">Cerillion</span> / {isComplete ? <span className="text-green-500">Completed</span> : <span className="text-blue-500">Running</span>}
            </div>
            <div className="font-mono text-sm text-foreground bg-muted px-2 py-1 rounded">
              Elapsed: {totalElapsed}s
            </div>
          </div>
          <WorkspaceScopeIndicator mode="url-only" />
        </div>

        {currentStage && (
          <motion.div
            key={currentStage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-border overflow-hidden relative">
              {currentStatus === "running" && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: currentStage.durationMs / 1000, ease: "linear" }}
                />
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{currentStage.label}</CardTitle>
                    {currentStatus && (
                      <StatusChip status={currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)} variant={currentStatus} />
                    )}
                  </div>
                  <ConfidenceBadge confidence={currentStage.confidence as any} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentStage.findings.map((finding, idx) => {
                    const isConflict = finding.toLowerCase().includes("conflict") || finding.toLowerCase().includes("absent");
                    const isWarning = finding.toLowerCase().includes("caveat") || finding.toLowerCase().includes("moderate") || finding.toLowerCase().includes("requires");
                    
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded bg-muted/30 border border-border">
                        {isConflict ? (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm font-medium text-foreground">{finding}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stage-specific trust notices */}
        {currentStage && !isComplete && (
          <>
            {currentStage.id === 6 && (
              <div className="mb-6 flex items-start gap-2 px-3 py-2.5 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Uploaded document claims are extracted as candidate evidence, not automatically verified facts.</span>
              </div>
            )}
            {currentStage.id === 7 && (
              <div className="mb-6 flex items-start gap-2 px-3 py-2.5 rounded-md bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Conflicts are preserved and routed to diligence questions. Official filings take precedence unless a user verifies otherwise.</span>
              </div>
            )}
            {currentStage.id === 20 && (
              <div className="mb-6 flex items-start gap-2 px-3 py-2.5 rounded-md bg-green-500/5 border border-green-500/20 text-xs text-green-400">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Report includes AI disruption section, source confidence, blocking gaps and caveats. All outputs require professional judgement and diligence confirmation.</span>
              </div>
            )}
          </>
        )}

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="border-green-500/50 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                  Analysis Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  All agent processes have finished successfully. The evidence registry is compiled and the draft IC memo is ready for review.
                </p>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setLocation('/results')}
                >
                  View Full Report <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="mt-auto">
          <ProcessGateMap completedStages={completedStagesCount} />
        </div>
      </div>

      {/* RIGHT SIDEBAR: Evidence & Hierarchy */}
      <div className="w-80 lg:w-96 border-l border-border bg-sidebar flex flex-col p-4 overflow-y-auto custom-scrollbar">
        <SourceHierarchy />
        
        <Separator className="my-6" />
        
        <h3 className="mb-4 text-sm font-semibold text-sidebar-foreground">Evidence Panel</h3>
        <div className="space-y-3">
          <AnimatePresence>
            {EVIDENCE_CARDS.slice(0, visibleEvidenceCount).map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <EvidenceCard {...card} />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {visibleEvidenceCount < EVIDENCE_CARDS.length && currentStageIdx >= 0 && (
            <div className="flex items-center justify-center p-4 border border-dashed border-border rounded bg-muted/10">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Listening for facts...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
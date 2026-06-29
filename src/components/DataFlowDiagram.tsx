import React from 'react';
import { Search, FolderOpen, BookOpen, Layers, BarChart2, FileOutput, ChevronRight, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowNode {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  gate?: string;
}

const NODES: FlowNode[] = [
  {
    label: 'Input',
    sublabel: 'URLs, filings, optional documents',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    gate: 'No confidential upload required',
  },
  {
    label: 'Company Workspace',
    sublabel: 'Scoped to one target company',
    icon: FolderOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    gate: 'Document claims are not auto-promoted',
  },
  {
    label: 'Evidence Registry',
    sublabel: 'Facts, claims, assumptions, unknowns',
    icon: BookOpen,
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/20',
    gate: 'Conflicts are surfaced',
  },
  {
    label: 'Source Hierarchy',
    sublabel: 'Official sources outrank lower-confidence claims',
    icon: Layers,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    label: 'Analysis Agents',
    sublabel: 'Valuation, strategic fit, AI risk, sanity checks',
    icon: BarChart2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    gate: 'Outputs are caveated',
  },
  {
    label: 'IC Output',
    sublabel: 'Recommendation, caveats and diligence plan',
    icon: FileOutput,
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/20',
  },
];

export function DataFlowDiagram() {
  return (
    <div className="w-full">
      {/* Desktop: horizontal flow */}
      <div className="hidden lg:flex items-start gap-0">
        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isLast = idx === NODES.length - 1;
          return (
            <React.Fragment key={node.label}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Node card */}
                <div className={cn(
                  "w-full rounded-lg border px-3 py-3 flex flex-col items-center text-center",
                  node.bg
                )}>
                  <div className={cn("h-7 w-7 rounded flex items-center justify-center mb-2", node.color, "bg-current/10")}>
                    <Icon className={cn("h-3.5 w-3.5", node.color)} />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug mb-1">{node.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{node.sublabel}</p>
                </div>
                {/* Gate below */}
                {node.gate && (
                  <div className="mt-3 flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border">
                    <ShieldAlert className="h-2.5 w-2.5 text-primary shrink-0" />
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">{node.gate}</span>
                  </div>
                )}
              </div>
              {!isLast && (
                <div className="flex items-start pt-4 px-1 shrink-0">
                  <ChevronRight className="h-4 w-4 text-border" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex lg:hidden flex-col gap-3">
        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isLast = idx === NODES.length - 1;
          return (
            <div key={node.label}>
              <div className={cn("rounded-lg border p-3 flex items-start gap-3", node.bg)}>
                <div className={cn("h-7 w-7 rounded flex items-center justify-center shrink-0 mt-0.5")}>
                  <Icon className={cn("h-3.5 w-3.5", node.color)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{node.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{node.sublabel}</p>
                  {node.gate && (
                    <div className="flex items-center gap-1 mt-2">
                      <ShieldAlert className="h-2.5 w-2.5 text-primary shrink-0" />
                      <span className="text-[9px] text-muted-foreground">{node.gate}</span>
                    </div>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center my-1">
                  <div className="h-3 w-px bg-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

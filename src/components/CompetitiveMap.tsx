import React from 'react';
import { cn } from '@/lib/utils';

interface MapItem {
  id: string;
  label: string;
  x: number; // 0–100 (left=data discovery, right=decision workflow)
  y: number; // 0–100 (top=software-M&A specificity, bottom=generic coverage)
  highlight?: boolean;
  description?: string;
}

const ITEMS: MapItem[] = [
  { id: 'databases',   label: 'Company databases',         x: 20, y: 80, description: 'Discovery & enrichment' },
  { id: 'datarooms',   label: 'Data rooms',                x: 40, y: 70, description: 'Document management' },
  { id: 'research',    label: 'Research platforms',        x: 30, y: 55, description: 'Market intelligence' },
  { id: 'ai-memo',     label: 'Generic AI memo tools',     x: 65, y: 75, description: 'One-shot summarisation' },
  { id: 'frontier',    label: 'Frontier OS',               x: 82, y: 18, highlight: true, description: 'Acquisition decision workflow' },
];

export function CompetitiveMap() {
  return (
    <div className="space-y-6">
      {/* The map */}
      <div className="relative w-full rounded-xl border border-border bg-card overflow-hidden" style={{ paddingBottom: '52%' }}>
        {/* Quadrant background shading */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/3 rounded-bl-full" />
        </div>

        {/* Axis labels */}
        {/* X-axis */}
        <div className="absolute bottom-4 left-4 text-[10px] font-mono text-muted-foreground/50 flex items-center gap-1">
          ← Data discovery
        </div>
        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-muted-foreground/50 flex items-center gap-1">
          Decision workflow →
        </div>
        {/* Y-axis */}
        <div
          className="absolute text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap"
          style={{ top: '50%', left: '4px', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center' }}
        >
          ↑ Software-M&A specificity
        </div>
        <div
          className="absolute text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap"
          style={{ bottom: '30%', left: '4px', transform: 'rotate(-90deg) translateX(50%)', transformOrigin: 'left center' }}
        >
          Generic coverage ↓
        </div>

        {/* Center lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-full h-px bg-border/40" />
          <div className="absolute h-full w-px bg-border/40" />
        </div>

        {/* Dots */}
        {ITEMS.map((item) => (
          <div
            key={item.id}
            className="absolute group"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={cn(
                "h-3 w-3 rounded-full border-2 cursor-default transition-all",
                item.highlight
                  ? "bg-primary border-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)] scale-125"
                  : "bg-muted-foreground/40 border-muted-foreground/50 hover:scale-125"
              )}
            />
            <div
              className={cn(
                "absolute z-10 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none",
                "bottom-full mb-1.5 left-1/2 -translate-x-1/2",
                item.highlight
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-popover text-popover-foreground border border-border"
              )}
            >
              {item.label}
              {item.description && (
                <div className={cn("mt-0.5 text-[9px]", item.highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {item.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Frontier OS does not replace company databases or data rooms. It connects public data and uploaded documents to the acquisition decision, assessing whether <em>this</em> target is attractive for <em>this</em> buyer.
      </p>
    </div>
  );
}

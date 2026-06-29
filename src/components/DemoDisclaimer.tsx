import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function DemoDisclaimer() {
  return (
    <footer className="w-full bg-muted/20 border-t border-border mt-auto">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-foreground">Frontier OS</span> is a decision-support workflow for software M&A.
            Outputs are indicative and require source review, professional judgement and diligence confirmation.
          </span>
        </div>
        <div className="text-xs text-muted-foreground/60 shrink-0 pl-5 sm:pl-0">
          Demo mode · No real analysis is performed
        </div>
      </div>
    </footer>
  );
}

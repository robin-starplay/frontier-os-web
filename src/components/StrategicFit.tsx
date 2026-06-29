import React from 'react';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function StrategicFit() {
  const dimensions = [
    { label: "Technology Compatibility", score: 88 },
    { label: "Customer Overlap", score: 62 },
    { label: "Revenue Synergy Potential", score: 79 },
    { label: "Cultural Alignment", score: 74 },
  ];

  return (
    <div className="p-6 rounded-lg bg-card border border-card-border shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Strategic Fit
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">81</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="space-y-5 mb-8">
        {dimensions.map((dim, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{dim.label}</span>
              <span className="font-mono text-xs font-medium">{dim.score}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  dim.score > 80 ? "bg-emerald-500" : dim.score > 65 ? "bg-primary" : "bg-amber-500"
                )}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 bg-secondary/50 rounded text-sm text-foreground/90 leading-relaxed border border-secondary-border">
        Crestline Software demonstrates strong strategic alignment with a platform acquisition thesis. Its vertical SaaS approach in construction tech creates meaningful cross-sell potential with existing portfolio companies. Integration complexity is moderate, with API-first architecture reducing technical friction.
      </div>
    </div>
  );
}

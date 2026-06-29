import React from 'react';
import { CheckCircle2, AlertTriangle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubScore {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

interface ScoreCardProps {
  title: string;
  score: number;
  status: 'green' | 'yellow' | 'red';
  subScores: SubScore[];
  className?: string;
}

export function ScoreCard({ title, score, status, subScores, className }: ScoreCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'green': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'yellow': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'red': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-secondary border-border';
    }
  };

  const getSubScoreIcon = (status: SubScore['status']) => {
    switch (status) {
      case 'good': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'critical': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case 'neutral': return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("flex flex-col p-5 rounded-lg bg-card border border-card-border hover:border-primary/20 transition-colors shadow-sm", className)}>
      <div className="flex items-start justify-between mb-6">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className={cn("px-2.5 py-1 rounded text-lg font-bold font-mono tracking-tight border", getStatusColor())}>
          {score}<span className="text-xs opacity-60 ml-0.5">/100</span>
        </div>
      </div>
      
      <div className="space-y-3 mt-auto">
        {subScores.map((sub, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              {getSubScoreIcon(sub.status)}
              {sub.label}
            </span>
            <span className="font-medium font-mono text-xs">{sub.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

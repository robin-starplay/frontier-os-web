import React from 'react';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle2, AlertTriangle, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EvidenceQuality() {
  const documents = [
    { name: "Q3 Financials", coverage: "Financial metrics", confidence: "high", status: "found" },
    { name: "Pitch Deck v4", coverage: "Market claims", confidence: "medium", status: "found" },
    { name: "Management Bio", coverage: "Team background", confidence: "medium", status: "found" },
    { name: "CRM Export", coverage: "Customer data", confidence: "low", status: "missing" },
    { name: "Technical Audit", coverage: "Architecture", confidence: "low", status: "missing" },
  ];

  return (
    <div className="p-6 rounded-lg bg-card border border-card-border shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Evidence Quality
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold font-mono">
            73%
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-2">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-secondary/50 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 font-medium rounded-tl">Document</th>
              <th className="px-4 py-2.5 font-medium">Coverage</th>
              <th className="px-4 py-2.5 font-medium rounded-tr">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc, i) => (
              <tr key={i} className={cn("transition-colors hover:bg-secondary/20", doc.status === 'missing' && "opacity-60")}>
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  {doc.status === 'missing' ? 
                    <FileQuestion className="h-4 w-4 text-muted-foreground" /> : 
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  }
                  <span className={cn(doc.status === 'missing' && "line-through text-muted-foreground")}>
                    {doc.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{doc.coverage}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {doc.confidence === 'high' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {doc.confidence === 'medium' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    {doc.confidence === 'low' && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    <span className="capitalize text-xs font-medium">
                      {doc.confidence} {doc.status === 'missing' && "— Missing"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-md flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-500/90 leading-tight">
          <strong className="font-semibold text-amber-500">2 key documents missing.</strong> Confidence would improve to 91% with CRM export and technical audit.
        </p>
      </div>
    </div>
  );
}

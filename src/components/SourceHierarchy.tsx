import React from 'react';

export function SourceHierarchy() {
  const tiers = [
    { label: "Official filings", color: "bg-green-500" },
    { label: "Audited annual reports", color: "bg-green-500" },
    { label: "Uploaded diligence documents", color: "bg-blue-500" },
    { label: "Company website / press", color: "bg-amber-500" },
    { label: "Aggregators", color: "bg-gray-500" },
  ];

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Source Hierarchy</h3>
      <div className="space-y-2">
        {tiers.map((tier, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tier {idx + 1}</span>
            <span className={`h-2 w-2 rounded-full ${tier.color}`} />
            <span className="text-xs text-foreground">{tier.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] italic text-muted-foreground">
        Higher tiers override lower tiers in conflict resolution.
      </p>
    </div>
  );
}
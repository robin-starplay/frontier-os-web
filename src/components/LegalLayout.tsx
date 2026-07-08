import React from 'react';

interface Section {
  title: string;
  content: React.ReactNode;
}

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  sections: Section[];
}

function DraftBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[11px] font-medium">
      Template draft for review before launch
    </span>
  );
}

export function LegalLayout({ title, subtitle, lastUpdated, sections }: LegalLayoutProps) {
  return (
    <div className="flex-1 w-full">
      {/* header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          <div className="mb-4">
            <DraftBadge />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{title}</h1>
          {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/60 mt-3">Last updated: {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* body */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <div className="space-y-10">
          {sections.map(({ title: sectionTitle, content }, i) => (
            <div key={i}>
              <h2 className="text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
                {i + 1}. {sectionTitle}
              </h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                {content}
              </div>
            </div>
          ))}
        </div>

        {/* contact section */}
        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-3">Contact</p>
          <p className="text-sm text-muted-foreground">Frontier Intelligence Systems Ltd</p>
          <p className="text-sm text-muted-foreground">71–75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</p>
          <a href="mailto:contact@getfrontieros.com" className="text-sm text-primary hover:underline">
            contact@getfrontieros.com
          </a>
        </div>
      </div>
    </div>
  );
}

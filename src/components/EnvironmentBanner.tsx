import React from 'react';

export const ENVIRONMENT_BANNER_COPY =
  'Private beta · Public-source screening only · Do not upload confidential information';

export function EnvironmentBanner() {
  return (
    <aside
      aria-label="Environment guidance"
      data-testid="environment-banner"
      className="w-full border-b border-border/70 bg-muted/30"
    >
      <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[13px] font-medium leading-5 text-muted-foreground md:px-8">
        {ENVIRONMENT_BANNER_COPY}
      </p>
    </aside>
  );
}

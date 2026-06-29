import React from 'react';
import { TrustBadge } from './TrustBadge';

interface WorkspaceScopeIndicatorProps {
  mode?: 'url-only' | 'document' | 'hybrid';
}

export function WorkspaceScopeIndicator({ mode = 'url-only' }: WorkspaceScopeIndicatorProps) {
  const modeLabel = mode === 'url-only' ? 'URL-only' : mode === 'document' ? 'Document' : 'Hybrid';

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <TrustBadge label="Mode" value={modeLabel} variant="default" />
      <TrustBadge label="Scope" value="Company project" variant="success" />
      <TrustBadge label="Doc claims" value="Require verification" variant="warning" />
      <TrustBadge label="Source hierarchy" value="Enabled" variant="success" />
      <TrustBadge label="Cross-company retrieval" value="Disabled" variant="muted" />
      <TrustBadge label="Beta" value="Private beta" variant="muted" />
    </div>
  );
}

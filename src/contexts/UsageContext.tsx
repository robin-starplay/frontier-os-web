import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBackendBaseUrl } from '@/lib/frontierApi';
import { getUserId, getWorkspaceId } from '@/lib/trialAccount';

type UsageStatus = 'loading' | 'ready' | 'unavailable';

export interface CanonicalUsageState {
  status: UsageStatus;
  screensUsed: number | null;
  screensLimit: number | null;
  screensRemaining: number | null;
  quotaExceeded: boolean | null;
}

interface UsageContextValue extends CanonicalUsageState {
  refreshUsage: () => Promise<void>;
  beginUsageRequest: () => void;
  reconcileUsageResponse: (body: unknown) => Promise<void>;
}

const unavailable: CanonicalUsageState = {
  status: 'unavailable',
  screensUsed: null,
  screensLimit: null,
  screensRemaining: null,
  quotaExceeded: null,
};

const UsageContext = createContext<UsageContextValue | null>(null);

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function parseBackendUsage(body: unknown): CanonicalUsageState | null {
  const root = record(body);
  if (!root) return null;
  const usageSummary = record(root.usage_summary);
  const analysisStart = record(usageSummary?.analysis_start);
  const urlBucket = record(root.url_only_analyses);
  const remaining = finiteNumber(root.screens_remaining)
    ?? finiteNumber(urlBucket?.remaining)
    ?? finiteNumber(root.remaining)
    ?? finiteNumber(analysisStart?.remaining);
  const limit = finiteNumber(root.screen_limit)
    ?? finiteNumber(urlBucket?.limit)
    ?? finiteNumber(root.limit)
    ?? finiteNumber(analysisStart?.limit);
  const used = finiteNumber(root.screens_used)
    ?? finiteNumber(urlBucket?.used)
    ?? (remaining !== null && limit !== null ? Math.max(0, limit - remaining) : null);
  if (remaining === null || limit === null || used === null) return null;

  const explicitQuota = typeof root.quota_exceeded === 'boolean'
    ? root.quota_exceeded
    : root.error === 'quota_exceeded' || root.status === 'quota_exceeded' || root.status === 'limit_reached'
      ? true
      : null;
  const derivedQuota = remaining <= 0;
  if (explicitQuota !== null && explicitQuota !== derivedQuota) {
    if (import.meta.env.DEV) console.error('Inconsistent usage state.');
    return unavailable;
  }

  return {
    status: 'ready',
    screensUsed: used,
    screensLimit: limit,
    screensRemaining: remaining,
    quotaExceeded: derivedQuota,
  };
}

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<CanonicalUsageState>({ ...unavailable, status: 'loading' });

  const refreshUsage = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const workspaceId = getWorkspaceId();
      const userId = getUserId();
      if (workspaceId) params.set('workspace_id', workspaceId);
      if (userId) params.set('user_id', userId);
      const base = getBackendBaseUrl();
      const path = `/api/usage/status${params.size ? `?${params}` : ''}`;
      const response = await fetch(base ? `${base}${path}` : path);
      if (!response.ok) throw new Error('usage_status_failed');
      const parsed = parseBackendUsage(await response.json());
      setUsage(parsed ?? unavailable);
    } catch {
      setUsage(unavailable);
    }
  }, []);

  const beginUsageRequest = useCallback(() => {
    setUsage(current => current.quotaExceeded ? { ...current, quotaExceeded: null, status: 'loading' } : current);
  }, []);

  const reconcileUsageResponse = useCallback(async (body: unknown) => {
    const parsed = parseBackendUsage(body);
    if (parsed) {
      setUsage(parsed);
      return;
    }
    await refreshUsage();
  }, [refreshUsage]);

  useEffect(() => { void refreshUsage(); }, [refreshUsage]);

  const value = useMemo(() => ({ ...usage, refreshUsage, beginUsageRequest, reconcileUsageResponse }), [usage, refreshUsage, beginUsageRequest, reconcileUsageResponse]);
  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage(): UsageContextValue {
  const context = useContext(UsageContext);
  if (!context) throw new Error('useUsage must be used within UsageProvider');
  return context;
}

export function UsageStatusNotice() {
  const usage = useUsage();
  const quotaVisible = usage.status === 'ready' && usage.quotaExceeded === true && usage.screensRemaining === 0;

  useEffect(() => {
    if (import.meta.env.DEV && usage.screensRemaining !== null && usage.screensRemaining > 0 && quotaVisible) {
      console.error('Inconsistent usage state.');
    }
  }, [quotaVisible, usage.screensRemaining]);

  if (usage.status === 'unavailable') {
    return <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-800">Usage status temporarily unavailable.</div>;
  }
  if (!quotaVisible) return null;
  return <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-center text-xs text-red-700">The quota has been exceeded.</div>;
}

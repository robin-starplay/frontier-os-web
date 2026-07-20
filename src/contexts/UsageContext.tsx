import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBackendBaseUrl } from '@/lib/frontierApi';
import { getUserId, getWorkspaceId } from '@/lib/trialAccount';

type UsageStatus = 'loading' | 'ready' | 'unavailable';

export interface CanonicalUsageState {
  status: UsageStatus;
  screensUsed: number | null;
  screensLimit: number | null;
  screensRemaining: number | null;
  screenQuotaExceeded: boolean | null;
  originationUsed: number | null;
  originationLimit: number | null;
  originationRemaining: number | null;
  originationQuotaEnforced: boolean;
  originationQuotaExceeded: boolean;
  originationMessage: string | null;
  originationRecommendedAction: string | null;
}

type UsageWorkflow = 'screen' | 'origination';

interface UsageContextValue extends CanonicalUsageState {
  refreshUsage: () => Promise<void>;
  beginUsageRequest: (workflow?: UsageWorkflow) => void;
  reconcileUsageResponse: (body: unknown) => Promise<void>;
}

const unavailable: CanonicalUsageState = {
  status: 'unavailable',
  screensUsed: null,
  screensLimit: null,
  screensRemaining: null,
  screenQuotaExceeded: null,
  originationUsed: null,
  originationLimit: null,
  originationRemaining: null,
  originationQuotaEnforced: false,
  originationQuotaExceeded: false,
  originationMessage: null,
  originationRecommendedAction: null,
};

const UsageContext = createContext<UsageContextValue | null>(null);

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(recordValue: Record<string, unknown> | null, key: string): boolean {
  return Boolean(recordValue && Object.prototype.hasOwnProperty.call(recordValue, key));
}

function nullableNumber(recordValue: Record<string, unknown> | null, key: string): number | null {
  return finiteNumber(recordValue?.[key]);
}

type ParsedUsageState = Partial<Omit<CanonicalUsageState, 'status'>>;

function parseBackendUsage(body: unknown): ParsedUsageState | null {
  const root = record(body);
  if (!root) return null;
  const usageSummary = record(root.usage_summary);
  const analysisStart = record(usageSummary?.analysis_start);
  const urlBucket = record(root.url_only_analyses);
  const screenRemaining = finiteNumber(root.screens_remaining)
    ?? finiteNumber(urlBucket?.remaining)
    ?? finiteNumber(analysisStart?.remaining);
  const screenLimit = finiteNumber(root.screen_limit)
    ?? finiteNumber(urlBucket?.limit)
    ?? finiteNumber(analysisStart?.limit);
  const screenUsed = finiteNumber(root.screens_used)
    ?? finiteNumber(urlBucket?.used)
    ?? (screenRemaining !== null && screenLimit !== null ? Math.max(0, screenLimit - screenRemaining) : null);
  const parsed: ParsedUsageState = {};
  if (screenRemaining !== null && screenLimit !== null && screenUsed !== null) {
    parsed.screensUsed = screenUsed;
    parsed.screensLimit = screenLimit;
    parsed.screensRemaining = screenRemaining;
    parsed.screenQuotaExceeded = screenRemaining <= 0;
  }

  const origination = record(root.origination);
  const quotaType = stringValue(root.quota_type)?.toLowerCase() || '';
  const originationQuotaResponse = quotaType === 'origination'
    || quotaType === 'origination_run'
    || quotaType === 'origination_runs';
  const originationFieldsPresent = Boolean(origination)
    || hasOwn(root, 'origination_limit')
    || hasOwn(root, 'origination_remaining')
    || hasOwn(root, 'origination_used')
    || originationQuotaResponse;

  if (originationFieldsPresent) {
    const originationLimit = hasOwn(origination, 'limit')
      ? nullableNumber(origination, 'limit')
      : hasOwn(root, 'origination_limit')
        ? nullableNumber(root, 'origination_limit')
        : originationQuotaResponse ? finiteNumber(root.limit) : null;
    const originationUsed = finiteNumber(origination?.used)
      ?? finiteNumber(root.origination_used)
      ?? (originationQuotaResponse ? finiteNumber(root.used) : null);
    const explicitRemaining = finiteNumber(origination?.remaining)
      ?? finiteNumber(root.origination_remaining)
      ?? (originationQuotaResponse ? finiteNumber(root.remaining) : null);
    const originationRemaining = explicitRemaining
      ?? (originationLimit !== null && originationUsed !== null
        ? Math.max(0, originationLimit - originationUsed)
        : null);
    const originationQuotaEnforced = origination?.quota_enforced === true
      || root.origination_quota_enforced === true
      || (originationQuotaResponse && originationLimit !== null);
    const originationQuotaExceeded = originationQuotaEnforced
      && originationLimit !== null
      && originationRemaining !== null
      && originationRemaining <= 0;
    const detail = record(root.detail);
    parsed.originationUsed = originationUsed;
    parsed.originationLimit = originationLimit;
    parsed.originationRemaining = originationRemaining;
    parsed.originationQuotaEnforced = originationQuotaEnforced;
    parsed.originationQuotaExceeded = originationQuotaExceeded;
    parsed.originationMessage = originationQuotaExceeded
      ? stringValue(origination?.message)
        ?? stringValue(root.message)
        ?? stringValue(detail?.message)
        ?? stringValue(root.reason)
      : null;
    parsed.originationRecommendedAction = originationQuotaExceeded
      ? stringValue(origination?.recommended_action)
        ?? stringValue(root.recommended_action)
        ?? stringValue(root.recommended_next_action)
      : null;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
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
      setUsage(parsed ? { ...unavailable, ...parsed, status: 'ready' } : unavailable);
    } catch {
      setUsage(unavailable);
    }
  }, []);

  const beginUsageRequest = useCallback((workflow: UsageWorkflow = 'screen') => {
    setUsage(current => workflow === 'origination'
      ? {
          ...current,
          originationQuotaExceeded: false,
          originationMessage: null,
          originationRecommendedAction: null,
        }
      : current.screenQuotaExceeded
        ? { ...current, screenQuotaExceeded: null, status: 'loading' }
        : current);
  }, []);

  const reconcileUsageResponse = useCallback(async (body: unknown) => {
    const parsed = parseBackendUsage(body);
    if (parsed) {
      setUsage(current => ({ ...current, ...parsed, status: 'ready' }));
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

export function ScreenQuotaNotice() {
  const usage = useUsage();
  const quotaVisible = usage.status === 'ready' && usage.screenQuotaExceeded === true && usage.screensRemaining === 0;
  if (!quotaVisible) return null;
  return <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-800">You have used your beta company screens for this month.</div>;
}

export function OriginationQuotaNotice() {
  const usage = useUsage();
  const quotaVisible = usage.status === 'ready'
    && usage.originationQuotaEnforced
    && usage.originationQuotaExceeded
    && usage.originationLimit !== null
    && usage.originationRemaining === 0
    && Boolean(usage.originationMessage);
  if (!quotaVisible) return null;
  return <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-800">{usage.originationMessage}</div>;
}

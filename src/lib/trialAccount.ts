// ─── Private-beta trial account scaffold ──────────────────────────────────────
// Supplementary to Clerk auth. Clerk owns identity; this module owns
// trial-plan metadata (limits, creation date, and backend workspace IDs).
// Usage counts are derived live from runHistory so they can never drift.
//
// localStorage keys written by this module:
//   frontier_trial_account    — primary record (all fields)
//   frontier_user_id          — individual key for easy access/debugging
//   frontier_workspace_id     — individual key for easy access/debugging
//   frontier_account          — JSON summary of account type and plan
//   frontier_workspace_session — session data from /api/workspace/session

import { getBackendBaseUrl } from './frontierApi';

export interface TrialAccount {
  plan_id: 'free_trial';
  url_screens_limit: number;
  document_trials_limit: number;
  created_at: string;
  // Set when the backend /api/trial/create-account call succeeds.
  // Both will be absent for localStorage-only users.
  workspace_id?: string;
  user_id?: string;
}

export interface WorkspaceProfile {
  name?: string;
  email?: string;
  org?: string;
  role?: string;
}

const TRIAL_KEY    = 'frontier_trial_account';
const USER_KEY     = 'frontier_user_id';
const WS_KEY       = 'frontier_workspace_id';
const ACCOUNT_KEY  = 'frontier_account';
const SESSION_KEY  = 'frontier_workspace_session';
const PROFILE_KEY = 'fos_profile';

// ── Read helpers ──────────────────────────────────────────────────────────────

export function safeJsonParse<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* unavailable */
  }
}

function readJsonStorage<T = unknown>(key: string): T | null {
  const raw = safeLocalStorageGet(key);
  if (!raw) return null;
  const parsed = safeJsonParse<T>(raw);
  if (parsed === null) safeLocalStorageRemove(key);
  return parsed;
}

export function getTrialAccount(): TrialAccount | null {
  const parsed = readJsonStorage<Partial<TrialAccount>>(TRIAL_KEY);
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.plan_id !== 'free_trial') {
    safeLocalStorageRemove(TRIAL_KEY);
    return null;
  }
  return {
    plan_id: 'free_trial',
    url_screens_limit: typeof parsed.url_screens_limit === 'number' ? parsed.url_screens_limit : 5,
    document_trials_limit: typeof parsed.document_trials_limit === 'number' ? parsed.document_trials_limit : 2,
    created_at: typeof parsed.created_at === 'string' ? parsed.created_at : new Date().toISOString(),
    workspace_id: typeof parsed.workspace_id === 'string' ? parsed.workspace_id : undefined,
    user_id: typeof parsed.user_id === 'string' ? parsed.user_id : undefined,
  };
}

/** Returns the stored workspace_id, or null if not yet provisioned. */
export function getWorkspaceId(): string | null {
  return (
    getTrialAccount()?.workspace_id ??
    safeLocalStorageGet(WS_KEY) ??
    null
  );
}

/** Returns the stored user_id, or null if not yet provisioned. */
export function getUserId(): string | null {
  return (
    getTrialAccount()?.user_id ??
    safeLocalStorageGet(USER_KEY) ??
    null
  );
}

/** Returns the cached workspace session data, or null if not available. */
export function getWorkspaceSession(): Record<string, unknown> | null {
  const parsed = readJsonStorage<Record<string, unknown>>(SESSION_KEY);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

export function getWorkspaceProfile(): WorkspaceProfile | null {
  const parsed = readJsonStorage<WorkspaceProfile>(PROFILE_KEY);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

export function hasLocalWorkspaceSession(): boolean {
  return Boolean(getTrialAccount() || getWorkspaceId());
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Creates the trial account if not already present. Safe to call repeatedly. */
export function ensureTrialAccount(): TrialAccount {
  const existing = getTrialAccount();
  if (existing) return existing;
  const workspaceId = safeLocalStorageGet(WS_KEY) ?? undefined;
  const userId = safeLocalStorageGet(USER_KEY) ?? undefined;
  const account: TrialAccount = {
    plan_id:                'free_trial',
    url_screens_limit:      5,
    document_trials_limit:  2,
    created_at:             new Date().toISOString(),
    workspace_id:           workspaceId,
    user_id:                userId,
  };
  try { localStorage.setItem(TRIAL_KEY, JSON.stringify(account)); } catch { /* quota */ }
  // Write account summary key
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
      plan_id: 'free_trial',
      mode:    'local',
      created_at: account.created_at,
    }));
  } catch { /* quota */ }
  return account;
}

function backendUrl(path: string): string {
  const base = getBackendBaseUrl();
  return base ? `${base}${path}` : path;
}

/**
 * Persist workspace_id + user_id to all individual keys.
 * Called after a successful /api/trial/create-account response.
 */
function persistWorkspaceIds(workspace_id: string, user_id: string, base: TrialAccount) {
  const updated: TrialAccount = { ...base, workspace_id, user_id };
  try { localStorage.setItem(TRIAL_KEY, JSON.stringify(updated)); } catch { /* quota */ }
  try { localStorage.setItem(USER_KEY, user_id); }        catch { /* quota */ }
  try { localStorage.setItem(WS_KEY, workspace_id); }     catch { /* quota */ }
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
      plan_id:      'free_trial',
      mode:         'backend',
      workspace_id,
      user_id,
      created_at:   updated.created_at,
    }));
  } catch { /* quota */ }
}

/**
 * Call POST /api/trial/create-account to provision a backend workspace.
 * Stores returned workspace_id + user_id into all localStorage keys.
 * Safe to call repeatedly — skips the network call if IDs are already stored.
 */
export async function createBackendAccount(
  buyerName?: string,
  buyerThesis?: string,
): Promise<{ workspace_id: string; user_id: string } | null> {
  // Already provisioned — return cached IDs
  const existing = getTrialAccount();
  if (existing?.workspace_id && existing?.user_id) {
    return { workspace_id: existing.workspace_id, user_id: existing.user_id };
  }

  try {
    const res = await fetch(backendUrl('/api/trial/create-account'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name:    buyerName    ?? '',
        buyer_thesis:  buyerThesis  ?? '',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.workspace_id !== 'string' || typeof data.user_id !== 'string') return null;

    const base = existing ?? {
      plan_id:               'free_trial' as const,
      url_screens_limit:     5,
      document_trials_limit: 2,
      created_at:            new Date().toISOString(),
    };
    persistWorkspaceIds(data.workspace_id, data.user_id, base);
    return { workspace_id: data.workspace_id, user_id: data.user_id };
  } catch {
    return null;
  }
}

/**
 * Fetch the workspace session from /api/workspace/session.
 * Caches the result in localStorage under frontier_workspace_session.
 * Returns null on any failure (endpoint may not exist yet).
 */
export async function fetchWorkspaceSession(
  workspaceId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      backendUrl(`/api/workspace/session?workspace_id=${encodeURIComponent(workspaceId)}`),
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* quota */ }
    return data;
  } catch {
    return null;
  }
}

// ── Clear helpers ─────────────────────────────────────────────────────────────

/** Clears only the trial account record. Preserved for backward compatibility. */
export function clearTrialAccount(): void {
  try { localStorage.removeItem(TRIAL_KEY); } catch { /* quota */ }
}

/**
 * Clears all local workspace data including run history, session, and account keys.
 * Use this for a full workspace reset on the Settings page.
 */
export function clearLocalWorkspace(): void {
  const keys = [
    TRIAL_KEY,
    USER_KEY,
    WS_KEY,
    ACCOUNT_KEY,
    SESSION_KEY,
    PROFILE_KEY,
    'fos_run_history',
    'fos_active_run_id',
    'fos_beta_banner_dismissed',
  ];
  keys.forEach(key => { try { localStorage.removeItem(key); } catch { /* quota */ } });
}

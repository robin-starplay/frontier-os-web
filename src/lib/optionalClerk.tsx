import React, { useEffect, useRef, useState } from 'react';
import { useClerk, useUser, UserButton } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Link } from 'wouter';
import {
  clearLocalWorkspace,
  fetchWorkspaceSession,
  getWorkspaceId,
  getWorkspaceProfile,
  getWorkspaceSession,
} from './trialAccount';
import { useUsage } from '@/contexts/UsageContext';

const rawClerkKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim();

function resolveClerkPublishableKey(value: string | undefined): string {
  if (!value) return '';
  try {
    return publishableKeyFromHost(window.location.hostname, value);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[auth] Ignoring invalid Clerk publishable key', error);
    }
    return '';
  }
}

export const clerkPublishableKey = resolveClerkPublishableKey(rawClerkKey);

export const clerkEnabled = Boolean(clerkPublishableKey);

export function useOptionalUser() {
  if (!clerkEnabled) {
    return { isLoaded: true, isSignedIn: false, user: null };
  }
  return useUser();
}

export function useOptionalClerk() {
  if (!clerkEnabled) {
    return { signOut: async () => undefined };
  }
  return useClerk();
}

export function OptionalUserButton() {
  if (!clerkEnabled) {
    return <LocalWorkspaceMenu />;
  }
  return <UserButton />;
}

function initialsFrom(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return 'BW';
}

function shortId(value: string | null): string {
  if (!value) return 'local';
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function LocalWorkspaceMenu() {
  const usage = useUsage();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const profile = getWorkspaceProfile();
  const session = getWorkspaceSession();
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetchWorkspaceSession(workspaceId).then(refreshed => {
      if (!cancelled && refreshed) setVersion(v => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const usageAvailable = usage.status === 'ready';
  const displayName = profile?.org || profile?.name || 'Beta workspace';
  const subtitle = profile?.email || `Workspace ${shortId(workspaceId)}`;
  const initials = initialsFrom(profile?.name || profile?.org || displayName);
  void version;

  function resetWorkspace() {
    const confirmed = window.confirm('Reset local workspace/session on this browser? Saved local runs will be cleared.');
    if (!confirmed) return;
    clearLocalWorkspace();
    setOpen(false);
    window.location.href = '/create-workspace';
  }

  return (
    <div className="relative" ref={ref}>
      <button
        data-header-account
        type="button"
        aria-label="Open workspace menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="inline-flex h-9 min-h-9 items-center gap-2 rounded-md border border-border bg-card pl-1 pr-2.5 transition-colors hover:bg-accent/40"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
          {initials}
        </span>
        {usageAvailable && <span className="hidden text-[13px] leading-5 text-muted-foreground sm:inline">
          {usage.screensRemaining}/{usage.screensLimit}
        </span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/40">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-mono text-foreground">{shortId(workspaceId)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Screens remaining</span>
              <span className="font-mono text-foreground">{usageAvailable ? `${usage.screensRemaining}/${usage.screensLimit}` : 'Unavailable'}</span>
            </div>
            {typeof session?.status === 'string' && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-mono text-foreground">{session.status}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border py-1">
            <Link
              href="/app/cockpit"
              className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
              onClick={() => setOpen(false)}
            >
              Open workspace
            </Link>
            <Link
              href="/app/run"
              className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
              onClick={() => setOpen(false)}
            >
              Beta workspace
            </Link>
            <button
              type="button"
              onClick={resetWorkspace}
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              Reset local workspace/session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

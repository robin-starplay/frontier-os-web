import React from 'react';
import { useClerk, useUser, UserButton } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';

const rawClerkKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim();

export const clerkPublishableKey = rawClerkKey
  ? publishableKeyFromHost(window.location.hostname, rawClerkKey)
  : '';

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
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
        BETA WORKSPACE
      </span>
    );
  }
  return <UserButton />;
}

import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccessTier = 'public' | 'free' | 'paid';

export type GateReason =
  | 'full-screen'       // public → needs account for full result
  | 'upload'            // public/free → needs account/paid for upload
  | 'export'            // public/free → needs paid for exports
  | 'save-cockpit'      // public → needs account to save
  | 'trial-limit'       // free → hit 5-screen quota
  | 'doc-limit';        // free → hit 2-doc-assisted quota

interface AccessState {
  tier: AccessTier;
  /** Whether the gate modal is open */
  gateOpen: boolean;
  gateReason: GateReason;
  /** Open the gate modal with a specific reason */
  openGate: (reason: GateReason) => void;
  closeGate: () => void;
  /** For demo: allow switching tier to preview access levels */
  setTier: (t: AccessTier) => void;
  /** Convenience: returns true when user cannot access a feature */
  isLocked: (feature: GateReason) => boolean;
}

const AccessContext = createContext<AccessState | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  // Default: public visitor (no account) — shows locked sections throughout demo
  const [tier, setTier] = useState<AccessTier>('public');
  const [gateOpen, setGateOpen] = useState(false);
  const [gateReason, setGateReason] = useState<GateReason>('full-screen');

  const openGate = useCallback((reason: GateReason) => {
    setGateReason(reason);
    setGateOpen(true);
  }, []);

  const closeGate = useCallback(() => setGateOpen(false), []);

  const isLocked = useCallback((feature: GateReason): boolean => {
    if (tier === 'paid') return false;
    if (tier === 'free') {
      // free users can access save-cockpit and full-screen; not exports or uploads
      if (feature === 'export') return true;
      if (feature === 'upload') return false; // free gets 2 doc-assisted trials
      if (feature === 'doc-limit') return true;
      return false;
    }
    // public: everything is locked
    return true;
  }, [tier]);

  return (
    <AccessContext.Provider value={{ tier, gateOpen, gateReason, openGate, closeGate, setTier, isLocked }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used inside AccessProvider');
  return ctx;
}

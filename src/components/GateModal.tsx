import React, { useEffect, useRef } from 'react';
import { X, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAccess, type GateReason } from '@/contexts/AccessContext';
import { cn } from '@/lib/utils';

// ─── Gate content map ─────────────────────────────────────────────────────────

interface GateContent {
  icon: React.ReactNode;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  note?: string;
}

function gateContent(reason: GateReason): GateContent {
  switch (reason) {
    case 'trial-limit':
    case 'doc-limit':
      return {
        icon: <Sparkles className="w-5 h-5 text-primary" />,
        heading: 'Trial analyses used.',
        body: 'You have used your trial analyses. Request private beta access to run more screens, use document-assisted workflows and access full exports.',
        primaryLabel: 'Request private beta access',
        primaryHref: '/request-pilot',
        secondaryLabel: 'View pricing',
        secondaryHref: '/pricing',
        note: 'No payment required during private beta.',
      };
    case 'export':
      return {
        icon: <Lock className="w-5 h-5 text-primary" />,
        heading: 'Exports require Team / Platform or above.',
        body: 'Basic exports are available on Starter. PowerPoint IC packs and Excel diligence trackers are available on Team / Platform and above.',
        primaryLabel: 'Request private beta access',
        primaryHref: '/request-pilot',
        secondaryLabel: 'View pricing',
        secondaryHref: '/pricing',
        note: 'Private beta pricing is available on request.',
      };
    case 'upload':
      return {
        icon: <Lock className="w-5 h-5 text-primary" />,
        heading: 'Document upload requires an account.',
        body: 'Free accounts include 2 document-assisted trial analyses. Create a free account to try document-assisted workflows.',
        primaryLabel: 'Create free account',
        primaryHref: '/request-pilot',
        secondaryLabel: 'View what\'s included',
        secondaryHref: '/pricing',
        note: 'Free trial includes 5 URL-only screens and 2 document-assisted analyses.',
      };
    case 'save-cockpit':
      return {
        icon: <Lock className="w-5 h-5 text-primary" />,
        heading: 'Deal Cockpit requires an account.',
        body: 'Save screened targets, track pipeline status and record decisions. Available on free accounts and above.',
        primaryLabel: 'Create free account',
        primaryHref: '/request-pilot',
        secondaryLabel: 'View pricing',
        secondaryHref: '/pricing',
        note: 'Free trial includes basic saved runs.',
      };
    case 'full-screen':
    default:
      return {
        icon: <Lock className="w-5 h-5 text-primary" />,
        heading: 'Create a free account to unlock the full screen.',
        body: 'The sample screen shows a partial result. A free account unlocks the full evidence trail, AI disruption detail, buyer-specific fit and saved runs.',
        primaryLabel: 'Create free account',
        primaryHref: '/request-pilot',
        secondaryLabel: 'View what\'s included',
        secondaryHref: '/pricing',
        note: 'Free trial: 5 URL-only screens and 2 document-assisted analyses. No payment required.',
      };
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function GateModal() {
  const { gateOpen, gateReason, closeGate } = useAccess();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button when modal opens; return focus on close
  useEffect(() => {
    if (!gateOpen) return;
    // Store the previously-focused element so we can restore it
    const previously = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { previously?.focus(); };
  }, [gateOpen]);

  // Esc key closes the modal; Tab key is trapped inside the panel
  useEffect(() => {
    if (!gateOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeGate(); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(el => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [gateOpen, closeGate]);

  if (!gateOpen) return null;

  const content = gateContent(gateReason);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={closeGate}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-heading"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        ref={panelRef}
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
          {/* header */}
          <div className="flex items-start justify-between gap-4 p-6 pb-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {content.icon}
            </div>
            <button
              ref={closeRef}
              onClick={closeGate}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* body */}
          <div className="p-6">
            <h2 id="gate-heading" className="text-lg font-bold text-foreground mb-2">
              {content.heading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {content.body}
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-2.5">
              <Link href={content.primaryHref} onClick={closeGate}>
                <Button className="w-full h-10">
                  {content.primaryLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
              {content.secondaryLabel && content.secondaryHref && (
                <Link href={content.secondaryHref} onClick={closeGate}>
                  <Button variant="outline" className="w-full h-10">
                    {content.secondaryLabel}
                  </Button>
                </Link>
              )}
            </div>

            {/* Note */}
            {content.note && (
              <p className="text-xs text-muted-foreground/60 text-center mt-4">
                {content.note}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Inline gate button ───────────────────────────────────────────────────────
// Compact version for action bars (export buttons etc.)

interface GateButtonProps {
  reason: GateReason;
  children: React.ReactNode;
  className?: string;
}

export function GateButton({ reason, children, className }: GateButtonProps) {
  const { openGate } = useAccess();
  return (
    <button
      type="button"
      onClick={() => openGate(reason)}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <Lock className="w-3 h-3 text-muted-foreground/60" />
      {children}
    </button>
  );
}

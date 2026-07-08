import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'frontier_theme_preference';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    return 'light';
  }
  return 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference;
}

function applyTheme(preference: ThemePreference) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const resolvedTheme = resolveTheme(preference);

  useEffect(() => {
    applyTheme(preference);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Ignore private browsing or quota failures; theme still applies in-memory.
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const onChange = () => applyTheme('system');
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [preference]);

  return {
    preference,
    resolvedTheme,
    setPreference: setPreferenceState,
  };
}

export function ThemeScript() {
  useEffect(() => {
    applyTheme(readPreference());
  }, []);
  return null;
}

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { preference, resolvedTheme, setPreference } = useThemePreference();
  const options: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  if (compact) {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    return (
      <button
        type="button"
        onClick={() => setPreference(next)}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
          className,
        )}
        aria-label={`Switch to ${next} theme`}
        title={`Switch to ${next} theme`}
      >
        {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-card p-0.5 shadow-xs',
        className,
      )}
      aria-label="Theme"
    >
      {options.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded px-2 text-[var(--font-size-nav)] font-medium leading-[var(--line-height-compact)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
            )}
            aria-pressed={active}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

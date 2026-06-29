import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, WifiOff } from 'lucide-react';
import { checkHealth, getBackendBaseUrl, isBackendConfigured } from '@/lib/frontierApi';
import { cn } from '@/lib/utils';

type Status = 'checking' | 'connected' | 'unavailable' | 'unconfigured';

interface BackendStatusBadgeProps {
  /** Show full URL beneath the status line */
  showUrl?: boolean;
  /** Show last-checked time */
  showCheckTime?: boolean;
  className?: string;
}

export function BackendStatusBadge({
  showUrl = false,
  showCheckTime = false,
  className,
}: BackendStatusBadgeProps) {
  const [status, setStatus]       = useState<Status>(isBackendConfigured() ? 'checking' : 'unconfigured');
  const [detail, setDetail]       = useState('');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [busy, setBusy]           = useState(false);

  const doCheck = useCallback(async () => {
    if (!isBackendConfigured()) { setStatus('unconfigured'); return; }
    setBusy(true);
    setStatus('checking');
    const res = await checkHealth();
    setCheckedAt(new Date());
    setBusy(false);
    if (res.ok) {
      setStatus('connected');
      setDetail([res.data?.environment, res.data?.service].filter(Boolean).join(' · ') || '');
    } else {
      setStatus('unavailable');
      setDetail(res.error ?? '');
    }
  }, []);

  useEffect(() => { doCheck(); }, [doCheck]);

  const baseUrl = getBackendBaseUrl();

  const cfg: Record<Status, { label: string; dot: string; text: string }> = {
    checking:     { label: 'Checking backend…',       dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
    connected:    { label: 'Backend connected',        dot: 'bg-green-400',           text: 'text-green-400' },
    unavailable:  { label: 'Backend unavailable',      dot: 'bg-amber-400',           text: 'text-amber-400' },
    unconfigured: { label: 'Backend not configured',   dot: 'bg-muted-foreground/30', text: 'text-muted-foreground/60' },
  };
  const c = cfg[status];

  return (
    <div className={cn('space-y-1', className)}>
      {/* Status line */}
      <div className={cn('flex items-center gap-2 text-xs', c.text)}>
        <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
        {busy
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : status === 'connected' ? <Activity className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span className="font-medium">{c.label}</span>
        {status === 'connected' && detail && (
          <span className="text-muted-foreground font-normal">· {detail}</span>
        )}
        <button
          type="button"
          onClick={doCheck}
          disabled={busy}
          className="ml-1 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors disabled:opacity-40"
        >
          recheck
        </button>
      </div>

      {/* Error detail */}
      {status === 'unavailable' && detail && (
        <p className="text-[10px] text-muted-foreground/60 pl-5">{detail}</p>
      )}

      {/* Fallback note */}
      {status === 'unavailable' && (
        <p className="text-[10px] text-muted-foreground/50 pl-5">
          Using local preview state. New runs will show static example data.
        </p>
      )}

      {/* Not configured note */}
      {status === 'unconfigured' && (
        <p className="text-[10px] text-muted-foreground/50 pl-5">
          Set <span className="font-mono">VITE_FRONTIER_API_BASE_URL</span> to connect to Railway.
        </p>
      )}

      {/* API URL */}
      {showUrl && baseUrl && (
        <p className="text-[10px] text-muted-foreground/50 font-mono pl-5 break-all">{baseUrl}</p>
      )}

      {/* Check time */}
      {showCheckTime && checkedAt && (
        <p className="text-[10px] text-muted-foreground/40 pl-5">
          Last checked {checkedAt.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

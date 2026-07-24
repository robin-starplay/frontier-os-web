export const ORIGINATION_STAGE_IDS = [
  'structuring_thesis',
  'expanding_queries',
  'searching_sources',
  'resolving_identities',
  'ranking_candidates',
  'quality_check',
  'saving_workspace',
] as const;

export type OriginationStageId = typeof ORIGINATION_STAGE_IDS[number];
export type OriginationExecutionStatus = 'idle' | 'running' | 'completed' | 'partial' | 'failed';
export type OriginationStageStatus = 'pending' | 'running' | 'completed' | 'warning' | 'failed';

export interface OriginationExecutionStage {
  id: OriginationStageId;
  status: OriginationStageStatus;
  count?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface OriginationExecution {
  runId: string | null;
  status: OriginationExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  stages: Partial<Record<OriginationStageId, OriginationExecutionStage>>;
  finalEvent?: {
    status: OriginationStageStatus | 'partial';
    count?: number;
    message?: string;
  };
  hasDetailedTelemetry: boolean;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function positiveCount(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function executionStatus(value: unknown): OriginationExecutionStatus {
  const status = text(value).toLowerCase();
  if (status === 'completed' || status === 'complete' || status === 'ok') return 'completed';
  if (status === 'partial' || status === 'partial_success' || status === 'warning') return 'partial';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'running' || status === 'active' || status === 'pending') return 'running';
  return 'idle';
}

function stageStatus(value: unknown): OriginationStageStatus {
  const status = text(value).toLowerCase();
  if (status === 'complete' || status === 'completed' || status === 'ok') return 'completed';
  if (status === 'active' || status === 'running') return 'running';
  if (status === 'warning' || status === 'partial' || status === 'partial_success') return 'warning';
  if (status === 'failed' || status === 'error') return 'failed';
  return 'pending';
}

function stageId(value: unknown): OriginationStageId | null {
  const normalized = text(value).toLowerCase();
  return ORIGINATION_STAGE_IDS.includes(normalized as OriginationStageId)
    ? normalized as OriginationStageId
    : null;
}

export function mergeOriginationExecution(
  current: OriginationExecution | null,
  incoming: OriginationExecution,
): OriginationExecution {
  const sameRun = !current?.runId || !incoming.runId || current.runId === incoming.runId;
  const stages = sameRun ? { ...(current?.stages ?? {}) } : {};
  for (const [id, stage] of Object.entries(incoming.stages) as Array<[OriginationStageId, OriginationExecutionStage]>) {
    stages[id] = {
      ...stages[id],
      ...stage,
      count: stage.count ?? stages[id]?.count,
      message: stage.message || stages[id]?.message,
      details: { ...(stages[id]?.details ?? {}), ...(stage.details ?? {}) },
    };
  }
  return {
    ...current,
    ...incoming,
    runId: incoming.runId ?? current?.runId ?? null,
    stages,
    hasDetailedTelemetry: Boolean(current?.hasDetailedTelemetry || incoming.hasDetailedTelemetry),
  };
}

export function parseOriginationExecution(payload: UnknownRecord): OriginationExecution | null {
  const execution = record(payload.execution);
  const manifest = record(payload.execution_manifest);
  const rawEvents = execution?.events ?? manifest?.events;
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const runId = text(execution?.run_id ?? manifest?.run_id ?? payload.run_id ?? payload.origination_id) || null;

  if (events.length > 0) {
    let parsed: OriginationExecution = {
      runId,
      status: executionStatus(execution?.status ?? manifest?.pipeline_status ?? payload.status),
      startedAt: text(execution?.started_at) || undefined,
      completedAt: text(execution?.completed_at) || undefined,
      stages: {},
      hasDetailedTelemetry: true,
    };
    for (const rawEvent of events) {
      const event = record(rawEvent);
      if (!event) continue;
      const id = stageId(event.event ?? event.stage ?? event.id);
      const eventName = text(event.event ?? event.stage ?? event.id).toLowerCase();
      if (!id) {
        if (eventName === 'completed' || eventName === 'failed') {
          parsed.finalEvent = {
            status: eventName === 'failed' ? 'failed' : stageStatus(event.status),
            count: positiveCount(event.count),
            message: text(event.message) || undefined,
          };
        }
        continue;
      }
      parsed = mergeOriginationExecution(parsed, {
        runId,
        status: parsed.status,
        stages: {
          [id]: {
            id,
            status: stageStatus(event.status),
            count: positiveCount(event.count),
            message: text(event.message) || undefined,
            details: record(event.details) ?? undefined,
          },
        },
        hasDetailedTelemetry: true,
      });
    }
    return parsed;
  }

  const legacy = payload.progress_stages ?? payload.pipeline_stages ?? payload.stages;
  if (Array.isArray(legacy) && legacy.length > 0) {
    const stages: OriginationExecution['stages'] = {};
    for (const rawStage of legacy) {
      const item = record(rawStage);
      if (!item) continue;
      const id = stageId(item.id ?? item.stage);
      if (!id) continue;
      stages[id] = {
        id,
        status: stageStatus(item.status),
        count: positiveCount(item.item_count ?? item.count),
        message: text(item.explanation ?? item.message) || undefined,
      };
    }
    return {
      runId,
      status: executionStatus(payload.status),
      stages,
      hasDetailedTelemetry: false,
    };
  }

  return null;
}

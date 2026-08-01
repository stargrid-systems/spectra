import type { ComputedRef, InjectionKey, Ref } from "vue";
import { inject } from "vue";
import type {
  BootResponse,
  LogEvent,
  LogSpan,
} from "~~/modules/aperture/runtime/types";
import type { LogsState } from "~/composables/useLogsFilters";
import type { BadgeColor } from "~/utils/logLevels";

type TargetOptionsRef = ReturnType<typeof useLogTargets>["data"];

export interface LogsContext {
  filters: LogsState;
  inlineFields: Ref<boolean>;
  boots: Ref<BootResponse[]>;
  targetOptions: TargetOptionsRef;
  levelColors: Record<string, BadgeColor>;
  computedSince: ComputedRef<string | undefined>;
  formatTimestamp: (ts: Temporal.Instant) => string;
  formatDuration: (startedAt: Temporal.Instant, endedAt?: Temporal.Instant | null) => string;
  focusSpan: (spanId: string) => void;
  showAllSpans: () => void;
  onRefresh: (fn: () => void) => void;
  refresh: () => void;
  spanCache: Ref<Map<string, LogSpan>>;
  spanEventsCache: Ref<Map<string, LogEvent[]>>;
  ensureSpan: (id: string) => Promise<LogSpan | null>;
  ensureSpanEvents: (id: string) => Promise<LogEvent[]>;
}

export const useLogsContextKey = Symbol() as InjectionKey<LogsContext>;

export function useLogsContext(): LogsContext {
  const ctx = inject(useLogsContextKey);
  if (!ctx) {
    throw new Error("useLogsContext() must be used within developer/logs.vue");
  }
  return ctx;
}

export const timeRangeDurations: Record<string, Temporal.Duration> = {
  "5m": Temporal.Duration.from({ minutes: 5 }),
  "15m": Temporal.Duration.from({ minutes: 15 }),
  "1h": Temporal.Duration.from({ hours: 1 }),
  "6h": Temporal.Duration.from({ hours: 6 }),
  "12h": Temporal.Duration.from({ hours: 12 }),
  "24h": Temporal.Duration.from({ hours: 24 }),
  "7d": Temporal.Duration.from({ days: 7 }),
  "30d": Temporal.Duration.from({ days: 30 }),
};

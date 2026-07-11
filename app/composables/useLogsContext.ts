import type { ComputedRef, InjectionKey, Ref } from "vue";
import { inject } from "vue";
import type { BootResponse } from "~~/modules/aperture/runtime/types";
import type { LogsState } from "~/composables/useLogsFilters";

type TargetOptionsRef = ReturnType<typeof useLogTargets>["data"];

export interface LogsContext {
  filters: LogsState;
  inlineFields: Ref<boolean>;
  boots: Ref<BootResponse[]>;
  targetOptions: TargetOptionsRef;
  levelColors: Record<
    string,
    "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral"
  >;
  computedSince: ComputedRef<string | undefined>;
  formatDuration: (startedAt: Temporal.Instant, endedAt?: Temporal.Instant | null) => string;
  focusSpan: (spanId: string) => void;
  showAllSpans: () => void;
  onRefresh: (fn: () => void) => void;
  refresh: () => void;
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

export function formatTimestamp(ts: Temporal.Instant): string {
  return ts.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function asFields(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function formatFieldsInline(fields: unknown): string {
  const f = asFields(fields);
  if (!f) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(f)) {
    if (key === "message") continue;
    parts.push(`${key}=${formatValue(value)}`);
  }
  return parts.join("  ");
}

export function sortedFields(fields: unknown): { key: string; value: unknown }[] {
  const f = asFields(fields);
  if (!f) return [];
  return Object.entries(f)
    .filter(([key]) => key !== "message")
    .map(([key, value]) => ({ key, value }));
}

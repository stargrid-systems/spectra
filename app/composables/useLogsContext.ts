import type { InjectionKey, Ref } from "vue";
import { inject } from "vue";
import type { BootResponse } from "~/utils/api/types";
import type { LogsFilters } from "~/composables/useLogsFilters";

type TargetOptionsRef = ReturnType<typeof useLogTargets>["data"];

export interface LogsContext {
  filters: LogsFilters;
  inlineFields: Ref<boolean>;
  since: Ref<string | undefined>;
  until: Ref<string | undefined>;
  boots: Ref<BootResponse[]>;
  targetOptions: TargetOptionsRef;
  levelColors: Record<
    string,
    "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral"
  >;
  formatDuration: (startedAt: string, endedAt?: string | null) => string;
  focusSpan: (spanId: number) => void;
  showAllSpans: () => void;
}

export const useLogsContextKey = Symbol() as InjectionKey<LogsContext>;

export function useLogsContext(): LogsContext {
  const ctx = inject(useLogsContextKey);
  if (!ctx) {
    throw new Error("useLogsContext() must be used within developer/logs.vue");
  }
  return ctx;
}

export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
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
    if (key === "message" || key === "boot_id") continue;
    parts.push(`${key}=${formatValue(value)}`);
  }
  return parts.join("  ");
}

export function sortedFields(fields: unknown): { key: string; value: unknown }[] {
  const f = asFields(fields);
  if (!f) return [];
  return Object.entries(f)
    .filter(([key]) => key !== "boot_id" && key !== "message")
    .map(([key, value]) => ({ key, value }));
}

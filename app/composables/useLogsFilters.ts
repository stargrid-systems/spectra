import * as z from "zod/v4/mini";
import type { ListLogSpansParams, ListLogsParams } from "~~/modules/aperture/runtime/types";
import { instantCodec } from "~/utils/temporalCodecs";
import { isLogLevel, type LogLevel } from "~/utils/logLevels";
import {
  queryOptionalString,
  querySingle,
  queryStringArray,
} from "~/composables/useRouteQueryState";

const DEFAULT_LEVEL: LogLevel = "info";

function queryLogLevel(defaultValue: LogLevel) {
  return z.codec(z.array(z.string()), z.custom<LogLevel>(), {
    decode: (arr) => {
      const v = arr[0] ?? defaultValue;
      return isLogLevel(v) ? v : defaultValue;
    },
    encode: (s: LogLevel) => (s === defaultValue ? [] : [s]),
  });
}

const fieldFiltersSchema = z.record(z.string(), z.string());

const fieldFiltersCodec = z.codec(z.array(z.string()), fieldFiltersSchema, {
  decode: (arr) => {
    try {
      return z.parse(fieldFiltersSchema, JSON.parse(arr[0] ?? "{}"));
    } catch {
      return {};
    }
  },
  encode: (obj) => (Object.keys(obj).length > 0 ? [JSON.stringify(obj)] : []),
});

export function parseExpand(values: string[]): { events: string[]; spans: string[] } {
  const events: string[] = [];
  const spans: string[] = [];
  for (const v of values) {
    let prefix: "e" | "s" | null = null;
    if (v.startsWith("e-")) prefix = "e";
    else if (v.startsWith("s-")) prefix = "s";
    if (!prefix) continue;
    const rest = v.slice(2);
    if (!rest) continue;
    if (prefix === "e") events.push(rest);
    else spans.push(rest);
  }
  return { events, spans };
}

export function encodeExpand(events: string[], spans: string[]): string[] {
  return [...events.map((e) => `e-${e}`), ...spans.map((s) => `s-${s}`)];
}

const expandCodec = z.codec(
  z.array(z.string()),
  z.object({ events: z.array(z.string()), spans: z.array(z.string()) }),
  {
    decode: (arr) => parseExpand(arr),
    encode: ({ events, spans }) => encodeExpand(events, spans),
  },
);

export const logsSchema = z.object({
  level: queryLogLevel(DEFAULT_LEVEL),
  target: queryStringArray(),
  search: queryOptionalString(),
  timeRange: queryOptionalString(),
  bootId: queryOptionalString(),
  spanId: queryOptionalString(),
  fieldFilters: fieldFiltersCodec,
  expand: expandCodec,
  since: querySingle(instantCodec),
  until: querySingle(instantCodec),
});

export type LogsState = z.infer<typeof logsSchema>;

export const logsQueryKeys: Partial<Record<keyof LogsState, string>> = {
  search: "q",
  timeRange: "range",
  bootId: "boot",
  spanId: "span",
};

export function defaultLogsState(): LogsState {
  return {
    level: DEFAULT_LEVEL,
    target: [],
    search: undefined,
    timeRange: undefined,
    bootId: undefined,
    spanId: undefined,
    fieldFilters: {},
    expand: { events: [], spans: [] },
    since: undefined,
    until: undefined,
  };
}

export function logsParamsFromFilters(filters: LogsState): ListLogsParams | undefined {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level;
  if (filters.target.length) p.target = filters.target;
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;
  if (filters.bootId) p.boot_id = filters.bootId;
  if (Object.keys(filters.fieldFilters).length > 0) p.fields = JSON.stringify(filters.fieldFilters);
  return Object.keys(p).length > 0 ? p : undefined;
}

export function spansParamsFromFilters(filters: LogsState): ListLogSpansParams | undefined {
  const p: ListLogSpansParams = {};
  if (filters.level) p.min_level = filters.level;
  if (filters.target.length) p.target = filters.target;
  if (filters.spanId !== undefined) {
    p.parent_id = filters.spanId;
  } else {
    p.parent_null = true;
  }
  if (filters.bootId) p.boot_id = filters.bootId;
  if (Object.keys(filters.fieldFilters).length > 0) p.fields = JSON.stringify(filters.fieldFilters);
  return Object.keys(p).length > 0 ? p : undefined;
}

import * as z from "zod/v4/mini";
import type { ListLogSpansParams, ListLogsParams } from "~~/modules/aperture/runtime/types";
import { instantCodec } from "~/utils/temporalCodecs";
import { isLogLevel, type LogLevel } from "~/utils/logLevels";
import {
  queryOptionalString,
  querySingle,
  queryStringArray,
} from "~/composables/useRouteQueryState";

export interface FieldFilter {
  key: string;
  value: string;
}

const DEFAULT_LEVEL: LogLevel = "info";

function fieldsFromJson(json: string): FieldFilter[] {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) return [];
  const result: FieldFilter[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string") result.push({ key: k, value: v });
  }
  return result;
}

function fieldsToObject(filters: FieldFilter[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const f of filters) {
    if (f.key && f.value) obj[f.key] = f.value;
  }
  return obj;
}

function fieldsToJson(filters: FieldFilter[]): string | undefined {
  const obj = fieldsToObject(filters);
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
}

function parseFieldsJson(json: string): FieldFilter[] {
  try {
    return fieldsFromJson(json);
  } catch {
    return [];
  }
}

function queryLogLevel(defaultValue: LogLevel) {
  return z.codec(z.array(z.string()), z.custom<LogLevel>(), {
    decode: (arr) => {
      const v = arr[0] ?? defaultValue;
      return isLogLevel(v) ? v : defaultValue;
    },
    encode: (s: LogLevel) => (s === defaultValue ? [] : [s]),
  });
}

export function parseFields(value: string): FieldFilter[] {
  return value ? parseFieldsJson(value) : [];
}

export function encodeFields(filters: FieldFilter[]): string | undefined {
  return fieldsToJson(filters);
}

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

const fieldFiltersCodec = z.codec(
  z.array(z.string()),
  z.array(z.object({ key: z.string(), value: z.string() })),
  {
    decode: (arr) => parseFields(arr[0] ?? ""),
    encode: (filters) => {
      const json = fieldsToJson(filters);
      return json ? [json] : [];
    },
  },
);

const expandCodec = z.codec(
  z.array(z.string()),
  z.object({ events: z.array(z.string()), spans: z.array(z.string()) }),
  {
    decode: (arr) => parseExpand(arr),
    encode: ({ events, spans }) => encodeExpand(events, spans),
  },
);

export const schema = z.object({
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

export type LogsState = z.infer<typeof schema>;

export const queryKeys: Partial<Record<keyof LogsState, string>> = {
  search: "q",
  timeRange: "range",
  bootId: "boot",
  spanId: "span",
};

export function defaultLogsState(): LogsState {
  const shape = schema._zod.def.shape;
  const empty = Object.fromEntries(Object.keys(shape).map((k) => [k, []])) as unknown as z.input<
    typeof schema
  >;
  const result = z.safeDecode(schema, empty);
  return (result.success ? result.data : {}) as LogsState;
}

export function fieldFiltersJson(filters: LogsState): string | undefined {
  return fieldsToJson(filters.fieldFilters);
}

export function logsParamsFromFilters(filters: LogsState): ListLogsParams | undefined {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level;
  if (filters.target.length) p.target = filters.target;
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;
  if (filters.bootId) p.boot_id = filters.bootId;
  const fields = fieldFiltersJson(filters);
  if (fields) p.fields = fields;
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
  const fields = fieldFiltersJson(filters);
  if (fields) p.fields = fields;
  return Object.keys(p).length > 0 ? p : undefined;
}

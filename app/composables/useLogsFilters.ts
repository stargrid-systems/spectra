import * as z from "zod/v4/mini";
import type { ListLogsParams } from "~~/modules/aperture/runtime/types";
import { instantCodec } from "~/utils/temporalCodecs";
import {
  queryOptionalString,
  querySingle,
  queryStringArray,
  queryStringDefault,
} from "~/composables/useRouteQueryState";

export interface FieldFilter {
  key: string;
  value: string;
}

const DEFAULT_LEVEL = "info";

export function parseFields(value: string): FieldFilter[] {
  if (!value) return [];
  try {
    const obj = JSON.parse(value) as Record<string, string>;
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  } catch {
    return [];
  }
}

export function encodeFields(filters: FieldFilter[]): string | undefined {
  if (filters.length === 0) return undefined;
  const obj: Record<string, string> = {};
  for (const f of filters) {
    if (f.key && f.value) obj[f.key] = f.value;
  }
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
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
    decode: (arr) => {
      if (!arr[0]) return [];
      try {
        const obj = JSON.parse(arr[0]) as Record<string, string>;
        return Object.entries(obj).map(([key, value]) => ({ key, value }));
      } catch {
        return [];
      }
    },
    encode: (filters) => {
      const obj: Record<string, string> = {};
      for (const f of filters) if (f.key && f.value) obj[f.key] = f.value;
      return Object.keys(obj).length > 0 ? [JSON.stringify(obj)] : [];
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
  level: queryStringDefault(DEFAULT_LEVEL),
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

export function logsParamsFromFilters(filters: LogsState): ListLogsParams | undefined {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level as ListLogsParams["min_level"];
  if (filters.target.length)
    p.target = filters.target.join(",") as unknown as ListLogsParams["target"];
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;
  if (filters.bootId) p.boot_id = filters.bootId;

  const fields: Record<string, string> = {};
  for (const f of filters.fieldFilters) {
    if (f.key && f.value) fields[f.key] = f.value;
  }
  if (Object.keys(fields).length > 0) {
    p.fields = JSON.stringify(fields);
  }
  return Object.keys(p).length > 0 ? p : undefined;
}

export function fieldFiltersJson(filters: LogsState): string | undefined {
  const fields: Record<string, string> = {};
  for (const f of filters.fieldFilters) {
    if (f.key && f.value) fields[f.key] = f.value;
  }
  return Object.keys(fields).length > 0 ? JSON.stringify(fields) : undefined;
}

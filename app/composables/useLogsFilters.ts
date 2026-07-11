import type { QuerySchema } from "~/composables/useRouteQueryState";
import type { ListLogsParams } from "~~/modules/aperture/runtime/types";

export interface FieldFilter {
  key: string;
  value: string;
}

export interface LogsState {
  level: string;
  target: string[];
  search: string | undefined;
  timeRange: string | undefined;
  bootId: string | undefined;
  fieldFilters: FieldFilter[];
  spanId: string | undefined;
  expand: { events: string[]; spans: string[] };
  since: Temporal.Instant | undefined;
  until: Temporal.Instant | undefined;
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

export function parseExpand(values: unknown): { events: string[]; spans: string[] } {
  if (typeof document === "undefined") return { events: [], spans: [] };
  const events: string[] = [];
  const spans: string[] = [];
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
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

function serializeExpand(value: { events: string[]; spans: string[] }): string[] | undefined {
  const arr = encodeExpand(value.events, value.spans);
  return arr.length ? arr : undefined;
}

function parseInstant(value: string | string[] | undefined): Temporal.Instant | undefined {
  if (typeof value !== "string") return undefined;
  return Temporal.Instant.from(value);
}

function serializeInstant(value: Temporal.Instant | undefined): string | undefined {
  return value?.toString();
}

function parseString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

function parseFieldsFromQuery(value: string | string[] | undefined): FieldFilter[] {
  if (typeof value !== "string") return [];
  return parseFields(value);
}

function serializeFields(filters: FieldFilter[]): string | undefined {
  return encodeFields(filters);
}

const schema: QuerySchema<LogsState> = {
  level: {
    key: "level",
    parse: (v) => (typeof v === "string" ? v : DEFAULT_LEVEL),
    serialize: (v) => (v && v !== DEFAULT_LEVEL ? v : undefined),
  },
  target: {
    key: "target",
    parse: parseStringArray,
    serialize: (v) => (v.length ? v : undefined),
  },
  search: {
    key: "q",
    parse: parseString,
    serialize: (v) => v ?? undefined,
  },
  timeRange: {
    key: "range",
    parse: parseString,
    serialize: (v) => v ?? undefined,
  },
  bootId: {
    key: "boot",
    parse: parseString,
    serialize: (v) => v ?? undefined,
  },
  spanId: {
    key: "span",
    parse: parseString,
    serialize: (v) => v ?? undefined,
  },
  fieldFilters: {
    key: "fields",
    parse: parseFieldsFromQuery,
    serialize: serializeFields,
  },
  expand: {
    key: "expand",
    parse: parseExpand,
    serialize: serializeExpand,
  },
  since: {
    key: "since",
    parse: parseInstant,
    serialize: serializeInstant,
  },
  until: {
    key: "until",
    parse: parseInstant,
    serialize: serializeInstant,
  },
};

export function useLogsFilters() {
  const filters = useRouteQueryState<LogsState>(schema);
  return { filters };
}

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

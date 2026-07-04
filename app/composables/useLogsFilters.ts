import type { ListLogSpansParams, ListLogsParams } from "~/utils/api/types";

export interface FieldFilter {
  key: string;
  value: string;
}

export interface LogsFilters {
  level: string | undefined;
  target: string | undefined;
  search: string | undefined;
  timeRange: string | undefined;
  bootId: string | undefined;
  fieldFilters: FieldFilter[];
  spanId: number | undefined;
  expandEvent: number[];
  expandSpan: number[];
}

const QUERY_KEYS = {
  level: "level",
  target: "target",
  search: "q",
  timeRange: "range",
  boot: "boot",
  span: "span",
  fields: "fields",
  expand: "expand",
} as const;

const DEFAULT_LEVEL = "info";

function parseFields(value: string): FieldFilter[] {
  if (!value) return [];
  try {
    const obj = JSON.parse(value) as Record<string, string>;
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  } catch {
    return [];
  }
}

function encodeFields(filters: FieldFilter[]): string | undefined {
  if (filters.length === 0) return undefined;
  const obj: Record<string, string> = {};
  for (const f of filters) {
    if (f.key && f.value) obj[f.key] = f.value;
  }
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
}

function parseExpand(values: unknown): { events: number[]; spans: number[] } {
  if (typeof document === "undefined") return { events: [], spans: [] };
  const events: number[] = [];
  const spans: number[] = [];
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    if (v.startsWith("e-")) {
      const n = Number(v.slice(2));
      if (Number.isFinite(n)) events.push(n);
    } else if (v.startsWith("s-")) {
      const n = Number(v.slice(2));
      if (Number.isFinite(n)) spans.push(n);
    }
  }
  return { events, spans };
}

function encodeExpand(events: number[], spans: number[]): string[] {
  return [...events.map((e) => `e-${e}`), ...spans.map((s) => `s-${s}`)];
}

export function useLogsFilters() {
  const route = useRoute();
  const router = useRouter();

  const filters = reactive<LogsFilters>({
    level: DEFAULT_LEVEL,
    target: undefined,
    search: undefined,
    timeRange: undefined,
    bootId: undefined,
    fieldFilters: [],
    spanId: undefined,
    expandEvent: [],
    expandSpan: [],
  });

  let skipRouteWatch = false;

  function readFromRoute() {
    if (skipRouteWatch) {
      skipRouteWatch = false;
      return;
    }
    const q = route.query;
    filters.level = (q[QUERY_KEYS.level] as string) || DEFAULT_LEVEL;
    filters.target = (q[QUERY_KEYS.target] as string) || undefined;
    filters.search = (q[QUERY_KEYS.search] as string) || undefined;
    filters.timeRange = (q[QUERY_KEYS.timeRange] as string) || undefined;
    filters.bootId = (q[QUERY_KEYS.boot] as string) || undefined;
    filters.spanId = q[QUERY_KEYS.span] ? Number(q[QUERY_KEYS.span]) : undefined;
    filters.fieldFilters = parseFields((q[QUERY_KEYS.fields] as string) || "");
    const exp = parseExpand(q[QUERY_KEYS.expand]);
    filters.expandEvent = exp.events;
    filters.expandSpan = exp.spans;
  }

  function writeToRoute() {
    const query: Record<string, string | string[]> = {};
    if (filters.level && filters.level !== DEFAULT_LEVEL) query[QUERY_KEYS.level] = filters.level;
    if (filters.target) query[QUERY_KEYS.target] = filters.target;
    if (filters.search) query[QUERY_KEYS.search] = filters.search;
    if (filters.timeRange) query[QUERY_KEYS.timeRange] = filters.timeRange;
    if (filters.bootId) query[QUERY_KEYS.boot] = filters.bootId;
    if (filters.spanId !== undefined) query[QUERY_KEYS.span] = String(filters.spanId);
    const fieldsJson = encodeFields(filters.fieldFilters);
    if (fieldsJson) query[QUERY_KEYS.fields] = fieldsJson;
    const expandValues = encodeExpand(filters.expandEvent, filters.expandSpan);
    if (expandValues.length) query[QUERY_KEYS.expand] = expandValues;
    skipRouteWatch = true;
    router.replace({ query });
  }

  readFromRoute();

  watch(
    () => ({
      level: filters.level,
      target: filters.target,
      search: filters.search,
      timeRange: filters.timeRange,
      bootId: filters.bootId,
      spanId: filters.spanId,
      fieldFilters: [...filters.fieldFilters],
      expandEvent: [...filters.expandEvent],
      expandSpan: [...filters.expandSpan],
    }),
    () => writeToRoute(),
    { deep: true },
  );

  watch(() => route.query, readFromRoute, { deep: true });

  return { filters };
}

export function logsParamsFromFilters(filters: LogsFilters): ListLogsParams | undefined {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level as ListLogsParams["min_level"];
  if (filters.target) p.target = filters.target;
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;

  const fields: Record<string, string> = {};
  for (const f of filters.fieldFilters) {
    if (f.key && f.value) fields[f.key] = f.value;
  }
  if (filters.bootId) {
    fields.boot_id = filters.bootId;
  }
  if (Object.keys(fields).length > 0) {
    p.fields = JSON.stringify(fields);
  }
  return Object.keys(p).length > 0 ? p : undefined;
}

export function spansParamsFromFilters(filters: LogsFilters): ListLogSpansParams | undefined {
  const p: ListLogSpansParams = {};
  if (filters.level) p.min_level = filters.level as ListLogSpansParams["min_level"];
  if (filters.target) p.target = filters.target;
  if (filters.spanId !== undefined) p.parent_id = filters.spanId;
  return Object.keys(p).length > 0 ? p : undefined;
}

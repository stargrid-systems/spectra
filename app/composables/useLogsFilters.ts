import type { ListLogSpansParams, ListLogsParams } from "~/utils/api/types";

export type LogView = "events" | "spans";

export interface FieldFilter {
  key: string;
  value: string;
}

export interface LogsFilters {
  level: string | undefined;
  target: string | undefined;
  search: string | undefined;
  timeRange: string | undefined;
  bootOnly: boolean;
  fieldFilters: FieldFilter[];
  view: LogView;
  spanId: number | undefined;
}

const QUERY_KEYS = {
  level: "level",
  target: "target",
  search: "q",
  timeRange: "range",
  bootOnly: "boot",
  view: "view",
  spanId: "span",
  fields: "fields",
} as const;

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

export function useLogsFilters() {
  const route = useRoute();
  const router = useRouter();

  const DEFAULT_LEVEL = "info";

  const filters = reactive<LogsFilters>({
    level: DEFAULT_LEVEL,
    target: undefined,
    search: undefined,
    timeRange: undefined,
    bootOnly: false,
    fieldFilters: [],
    view: "events",
    spanId: undefined,
  });

  function readFromRoute() {
    const q = route.query;
    filters.level = (q[QUERY_KEYS.level] as string) || DEFAULT_LEVEL;
    filters.target = (q[QUERY_KEYS.target] as string) || undefined;
    filters.search = (q[QUERY_KEYS.search] as string) || undefined;
    filters.timeRange = (q[QUERY_KEYS.timeRange] as string) || undefined;
    filters.bootOnly = q[QUERY_KEYS.bootOnly] === "1" || q[QUERY_KEYS.bootOnly] === "true";
    filters.view = (q[QUERY_KEYS.view] as LogView) === "spans" ? "spans" : "events";
    filters.spanId = q[QUERY_KEYS.spanId] ? Number(q[QUERY_KEYS.spanId]) : undefined;
    filters.fieldFilters = parseFields((q[QUERY_KEYS.fields] as string) || "");
  }

  function writeToRoute() {
    const query: Record<string, string> = {};
    if (filters.level && filters.level !== DEFAULT_LEVEL) query[QUERY_KEYS.level] = filters.level;
    if (filters.target) query[QUERY_KEYS.target] = filters.target;
    if (filters.search) query[QUERY_KEYS.search] = filters.search;
    if (filters.timeRange) query[QUERY_KEYS.timeRange] = filters.timeRange;
    if (filters.bootOnly) query[QUERY_KEYS.bootOnly] = "1";
    if (filters.view === "spans") query[QUERY_KEYS.view] = "spans";
    if (filters.spanId !== undefined) query[QUERY_KEYS.spanId] = String(filters.spanId);
    const fieldsJson = encodeFields(filters.fieldFilters);
    if (fieldsJson) query[QUERY_KEYS.fields] = fieldsJson;
    router.replace({ query });
  }

  readFromRoute();

  watch(
    () => ({ ...filters, fieldFilters: [...filters.fieldFilters] }),
    () => writeToRoute(),
    { deep: true },
  );

  watch(() => route.query, readFromRoute, { deep: true });

  return { filters };
}

export function useBootId() {
  return useAsyncData("boot-id", () => apertureApi.getVersion(), {
    server: false,
  });
}

export function logsParamsFromFilters(
  filters: LogsFilters,
  bootId: string | undefined,
): ListLogsParams | undefined {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level as ListLogsParams["min_level"];
  if (filters.target) p.target = filters.target;
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;

  const fields: Record<string, string> = {};
  for (const f of filters.fieldFilters) {
    if (f.key && f.value) fields[f.key] = f.value;
  }
  if (filters.bootOnly && bootId) {
    fields.boot_id = bootId;
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
  return Object.keys(p).length > 0 ? p : undefined;
}
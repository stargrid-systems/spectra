import createClient from "openapi-fetch";
import type { paths } from "./generated";
import type {
  BootList,
  BootResponse,
  ListLogSpansParams,
  ListLogTargetsParams,
  ListLogsParams,
  LogEvent,
  LogEventPage,
  LogSpan,
  LogSpanDetail,
  LogSpanPage,
  RawBootResponse,
  RawLogEvent,
  RawLogSpan,
  RawLogSpanDetail,
  VersionResponse,
} from "./types";

const client = createClient<paths>({
  querySerializer: { array: { style: "form", explode: false } },
});

function unwrap<T>(res: { data?: T; error?: unknown }): T {
  if (res.data === undefined) {
    throw res.error ?? new Error("aperture returned an empty response");
  }
  return res.data;
}

function toLogEvent(e: RawLogEvent): LogEvent {
  return { ...e, timestamp: Temporal.Instant.from(e.timestamp) };
}

function toLogSpan(s: RawLogSpan): LogSpan {
  return {
    ...s,
    started_at: Temporal.Instant.from(s.started_at),
    ended_at: s.ended_at ? Temporal.Instant.from(s.ended_at) : null,
  };
}

function toLogSpanDetail(d: RawLogSpanDetail): LogSpanDetail {
  const { events, started_at, ended_at, ...rest } = d;
  return {
    ...rest,
    started_at: Temporal.Instant.from(started_at),
    ended_at: ended_at ? Temporal.Instant.from(ended_at) : null,
    events: events.map(toLogEvent),
  };
}

function toBootResponse(b: RawBootResponse): BootResponse {
  return {
    ...b,
    first_seen: Temporal.Instant.from(b.first_seen),
    last_seen: Temporal.Instant.from(b.last_seen),
  };
}

export const apertureApi = {
  getVersion: async (): Promise<VersionResponse> =>
    unwrap(await client.GET("/api/v1/version")),

  listLogs: async (params?: ListLogsParams): Promise<LogEventPage> => {
    const data = unwrap(await client.GET("/api/v1/logs", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogEvent) };
  },

  listLogTargets: async (params?: ListLogTargetsParams): Promise<string[]> =>
    unwrap(await client.GET("/api/v1/logs/targets", { params: { query: params } })),

  listLogBoots: async (): Promise<BootList> =>
    unwrap(await client.GET("/api/v1/logs/boots")).map(toBootResponse),

  listSpans: async (params?: ListLogSpansParams): Promise<LogSpanPage> => {
    const data = unwrap(await client.GET("/api/v1/logs/spans", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogSpan) };
  },

  getSpan: async (id: string): Promise<LogSpanDetail> =>
    toLogSpanDetail(unwrap(await client.GET("/api/v1/logs/spans/{id}", { params: { path: { id } } }))),
};

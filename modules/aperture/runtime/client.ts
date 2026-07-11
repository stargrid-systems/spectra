import type {
  ArtifactPage,
  ArtifactSummary,
  ArtifactVersion,
  ArtifactVersionPage,
  BootList,
  BootResponse,
  ListArtifactsParams,
  ListLogSpansParams,
  ListLogTargetsParams,
  ListLogsParams,
  ListVersionsParams,
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

const BASE = "/api/v1";

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
  getVersion: () => $fetch<VersionResponse>(`${BASE}/version`),

  listArtifacts: (params?: ListArtifactsParams) =>
    $fetch<ArtifactPage>(`${BASE}/artifacts`, { query: params }),

  getArtifact: (key: string) =>
    $fetch<ArtifactSummary>(`${BASE}/artifacts/${encodeURIComponent(key)}`),

  listVersions: (key: string, params?: ListVersionsParams) =>
    $fetch<ArtifactVersionPage>(`${BASE}/artifacts/${encodeURIComponent(key)}/versions`, {
      query: params,
    }),

  getVersionDetail: (key: string, digest: string) =>
    $fetch<ArtifactVersion>(
      `${BASE}/artifacts/${encodeURIComponent(key)}/versions/${encodeURIComponent(digest)}`,
    ),

  deleteVersion: async (key: string, digest: string): Promise<void> => {
    await $fetch(
      `${BASE}/artifacts/${encodeURIComponent(key)}/versions/${encodeURIComponent(digest)}`,
      { method: "DELETE" },
    );
  },

  listLogs: async (params?: ListLogsParams): Promise<LogEventPage> => {
    const raw = await $fetch<{
      items: RawLogEvent[];
      next_cursor?: string | null;
      prev_cursor?: string | null;
    }>(`${BASE}/logs`, { query: params });
    return { ...raw, items: raw.items.map(toLogEvent) };
  },

  listLogTargets: (params?: ListLogTargetsParams) =>
    $fetch<string[]>(`${BASE}/logs/targets`, { query: params }),

  listLogBoots: async (): Promise<BootList> => {
    const raw = await $fetch<RawBootResponse[]>(`${BASE}/logs/boots`);
    return raw.map(toBootResponse);
  },

  listSpans: async (params?: ListLogSpansParams): Promise<LogSpanPage> => {
    const raw = await $fetch<{
      items: RawLogSpan[];
      next_cursor?: string | null;
      prev_cursor?: string | null;
    }>(`${BASE}/logs/spans`, { query: params });
    return { ...raw, items: raw.items.map(toLogSpan) };
  },

  getSpan: async (id: string): Promise<LogSpanDetail> => {
    const raw = await $fetch<RawLogSpanDetail>(`${BASE}/logs/spans/${id}`);
    return toLogSpanDetail(raw);
  },
};

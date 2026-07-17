import createClient from "openapi-fetch";
import type { paths } from "./generated";
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

const client = createClient<paths>({
  querySerializer: { array: { style: "form", explode: false } },
});

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
  getVersion: async (): Promise<VersionResponse> => {
    const { data, error } = await client.GET("/api/v1/version");
    if (error) throw error;
    return data!;
  },

  listArtifacts: async (params?: ListArtifactsParams): Promise<ArtifactPage> => {
    const { data, error } = await client.GET("/api/v1/artifacts", {
      params: { query: params },
    });
    if (error) throw error;
    return data!;
  },

  getArtifact: async (key: string): Promise<ArtifactSummary> => {
    const { data, error } = await client.GET("/api/v1/artifacts/{key}", {
      params: { path: { key } },
    });
    if (error) throw error;
    return data!;
  },

  listVersions: async (key: string, params?: ListVersionsParams): Promise<ArtifactVersionPage> => {
    const { data, error } = await client.GET("/api/v1/artifacts/{key}/versions", {
      params: { path: { key }, query: params },
    });
    if (error) throw error;
    return data!;
  },

  getVersionDetail: async (key: string, digest: string): Promise<ArtifactVersion> => {
    const { data, error } = await client.GET("/api/v1/artifacts/{key}/versions/{digest}", {
      params: { path: { key, digest } },
    });
    if (error) throw error;
    return data!;
  },

  deleteVersion: async (key: string, digest: string): Promise<void> => {
    const { error } = await client.DELETE("/api/v1/artifacts/{key}/versions/{digest}", {
      params: { path: { key, digest } },
    });
    if (error) throw error;
  },

  listLogs: async (params?: ListLogsParams): Promise<LogEventPage> => {
    const { data, error } = await client.GET("/api/v1/logs", {
      params: { query: params },
    });
    if (error) throw error;
    return { ...data!, items: data!.items.map(toLogEvent) };
  },

  listLogTargets: async (params?: ListLogTargetsParams): Promise<string[]> => {
    const { data, error } = await client.GET("/api/v1/logs/targets", {
      params: { query: params },
    });
    if (error) throw error;
    return data!;
  },

  listLogBoots: async (): Promise<BootList> => {
    const { data, error } = await client.GET("/api/v1/logs/boots");
    if (error) throw error;
    return data!.map(toBootResponse);
  },

  listSpans: async (params?: ListLogSpansParams): Promise<LogSpanPage> => {
    const { data, error } = await client.GET("/api/v1/logs/spans", {
      params: { query: params },
    });
    if (error) throw error;
    return { ...data!, items: data!.items.map(toLogSpan) };
  },

  getSpan: async (id: string): Promise<LogSpanDetail> => {
    const { data, error } = await client.GET("/api/v1/logs/spans/{id}", {
      params: { path: { id } },
    });
    if (error) throw error;
    return toLogSpanDetail(data!);
  },
};

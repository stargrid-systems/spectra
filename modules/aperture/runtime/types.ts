import type { components, operations } from "./generated";

type Schemas = components["schemas"];

export type VersionResponse = Schemas["VersionResponse"];
export type ArtifactSummary = Schemas["ArtifactSummaryResponse"];
export type ArtifactVersion = Schemas["ArtifactVersionResponse"];
export type OrderParam = Schemas["OrderParam"];
export type VersionSortParam = Schemas["VersionSortParam"];
export type LevelResponse = Schemas["LevelResponse"];

export type RawLogEvent = Schemas["LogEventResponse"];
export type RawLogSpan = Schemas["LogSpanResponse"];
export type RawLogSpanDetail = Schemas["LogSpanDetailResponse"];
export type RawBootResponse = Schemas["BootResponse"];

export type LogEvent = Omit<RawLogEvent, "timestamp"> & { timestamp: Temporal.Instant };
export type LogSpan = Omit<RawLogSpan, "started_at" | "ended_at"> & {
  started_at: Temporal.Instant;
  ended_at: Temporal.Instant | null;
};
export type LogSpanDetail = Omit<RawLogSpanDetail, "started_at" | "ended_at" | "events"> & {
  started_at: Temporal.Instant;
  ended_at: Temporal.Instant | null;
  events: LogEvent[];
};
export type BootResponse = Omit<RawBootResponse, "first_seen" | "last_seen"> & {
  first_seen: Temporal.Instant;
  last_seen: Temporal.Instant;
};

export interface Page<T> {
  items: T[];
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export type ArtifactPage = Schemas["Page_ArtifactSummaryResponse"];
export type ArtifactVersionPage = Schemas["Page_ArtifactVersionResponse"];
export type LogEventPage = Page<LogEvent>;
export type LogSpanPage = Page<LogSpan>;
export type BootList = BootResponse[];

export type ListArtifactsParams = NonNullable<operations["listArtifacts"]["parameters"]["query"]>;
export type ListVersionsParams = NonNullable<
  operations["listArtifactVersions"]["parameters"]["query"]
>;
export type ListLogsParams = NonNullable<operations["listLogs"]["parameters"]["query"]>;
export type ListLogSpansParams = NonNullable<operations["listSpans"]["parameters"]["query"]>;
export type ListLogTargetsParams = NonNullable<operations["listLogTargets"]["parameters"]["query"]>;

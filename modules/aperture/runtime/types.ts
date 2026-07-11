import type { components, operations } from "./generated";

type Schemas = components["schemas"];

export type VersionResponse = Schemas["VersionResponse"];
export type ArtifactSummary = Schemas["ArtifactSummaryResponse"];
export type ArtifactVersion = Schemas["ArtifactVersionResponse"];
export type OrderParam = Schemas["OrderParam"];
export type VersionSortParam = Schemas["VersionSortParam"];
export type LevelResponse = Schemas["LevelResponse"];
export type LogEvent = Schemas["LogEventResponse"];
export type LogSpan = Schemas["LogSpanResponse"];
export type LogSpanDetail = Schemas["LogSpanDetailResponse"];
export type BootResponse = Schemas["BootResponse"];

export type ArtifactPage = Schemas["Page_ArtifactSummaryResponse"];
export type ArtifactVersionPage = Schemas["Page_ArtifactVersionResponse"];
export type LogEventPage = Schemas["Page_LogEventResponse"];
export type LogSpanPage = Schemas["Page_LogSpanResponse"];
export type BootList = BootResponse[];

export type ListArtifactsParams = NonNullable<operations["listArtifacts"]["parameters"]["query"]>;
export type ListVersionsParams = NonNullable<
  operations["listArtifactVersions"]["parameters"]["query"]
>;
export type ListLogsParams = NonNullable<operations["listLogs"]["parameters"]["query"]>;
export type ListLogSpansParams = NonNullable<operations["listSpans"]["parameters"]["query"]>;
export type ListLogTargetsParams = NonNullable<operations["listLogTargets"]["parameters"]["query"]>;

import type { components, operations } from "./generated";

type Schemas = components["schemas"];

export type VersionResponse = Schemas["VersionResponse"];
export type ArtifactSummary = Schemas["ArtifactSummaryResponse"];
export type ArtifactVersion = Schemas["ArtifactVersionResponse"];
export type DownloadResponse = Schemas["DownloadResponse"];
export type DownloadStatus = Schemas["DownloadStatusResponse"];
export type DownloadProgress = Schemas["DownloadProgressResponse"];
export type OrderParam = Schemas["OrderParam"];
export type VersionSortParam = Schemas["VersionSortParam"];
export type DownloadStatusParam = Schemas["DownloadStatusParam"];
export type LevelResponse = Schemas["LevelResponse"];
export type LogEvent = Schemas["LogEventResponse"];
export type LogSpan = Schemas["LogSpanResponse"];
export type LogSpanDetail = Schemas["LogSpanDetailResponse"];

export type ArtifactPage = Schemas["Page_ArtifactSummaryResponse"];
export type ArtifactVersionPage = Schemas["Page_ArtifactVersionResponse"];
export type DownloadPage = Schemas["Page_DownloadResponse"];
export type LogEventPage = Schemas["Page_LogEventResponse"];
export type LogSpanPage = Schemas["Page_LogSpanResponse"];

export type ListArtifactsParams = NonNullable<operations["list_artifacts"]["parameters"]["query"]>;
export type ListVersionsParams = NonNullable<operations["list_versions"]["parameters"]["query"]>;
export type ListDownloadsParams = NonNullable<operations["list_downloads"]["parameters"]["query"]>;
export type ListLogsParams = NonNullable<operations["list_logs"]["parameters"]["query"]>;
export type ListLogSpansParams = NonNullable<operations["list_spans"]["parameters"]["query"]>;
export type ListLogTargetsParams = NonNullable<
  operations["list_log_targets"]["parameters"]["query"]
>;

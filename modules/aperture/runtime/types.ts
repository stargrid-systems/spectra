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

export type ArtifactPage = Schemas["Page_ArtifactSummaryResponse"];
export type ArtifactVersionPage = Schemas["Page_ArtifactVersionResponse"];
export type DownloadPage = Schemas["Page_DownloadResponse"];

export type ListArtifactsParams = NonNullable<operations["list_artifacts"]["parameters"]["query"]>;
export type ListVersionsParams = NonNullable<operations["list_versions"]["parameters"]["query"]>;
export type ListDownloadsParams = NonNullable<operations["list_downloads"]["parameters"]["query"]>;

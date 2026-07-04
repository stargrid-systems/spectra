import type {
  ArtifactPage,
  ArtifactSummary,
  ArtifactVersion,
  ArtifactVersionPage,
  BootList,
  DownloadPage,
  ListArtifactsParams,
  ListDownloadsParams,
  ListLogSpansParams,
  ListLogTargetsParams,
  ListLogsParams,
  ListVersionsParams,
  LogEventPage,
  LogSpanDetail,
  LogSpanPage,
  VersionResponse,
} from "./types";

const BASE = "/api/v1";

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

  listDownloads: (params?: ListDownloadsParams) =>
    $fetch<DownloadPage>(`${BASE}/downloads`, { query: params }),

  listLogs: (params?: ListLogsParams) => $fetch<LogEventPage>(`${BASE}/logs`, { query: params }),

  listLogTargets: (params?: ListLogTargetsParams) =>
    $fetch<string[]>(`${BASE}/logs/targets`, { query: params }),

  listLogBoots: () => $fetch<BootList>(`${BASE}/logs/boots`),

  listSpans: (params?: ListLogSpansParams) =>
    $fetch<LogSpanPage>(`${BASE}/logs/spans`, { query: params }),

  getSpan: (id: number) => $fetch<LogSpanDetail>(`${BASE}/logs/spans/${id}`),
};

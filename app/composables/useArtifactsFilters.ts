import * as z from "zod/v4/mini";
import type {
  ListArtifactVersionsParams,
  ListArtifactsParams,
} from "~~/modules/aperture/runtime/types";
import { queryOptionalString, useRouteQueryState } from "~/composables/useRouteQueryState";

export const ARTIFACT_SORTS = ["downloaded_at", "size_bytes"] as const;

export type ArtifactSort = (typeof ARTIFACT_SORTS)[number];

function isArtifactSort(value: string): value is ArtifactSort {
  return (ARTIFACT_SORTS as readonly string[]).includes(value);
}

const querySort = z.codec(z.array(z.string()), z.custom<ArtifactSort | undefined>(), {
  decode: (arr) => {
    const v = arr[0];
    return v !== undefined && isArtifactSort(v) ? v : undefined;
  },
  encode: (v) => (v ? [v] : []),
});

export const artifactsSchema = z.object({
  q: queryOptionalString(),
  key: queryOptionalString(),
});

export type ArtifactsFilters = z.infer<typeof artifactsSchema>;

export function useArtifactsFilters(): ArtifactsFilters {
  return useRouteQueryState(artifactsSchema);
}

export function artifactsParamsFromFilters(filters: ArtifactsFilters): ListArtifactsParams {
  const p: ListArtifactsParams = {};
  if (filters.q) p.q = filters.q;
  return p;
}

export const versionsSchema = z.object({
  media_type: queryOptionalString(),
  version: queryOptionalString(),
  sort: querySort,
});

export type ArtifactVersionsFilters = z.infer<typeof versionsSchema>;

export function useArtifactVersionsFilters(): ArtifactVersionsFilters {
  return useRouteQueryState(versionsSchema);
}

export function versionsParamsFromFilters(
  filters: ArtifactVersionsFilters,
): ListArtifactVersionsParams {
  const p: ListArtifactVersionsParams = {};
  if (filters.media_type) p.media_type = filters.media_type;
  if (filters.version) p.version = filters.version;
  if (filters.sort) p.sort = filters.sort;
  return p;
}

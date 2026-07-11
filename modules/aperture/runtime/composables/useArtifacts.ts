import { useAsyncData } from "#imports";
import type { ListArtifactsParams } from "../types";
import { apertureApi } from "../client";

export function useArtifacts(params?: () => ListArtifactsParams | undefined) {
  return useAsyncData("artifacts", () => apertureApi.listArtifacts(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

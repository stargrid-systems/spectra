import type { ListArtifactsParams } from "~/utils/api/types";

export function useArtifacts(params?: () => ListArtifactsParams | undefined) {
  return useAsyncData("artifacts", () => apertureApi.listArtifacts(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

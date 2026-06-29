import type { ListDownloadsParams } from "~/utils/api/types";

export function useDownloads(params?: () => ListDownloadsParams | undefined) {
  return useAsyncData("downloads", () => apertureApi.listDownloads(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

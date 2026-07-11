import { useAsyncData } from "#imports";
import type { ListDownloadsParams } from "../types";
import { apertureApi } from "../client";

export function useDownloads(params?: () => ListDownloadsParams | undefined) {
  return useAsyncData("downloads", () => apertureApi.listDownloads(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

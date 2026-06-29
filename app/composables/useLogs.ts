import type { ListLogTargetsParams, ListLogsParams } from "~/utils/api/types";

export function useLogs(params?: () => ListLogsParams | undefined) {
  return useAsyncData("logs", () => apertureApi.listLogs(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

export function useLogTargets(params?: () => ListLogTargetsParams | undefined) {
  return useAsyncData("log-targets", () => apertureApi.listLogTargets(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

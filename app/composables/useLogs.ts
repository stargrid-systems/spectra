import type {
  ListLogSpansParams,
  ListLogsParams,
  LogEventPage,
  LogSpanPage,
} from "~/utils/api/types";

export function useLogs(params?: () => ListLogsParams | undefined) {
  return useAsyncData<LogEventPage>("logs", () => apertureApi.listLogs(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}

export function useLogTargets(params?: () => { q?: string } | undefined) {
  return useAsyncData<string[]>(
    "log-targets",
    () => apertureApi.listLogTargets(params?.()),
    {
      server: false,
    },
  );
}

export function useSpans(params?: () => ListLogSpansParams | undefined) {
  return useAsyncData<LogSpanPage>("spans", () => apertureApi.listSpans(params?.()), {
    server: false,
    watch: params ? [params] : undefined,
  });
}
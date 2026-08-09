import createClient from "openapi-fetch";
import type { paths } from "./generated";
import type {
  BootList,
  BootResponse,
  ChangePasswordBody,
  CurrentUser,
  ListLogSpansParams,
  ListLogTargetsParams,
  ListLogsParams,
  LoginBody,
  LoginResponse,
  LogEvent,
  LogEventPage,
  LogSpan,
  LogSpanDetail,
  LogSpanPage,
  RawBootResponse,
  RawLogEvent,
  RawLogSpan,
  RawLogSpanDetail,
  SetupBody,
  SetupStatus,
  VersionResponse,
} from "./types";

const client = createClient<paths>({
  querySerializer: { array: { style: "form", explode: false } },
});

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message?: string) {
    super(message ?? `request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

const AUTH_ENDPOINTS = new Set([
  "/api/v1/auth/me",
  "/api/v1/auth/login",
  "/api/v1/auth/change-password",
]);

let unauthorizedHandler: (() => void) | null = null;

client.use({
  onResponse({ request, response }) {
    if (response.status !== 401 || !unauthorizedHandler) {
      return;
    }
    let pathname: string;
    try {
      pathname = new URL(request.url).pathname;
    } catch {
      return;
    }
    if (AUTH_ENDPOINTS.has(pathname)) {
      return;
    }
    unauthorizedHandler();
  },
});

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

function unwrap<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.data === undefined) {
    throw new ApiError(res.response.status);
  }
  return res.data;
}

function unwrapVoid(res: { data?: unknown; error?: unknown; response: Response }): void {
  if (res.data === undefined && !res.response.ok) {
    throw new ApiError(res.response.status);
  }
}

function toLogEvent(e: RawLogEvent): LogEvent {
  return { ...e, timestamp: Temporal.Instant.from(e.timestamp) };
}

function toLogSpan(s: RawLogSpan): LogSpan {
  return {
    ...s,
    started_at: Temporal.Instant.from(s.started_at),
    ended_at: s.ended_at ? Temporal.Instant.from(s.ended_at) : null,
  };
}

function toLogSpanDetail(d: RawLogSpanDetail): LogSpanDetail {
  const { events, started_at, ended_at, ...rest } = d;
  return {
    ...rest,
    started_at: Temporal.Instant.from(started_at),
    ended_at: ended_at ? Temporal.Instant.from(ended_at) : null,
    events: events.map(toLogEvent),
  };
}

function toBootResponse(b: RawBootResponse): BootResponse {
  return {
    ...b,
    first_seen: Temporal.Instant.from(b.first_seen),
    last_seen: Temporal.Instant.from(b.last_seen),
  };
}

export const apertureApi = {
  getVersion: async (): Promise<VersionResponse> => unwrap(await client.GET("/api/v1/version")),

  listLogs: async (params?: ListLogsParams): Promise<LogEventPage> => {
    const data = unwrap(await client.GET("/api/v1/logs", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogEvent) };
  },

  listLogTargets: async (params?: ListLogTargetsParams): Promise<string[]> =>
    unwrap(await client.GET("/api/v1/logs/targets", { params: { query: params } })),

  listLogBoots: async (): Promise<BootList> =>
    unwrap(await client.GET("/api/v1/logs/boots")).map(toBootResponse),

  listSpans: async (params?: ListLogSpansParams): Promise<LogSpanPage> => {
    const data = unwrap(await client.GET("/api/v1/logs/spans", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogSpan) };
  },

  getSpan: async (id: string): Promise<LogSpanDetail> =>
    toLogSpanDetail(
      unwrap(await client.GET("/api/v1/logs/spans/{id}", { params: { path: { id } } })),
    ),

  getMe: async (): Promise<CurrentUser> => unwrap(await client.GET("/api/v1/auth/me")),

  getSetupStatus: async (): Promise<SetupStatus> =>
    unwrap(await client.GET("/api/v1/auth/setup-status")),

  login: async (body: LoginBody): Promise<LoginResponse> =>
    unwrap(await client.POST("/api/v1/auth/login", { body })),

  logout: async (): Promise<void> => {
    unwrapVoid(await client.POST("/api/v1/auth/logout"));
  },

  setup: async (body: SetupBody): Promise<LoginResponse> =>
    unwrap(await client.POST("/api/v1/auth/setup", { body })),

  changePassword: async (body: ChangePasswordBody): Promise<void> => {
    unwrapVoid(await client.POST("/api/v1/auth/change-password", { body }));
  },
};

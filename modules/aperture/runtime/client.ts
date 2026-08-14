import createClient from "openapi-fetch";
import type { paths } from "./generated";
import type {
  ApiKeyPage,
  ArtifactSummary,
  ArtifactSummaryPage,
  ArtifactVersion,
  ArtifactVersionPage,
  BootPage,
  BootResponse,
  ChangePasswordBody,
  CreateApiKeyBody,
  CreateTaskBody,
  CreateTaskScheduleBody,
  CreatedApiKey,
  CreateUserBody,
  CurrentActor,
  ListApiKeysParams,
  ListArtifactVersionsParams,
  ListArtifactsParams,
  ListLogBootsParams,
  ListLogSpansParams,
  ListLogTargetsParams,
  ListLogsParams,
  ListTaskSchedulesParams,
  ListTasksParams,
  ListUsersParams,
  LoginBody,
  LoginResponse,
  LogEvent,
  LogEventPage,
  LogSpan,
  LogSpanDetail,
  LogSpanPage,
  RawArtifactSummary,
  RawArtifactVersion,
  RawBootResponse,
  RawLogEvent,
  RawLogSpan,
  RawLogSpanDetail,
  RawTask,
  RawTaskSchedule,
  SetupBody,
  SetupStatus,
  StringPage,
  Task,
  TaskDefinition,
  TaskPage,
  TaskSchedule,
  TaskSchedulePage,
  UpdateTaskScheduleBody,
  User,
  UserPage,
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

function toTask(t: RawTask): Task {
  const { created_at, started_at, finished_at, ...rest } = t;
  return {
    ...rest,
    created_at: Temporal.Instant.from(created_at),
    started_at: started_at ? Temporal.Instant.from(started_at) : null,
    finished_at: finished_at ? Temporal.Instant.from(finished_at) : null,
  };
}

function toTaskSchedule(s: RawTaskSchedule): TaskSchedule {
  const { created_at, next_run_at, last_run_at, ...rest } = s;
  return {
    ...rest,
    created_at: Temporal.Instant.from(created_at),
    next_run_at: Temporal.Instant.from(next_run_at),
    last_run_at: last_run_at ? Temporal.Instant.from(last_run_at) : null,
  };
}

function toArtifactSummary(a: RawArtifactSummary): ArtifactSummary {
  return { ...a, downloaded_at: Temporal.Instant.from(a.downloaded_at) };
}

function toArtifactVersion(v: RawArtifactVersion): ArtifactVersion {
  const { downloaded_at, verified_at, ...rest } = v;
  return {
    ...rest,
    downloaded_at: Temporal.Instant.from(downloaded_at),
    verified_at: verified_at ? Temporal.Instant.from(verified_at) : null,
  };
}

export const apertureApi = {
  getVersion: async (): Promise<VersionResponse> => unwrap(await client.GET("/api/v1/version")),

  listLogs: async (params?: ListLogsParams): Promise<LogEventPage> => {
    const data = unwrap(await client.GET("/api/v1/logs", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogEvent) };
  },

  listLogTargets: async (params?: ListLogTargetsParams): Promise<StringPage> =>
    unwrap(await client.GET("/api/v1/logs/targets", { params: { query: params } })),

  listLogBoots: async (params?: ListLogBootsParams): Promise<BootPage> => {
    const data = unwrap(await client.GET("/api/v1/logs/boots", { params: { query: params } }));
    return { ...data, items: data.items.map(toBootResponse) };
  },

  listSpans: async (params?: ListLogSpansParams): Promise<LogSpanPage> => {
    const data = unwrap(await client.GET("/api/v1/logs/spans", { params: { query: params } }));
    return { ...data, items: data.items.map(toLogSpan) };
  },

  getSpan: async (id: string): Promise<LogSpanDetail> =>
    toLogSpanDetail(
      unwrap(await client.GET("/api/v1/logs/spans/{id}", { params: { path: { id } } })),
    ),

  getMe: async (): Promise<CurrentActor> => unwrap(await client.GET("/api/v1/auth/me")),

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

  listUsers: async (params?: ListUsersParams): Promise<UserPage> =>
    unwrap(await client.GET("/api/v1/users", { params: { query: params } })),

  createUser: async (body: CreateUserBody): Promise<User> =>
    unwrap(await client.POST("/api/v1/users", { body })),

  deleteUser: async (id: string): Promise<void> => {
    unwrapVoid(await client.DELETE("/api/v1/users/{id}", { params: { path: { id } } }));
  },

  listApiKeys: async (params?: ListApiKeysParams): Promise<ApiKeyPage> =>
    unwrap(await client.GET("/api/v1/api-keys", { params: { query: params } })),

  createApiKey: async (body: CreateApiKeyBody): Promise<CreatedApiKey> =>
    unwrap(await client.POST("/api/v1/api-keys", { body })),

  deleteApiKey: async (id: string): Promise<void> => {
    unwrapVoid(await client.DELETE("/api/v1/api-keys/{id}", { params: { path: { id } } }));
  },

  listTasks: async (params?: ListTasksParams): Promise<TaskPage> => {
    const data = unwrap(await client.GET("/api/v1/tasks", { params: { query: params } }));
    return { ...data, items: data.items.map(toTask) };
  },

  getTask: async (id: string): Promise<Task> =>
    toTask(unwrap(await client.GET("/api/v1/tasks/{id}", { params: { path: { id } } }))),

  createTask: async (body: CreateTaskBody): Promise<Task> =>
    toTask(unwrap(await client.POST("/api/v1/tasks", { body }))),

  cancelTask: async (id: string): Promise<void> => {
    unwrapVoid(await client.POST("/api/v1/tasks/{id}/cancel", { params: { path: { id } } }));
  },

  listTaskDefinitions: async (): Promise<TaskDefinition[]> =>
    unwrap(await client.GET("/api/v1/task-definitions")),

  listTaskSchedules: async (params?: ListTaskSchedulesParams): Promise<TaskSchedulePage> => {
    const data = unwrap(await client.GET("/api/v1/task-schedules", { params: { query: params } }));
    return { ...data, items: data.items.map(toTaskSchedule) };
  },

  getTaskSchedule: async (id: string): Promise<TaskSchedule> =>
    toTaskSchedule(
      unwrap(await client.GET("/api/v1/task-schedules/{id}", { params: { path: { id } } })),
    ),

  createTaskSchedule: async (body: CreateTaskScheduleBody): Promise<TaskSchedule> =>
    toTaskSchedule(unwrap(await client.POST("/api/v1/task-schedules", { body }))),

  updateTaskSchedule: async (id: string, body: UpdateTaskScheduleBody): Promise<TaskSchedule> =>
    toTaskSchedule(
      unwrap(await client.PATCH("/api/v1/task-schedules/{id}", { params: { path: { id } }, body })),
    ),

  deleteTaskSchedule: async (id: string): Promise<void> => {
    unwrapVoid(await client.DELETE("/api/v1/task-schedules/{id}", { params: { path: { id } } }));
  },

  listArtifacts: async (params?: ListArtifactsParams): Promise<ArtifactSummaryPage> => {
    const data = unwrap(await client.GET("/api/v1/artifacts", { params: { query: params } }));
    return { ...data, items: data.items.map(toArtifactSummary) };
  },

  getArtifact: async (key: string): Promise<ArtifactSummary> =>
    toArtifactSummary(
      unwrap(await client.GET("/api/v1/artifacts/{key}", { params: { path: { key } } })),
    ),

  uploadArtifact: async (key: string, body: Blob): Promise<ArtifactVersion> =>
    toArtifactVersion(
      unwrap(
        await client.PUT("/api/v1/artifacts/{key}", {
          params: { path: { key } },
          body: body as unknown as BodyInit,
          headers: { "Content-Type": "application/octet-stream" },
        }),
      ),
    ),

  listArtifactVersions: async (
    key: string,
    params?: ListArtifactVersionsParams,
  ): Promise<ArtifactVersionPage> => {
    const data = unwrap(
      await client.GET("/api/v1/artifacts/{key}/versions", {
        params: { path: { key }, query: params },
      }),
    );
    return { ...data, items: data.items.map(toArtifactVersion) };
  },

  getArtifactVersion: async (key: string, digest: string): Promise<ArtifactVersion> =>
    toArtifactVersion(
      unwrap(
        await client.GET("/api/v1/artifacts/{key}/versions/{digest}", {
          params: { path: { key, digest } },
        }),
      ),
    ),

  deleteArtifactVersion: async (key: string, digest: string): Promise<void> => {
    unwrapVoid(
      await client.DELETE("/api/v1/artifacts/{key}/versions/{digest}", {
        params: { path: { key, digest } },
      }),
    );
  },
};

export function userAvatarUrl(userId: string): string {
  return `/api/v1/users/${userId}/avatar`;
}

export function artifactBlobUrl(key: string, digest: string): string {
  return `/api/v1/artifacts/${encodeURIComponent(key)}/versions/${encodeURIComponent(digest)}/blob`;
}

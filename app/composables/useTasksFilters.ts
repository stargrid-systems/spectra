import * as z from "zod/v4/mini";
import type { ListTasksParams } from "~~/modules/aperture/runtime/types";
import { queryOptionalString, useRouteQueryState } from "~/composables/useRouteQueryState";

export const TASK_STATUS_FILTERS = [
  "active",
  "finished",
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "interrupted",
] as const;

export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number];

export function isTaskStatusFilter(value: string): value is TaskStatusFilter {
  return (TASK_STATUS_FILTERS as readonly string[]).includes(value);
}

const queryStatusFilter = z.codec(z.array(z.string()), z.custom<TaskStatusFilter | undefined>(), {
  decode: (arr) => {
    const v = arr[0];
    return v !== undefined && isTaskStatusFilter(v) ? v : undefined;
  },
  encode: (v) => (v ? [v] : []),
});

const queryRootDefaultTrue = z.codec(z.array(z.string()), z.boolean(), {
  decode: (arr) => (arr[0] === undefined ? true : arr[0] === "1"),
  encode: (v) => (v ? ["1"] : ["0"]),
});

export const tasksSchema = z.object({
  status: queryStatusFilter,
  kind: queryOptionalString(),
  root: queryRootDefaultTrue,
});

export type TasksFilters = z.infer<typeof tasksSchema>;

export const tasksQueryKeys: Partial<Record<keyof TasksFilters, string>> = {
  status: "status",
  kind: "kind",
  root: "root",
};

export function defaultTasksFilters(): TasksFilters {
  return { status: undefined, kind: undefined, root: true };
}

export function useTasksFilters(): TasksFilters {
  return useRouteQueryState(tasksSchema, { keys: tasksQueryKeys });
}

export function tasksParamsFromFilters(filters: TasksFilters): ListTasksParams {
  const p: ListTasksParams = {};
  if (filters.status) p.status = filters.status;
  if (filters.kind) p.kind = filters.kind;
  p.root = filters.root;
  return p;
}

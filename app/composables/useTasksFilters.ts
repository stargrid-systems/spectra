import * as z from "zod/v4/mini";
import type { ListTasksParams, TaskStatusParam } from "~~/modules/aperture/runtime/types";
import { queryOptionalString, useRouteQueryState } from "~/composables/useRouteQueryState";

// openapi-typescript emits types only, so there is no runtime array to import
// from the generated code. `satisfies` pins the values to the TaskStatusParam
// union and the assertion below fails if the spec grows a new status.
export const TASK_STATUS_FILTERS = [
  "active",
  "finished",
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const satisfies readonly TaskStatusParam[];

type AssertNever<T extends never> = T;
export type TaskStatusFiltersComplete = AssertNever<
  Exclude<TaskStatusParam, (typeof TASK_STATUS_FILTERS)[number]>
>;

export function isTaskStatusFilter(value: string): value is TaskStatusParam {
  return (TASK_STATUS_FILTERS as readonly string[]).includes(value);
}

const queryStatusFilter = z.codec(z.array(z.string()), z.custom<TaskStatusParam | undefined>(), {
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

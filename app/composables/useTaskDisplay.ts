import type { Task, TaskStatus } from "~~/modules/aperture/runtime/types";

export type TaskStatusColor = "neutral" | "primary" | "success" | "error" | "warning";

export const TASK_STATUS_COLORS: Record<TaskStatus, TaskStatusColor> = {
  pending: "neutral",
  running: "primary",
  succeeded: "success",
  failed: "error",
  cancelled: "warning",
  interrupted: "warning",
};

export function useTaskDisplay() {
  const { t, te } = useI18n();
  const fmt = useFormatter();

  function formatTimestamp(ts: Temporal.Instant): string {
    return fmt.date(ts, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(task: Task): string {
    if (!task.started_at) return t("operations.tasks.notStarted");
    if (!task.finished_at) return t("operations.tasks.status.running");
    return fmt.duration(task.finished_at.since(task.started_at), { fractionDigits: 1 });
  }

  function progressPercent(task: Task): number | null {
    const p = task.progress;
    if (!p?.total || p.done == null || p.total <= 0) return null;
    return Math.min(100, Math.round((p.done / p.total) * 100));
  }

  function progressMessage(task: Task): string | null {
    const msg = task.progress?.message;
    if (!msg) return null;
    return te(msg.key) ? t(msg.key, msg.args) : msg.key;
  }

  return { formatTimestamp, formatDuration, progressPercent, progressMessage };
}

<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import { useIntervalFn } from "@vueuse/core";
import type {
  ListTasksParams,
  Task,
  TaskDefinition,
  TaskStatus,
} from "~~/modules/aperture/runtime/types";
import {
  TASK_STATUS_FILTERS,
  tasksParamsFromFilters,
  useTasksFilters,
} from "~/composables/useTasksFilters";

const { t, te } = useI18n();
const fmt = useFormatter();

const filters = useTasksFilters();

const { data: definitions } = useAsyncData<TaskDefinition[]>(
  "task-definitions",
  () => apertureApi.listTaskDefinitions(),
  { server: false },
);

const params = computed(() => tasksParamsFromFilters(filters));

const {
  items: tasks,
  pending,
  error,
  hasNext,
  hasPrev,
  loadNext,
  loadPrev,
  reload,
} = useCursorPager<Task, ListTasksParams>(
  (query) => apertureApi.listTasks(query),
  () => params.value,
);

const STATUS_COLORS: Record<TaskStatus, "neutral" | "primary" | "success" | "error" | "warning"> = {
  pending: "neutral",
  running: "primary",
  succeeded: "success",
  failed: "error",
  cancelled: "warning",
  interrupted: "warning",
};

const statusItems = computed<SelectMenuItem[]>(() => [
  { label: t("operations.tasks.filters.statusAll"), value: undefined },
  ...TASK_STATUS_FILTERS.map((s) => ({
    label: t(`operations.tasks.status.${s}`),
    value: s,
  })),
]);

const kindItems = computed<SelectMenuItem[]>(() => [
  { label: t("operations.tasks.filters.kindAll"), value: undefined },
  ...(definitions.value ?? []).map((d) => ({ label: d.kind, value: d.kind })),
]);

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

const hasActiveTasks = computed(() =>
  tasks.value.some((task) => task.status === "pending" || task.status === "running"),
);

const { pause, resume } = useIntervalFn(() => void reload(), 3000);

watch(hasActiveTasks, (active) => (active ? resume() : pause()), { immediate: true });

onUnmounted(pause);
</script>

<template>
  <AppPage :title="$t('operations.tasks.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-default">
        <USelectMenu
          v-model="filters.status"
          :items="statusItems"
          value-attribute="value"
          size="sm"
          class="w-44"
        />

        <USelectMenu
          v-model="filters.kind"
          :items="kindItems"
          value-attribute="value"
          size="sm"
          class="w-44"
        />

        <UCheckbox
          :model-value="filters.root"
          :label="$t('operations.tasks.filters.rootOnly')"
          size="sm"
          @update:model-value="(v) => (filters.root = v === true)"
        />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :label="$t('operations.tasks.refresh')"
          :loading="pending && tasks.length === 0"
          class="ms-auto"
          @click="reload()"
        />
      </div>
    </template>

    <div class="p-4">
      <DataState
        :pending="pending && tasks.length === 0"
        :error="error ? String(error) : null"
        :empty="tasks.length === 0"
        :empty-text="$t('operations.tasks.empty')"
        :error-text="$t('operations.tasks.error')"
        :retry-text="$t('common.retry')"
        @retry="reload()"
      >
        <div class="flex flex-col gap-2">
          <UPageCard v-for="task in tasks" :key="task.id" variant="subtle">
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <UBadge
                    :label="$t(`operations.tasks.status.${task.status}`)"
                    :color="STATUS_COLORS[task.status]"
                    variant="subtle"
                  />
                  <span class="font-mono text-sm truncate">{{ task.kind }}</span>
                  <span class="text-muted text-xs font-mono hidden md:inline">{{ task.id }}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-muted">
                  <span>{{ formatTimestamp(task.created_at) }}</span>
                  <span class="tabular-nums">{{ formatDuration(task) }}</span>
                </div>
              </div>

              <div v-if="task.status === 'running'" class="flex items-center gap-3">
                <UProgress
                  v-if="progressPercent(task) !== null"
                  :model-value="progressPercent(task)!"
                  size="sm"
                  class="flex-1"
                />
                <span v-else class="flex items-center gap-2 text-xs text-muted">
                  <LoadingSpinner class="size-3.5" />
                  {{ progressMessage(task) ?? $t("operations.tasks.status.running") }}
                </span>
                <span
                  v-if="progressPercent(task) !== null"
                  class="text-xs text-muted tabular-nums w-10 text-end"
                >
                  {{ progressPercent(task) }}%
                </span>
              </div>

              <p
                v-if="task.error"
                class="text-xs text-error font-mono break-all whitespace-pre-wrap"
              >
                {{ task.error }}
              </p>

              <p
                v-else-if="
                  task.status === 'running' &&
                  progressPercent(task) !== null &&
                  progressMessage(task)
                "
                class="text-xs text-muted truncate"
              >
                {{ progressMessage(task) }}
              </p>
            </div>
          </UPageCard>
        </div>

        <PagerBar
          :has-prev="hasPrev"
          :has-next="hasNext"
          :pending="pending && tasks.length === 0"
          :prev-text="$t('common.prev')"
          :next-text="$t('common.next')"
          @prev="loadPrev()"
          @next="loadNext()"
        />
      </DataState>
    </div>
  </AppPage>
</template>

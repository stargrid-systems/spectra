<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import type { ListTasksParams, Task, TaskDefinition } from "~~/modules/aperture/runtime/types";
import type { JsonSchemaLike } from "~/utils/schemaDisplay";
import { TASK_STATUS_COLORS, useTaskDisplay } from "~/composables/useTaskDisplay";

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const localePath = useLocalePath();
const { formatTimestamp, formatDuration, progressPercent, progressMessage } = useTaskDisplay();

const taskId = computed(() => String(route.params.id));

const task = ref<Task | null>(null);
const loadError = ref<unknown>(null);
const loading = ref(false);

const { data: definitionsData } = useAsyncData<TaskDefinition[]>(
  "task-definitions",
  () => apertureApi.listTaskDefinitions(),
  { server: false },
);

const definition = computed<TaskDefinition | undefined>(() =>
  (definitionsData.value ?? []).find((d) => d.kind === task.value?.kind),
);

function asSchema(value: unknown): JsonSchemaLike | undefined {
  return typeof value === "object" && value !== null ? (value as JsonSchemaLike) : undefined;
}

const inputSchema = computed(() => asSchema(definition.value?.input_schema));
const outputSchema = computed(() => asSchema(definition.value?.output_schema));

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    task.value = await apertureApi.getTask(taskId.value);
  } catch (err) {
    loadError.value = err;
  } finally {
    loading.value = false;
  }
}

const isActive = computed(
  () => task.value?.status === "pending" || task.value?.status === "running",
);

const { pause, resume } = useIntervalFn(() => void load(), 3000);

watch(isActive, (active) => (active ? resume() : pause()), { immediate: true });

onUnmounted(pause);

onMounted(() => void load());

const canCancel = computed(() => {
  if (!isActive.value) return false;
  const def = definition.value;
  return def ? def.cancellable : true;
});

const cancelling = ref(false);

async function cancel() {
  cancelling.value = true;
  try {
    await apertureApi.cancelTask(taskId.value);
    toast.add({ title: t("operations.tasks.cancelRequested"), color: "success" });
    await load();
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      toast.add({ title: t("operations.tasks.cancelNotCancellable"), color: "error" });
    } else if (err instanceof ApiError && err.status === 410) {
      toast.add({ title: t("operations.tasks.cancelAlreadyFinished"), color: "error" });
    } else {
      toast.add({ title: t("operations.tasks.cancelFailed"), color: "error" });
    }
  } finally {
    cancelling.value = false;
  }
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

const showRawInput = ref(false);
const showRawOutput = ref(false);

const {
  items: children,
  pending: childrenPending,
  error: childrenError,
  hasNext: childrenHasNext,
  hasPrev: childrenHasPrev,
  loadNext: childrenLoadNext,
  loadPrev: childrenLoadPrev,
  reload: childrenReload,
} = useCursorPager<Task, ListTasksParams>(
  (query) => apertureApi.listTasks(query),
  () => ({ parent: taskId.value }),
);
</script>

<template>
  <AppPage :title="task?.kind ?? taskId" back-to="/operations/tasks">
    <div class="p-4 flex flex-col gap-4">
      <DataState
        :pending="loading && !task"
        :error="loadError ? String(loadError) : null"
        :error-text="$t('operations.tasks.error')"
        :retry-text="$t('common.retry')"
        @retry="load()"
      >
        <div v-if="task" class="flex flex-col gap-4">
          <UPageCard variant="subtle">
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <UBadge
                    :label="$t(`operations.tasks.status.${task.status}`)"
                    :color="TASK_STATUS_COLORS[task.status]"
                    variant="subtle"
                  />
                  <span class="font-mono text-sm truncate">{{ task.kind }}</span>
                  <span class="text-muted text-xs font-mono">{{ task.id }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="canCancel"
                    icon="i-lucide-circle-stop"
                    color="error"
                    variant="soft"
                    size="sm"
                    :label="$t('operations.tasks.cancel')"
                    :loading="cancelling"
                    @click="cancel()"
                  />
                  <UButton
                    icon="i-lucide-refresh-cw"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :label="$t('operations.tasks.refresh')"
                    :loading="loading"
                    @click="load()"
                  />
                </div>
              </div>

              <div class="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted">
                <span>
                  {{ $t("operations.tasks.detail.createdAt") }}:
                  <span class="text-default">{{ formatTimestamp(task.created_at) }}</span>
                </span>
                <span v-if="task.started_at">
                  {{ $t("operations.tasks.detail.startedAt") }}:
                  <span class="text-default">{{ formatTimestamp(task.started_at) }}</span>
                </span>
                <span v-if="task.finished_at">
                  {{ $t("operations.tasks.detail.finishedAt") }}:
                  <span class="text-default">{{ formatTimestamp(task.finished_at) }}</span>
                </span>
                <span>
                  {{ $t("operations.tasks.detail.duration") }}:
                  <span class="text-default tabular-nums">{{ formatDuration(task) }}</span>
                </span>
                <span v-if="task.parent_id">
                  {{ $t("operations.tasks.detail.parent") }}:
                  <UButton
                    :to="localePath(`/operations/tasks/${task.parent_id}`)"
                    variant="link"
                    size="xs"
                    class="font-mono px-0"
                    :label="task.parent_id"
                  />
                </span>
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
                v-if="
                  task.status === 'running' &&
                  progressPercent(task) !== null &&
                  progressMessage(task)
                "
                class="text-xs text-muted"
              >
                {{ progressMessage(task) }}
              </p>

              <p
                v-if="task.error"
                class="text-xs text-error font-mono break-all whitespace-pre-wrap"
              >
                {{ task.error }}
              </p>
            </div>
          </UPageCard>

          <UPageCard variant="subtle" :ui="{ body: 'overflow-x-auto' }">
            <template #title>
              <div class="flex items-center justify-between gap-2 w-full">
                <span>{{ $t("operations.tasks.detail.input") }}</span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :icon="showRawInput ? 'i-lucide-braces' : 'i-lucide-file-code'"
                  :label="$t('common.rawJson')"
                  @click="showRawInput = !showRawInput"
                />
              </div>
            </template>
            <SchemaValue
              v-if="!showRawInput"
              :value="task.input"
              :schema="inputSchema"
              :empty-text="$t('common.noParameters')"
            />
            <pre v-else class="text-xs font-mono whitespace-pre">{{ prettyJson(task.input) }}</pre>
          </UPageCard>

          <UPageCard
            v-if="task.output !== undefined"
            variant="subtle"
            :ui="{ body: 'overflow-x-auto' }"
          >
            <template #title>
              <div class="flex items-center justify-between gap-2 w-full">
                <span>{{ $t("operations.tasks.detail.output") }}</span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :icon="showRawOutput ? 'i-lucide-braces' : 'i-lucide-file-code'"
                  :label="$t('common.rawJson')"
                  @click="showRawOutput = !showRawOutput"
                />
              </div>
            </template>
            <SchemaValue
              v-if="!showRawOutput"
              :value="task.output"
              :schema="outputSchema"
              :empty-text="$t('common.noParameters')"
            />
            <pre v-else class="text-xs font-mono whitespace-pre">{{ prettyJson(task.output) }}</pre>
          </UPageCard>

          <UPageCard :title="$t('operations.tasks.detail.children')" variant="subtle">
            <DataState
              :pending="childrenPending && children.length === 0"
              :error="childrenError ? String(childrenError) : null"
              :empty="children.length === 0"
              :empty-text="$t('operations.tasks.detail.noChildren')"
              :error-text="$t('operations.tasks.error')"
              :retry-text="$t('common.retry')"
              @retry="childrenReload()"
            >
              <div class="flex flex-col gap-2">
                <UPageCard
                  v-for="child in children"
                  :key="child.id"
                  variant="outline"
                  :to="localePath(`/operations/tasks/${child.id}`)"
                >
                  <div class="flex flex-wrap sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <UBadge
                        :label="$t(`operations.tasks.status.${child.status}`)"
                        :color="TASK_STATUS_COLORS[child.status]"
                        variant="subtle"
                      />
                      <span class="font-mono text-sm truncate">{{ child.kind }}</span>
                      <span class="text-muted text-xs font-mono">{{ child.id }}</span>
                    </div>
                    <span class="text-xs text-muted">{{ formatTimestamp(child.created_at) }}</span>
                  </div>
                </UPageCard>
              </div>

              <PagerBar
                :has-prev="childrenHasPrev"
                :has-next="childrenHasNext"
                :pending="childrenPending && children.length === 0"
                :prev-text="$t('common.prev')"
                :next-text="$t('common.next')"
                @prev="childrenLoadPrev()"
                @next="childrenLoadNext()"
              />
            </DataState>
          </UPageCard>
        </div>
      </DataState>
    </div>
  </AppPage>
</template>

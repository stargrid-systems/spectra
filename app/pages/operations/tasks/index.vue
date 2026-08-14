<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import * as z from "zod/v4/mini";
import { useIntervalFn } from "@vueuse/core";
import type {
  CreateTaskBody,
  ListTasksParams,
  Task,
  TaskDefinition,
} from "~~/modules/aperture/runtime/types";
import type { JsonSchemaLike } from "~/utils/schemaDisplay";
import { buildFormState, buildZodSchema, cleanFormState, type FormState } from "~/utils/schemaForm";
import {
  TASK_STATUS_FILTERS,
  tasksParamsFromFilters,
  useTasksFilters,
} from "~/composables/useTasksFilters";
import { TASK_STATUS_COLORS, useTaskDisplay } from "~/composables/useTaskDisplay";

const { t } = useI18n();
const toast = useToast();
const localePath = useLocalePath();
const { formatTimestamp, formatDuration, progressPercent, progressMessage } = useTaskDisplay();

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

const hasActiveTasks = computed(() =>
  tasks.value.some((task) => task.status === "pending" || task.status === "running"),
);

const { pause, resume } = useIntervalFn(() => void reload(), 3000);

watch(hasActiveTasks, (active) => (active ? resume() : pause()), { immediate: true });

onUnmounted(pause);

// Create task: the input form is generated from the kind's JSON Schema.

const createOpen = ref(false);
const createKind = ref<string | undefined>(undefined);
const createState = ref<FormState>({});
const creating = ref(false);

const createKindItems = computed<SelectMenuItem[]>(() =>
  (definitions.value ?? []).map((d) => ({ label: d.kind, value: d.kind })),
);

const selectedDefinition = computed<TaskDefinition | undefined>(() =>
  (definitions.value ?? []).find((d) => d.kind === createKind.value),
);

const createInputSchema = computed<JsonSchemaLike | undefined>(() => {
  const schema = selectedDefinition.value?.input_schema;
  return typeof schema === "object" && schema !== null ? (schema as JsonSchemaLike) : undefined;
});

const createZodSchema = computed(() =>
  createInputSchema.value ? buildZodSchema(createInputSchema.value) : z.object({}),
);

watch(createKind, (kind) => {
  const def = (definitions.value ?? []).find((d) => d.kind === kind);
  const schema =
    typeof def?.input_schema === "object" && def?.input_schema !== null
      ? (def.input_schema as JsonSchemaLike)
      : undefined;
  createState.value = schema ? buildFormState(schema) : {};
});

function openCreate() {
  createKind.value = definitions.value?.[0]?.kind;
  createOpen.value = true;
}

async function onCreate() {
  if (!createKind.value) return;
  creating.value = true;
  try {
    const payload = {
      kind: createKind.value,
      input: cleanFormState(createState.value, createInputSchema.value),
    };
    // The generated client narrows the body to the known kinds' unions; the
    // schema-driven payload is valid at runtime for any kind.
    await apertureApi.createTask(payload as CreateTaskBody);
    createOpen.value = false;
    toast.add({ title: t("operations.tasks.created"), color: "success" });
    await reload();
  } catch (err) {
    toast.add({
      title:
        err instanceof ApiError && err.status === 400
          ? t("operations.tasks.createInvalid")
          : t("operations.tasks.createFailed"),
      color: "error",
    });
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <AppPage :title="$t('operations.tasks.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-default">
        <USelectMenu
          v-model="filters.status"
          :items="statusItems"
          value-key="value"
          size="sm"
          class="w-44"
        />

        <USelectMenu
          v-model="filters.kind"
          :items="kindItems"
          value-key="value"
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
          icon="i-lucide-plus"
          size="sm"
          :label="$t('operations.tasks.create')"
          :disabled="!definitions?.length"
          @click="openCreate()"
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
          <UPageCard
            v-for="task in tasks"
            :key="task.id"
            variant="subtle"
            :to="localePath(`/operations/tasks/${task.id}`)"
          >
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <UBadge
                    :label="$t(`operations.tasks.status.${task.status}`)"
                    :color="TASK_STATUS_COLORS[task.status]"
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

    <UModal v-model:open="createOpen" :title="$t('operations.tasks.create')">
      <template #body>
        <UForm
          :schema="createZodSchema"
          :state="createState"
          class="flex flex-col gap-4"
          @submit="onCreate"
        >
          <UFormField :label="$t('operations.tasks.filters.kind')" name="kind">
            <USelectMenu
              v-model="createKind"
              :items="createKindItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p
            v-if="createInputSchema && !Object.keys(createInputSchema.properties ?? {}).length"
            class="text-muted text-sm"
          >
            {{ $t("common.noParameters") }}
          </p>
          <SchemaForm
            v-else-if="createInputSchema"
            :schema="createInputSchema"
            :state="createState"
          />

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="createOpen = false" />
            <UButton type="submit" :loading="creating" :label="$t('common.create')" />
          </div>
        </UForm>
      </template>
    </UModal>
  </AppPage>
</template>

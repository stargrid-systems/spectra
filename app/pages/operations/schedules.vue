<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import * as z from "zod/v4/mini";
import type { ListTaskSchedulesParams, TaskSchedule } from "~~/modules/aperture/runtime/types";
import type { JsonSchemaLike } from "~/utils/schemaDisplay";
import { buildFormState, buildZodSchema, cleanFormState, type FormState } from "~/utils/schemaForm";
import {
  useTaskDefinitionCache,
  useTaskDefinitionSummaries,
} from "~/composables/useTaskDefinitions";

const { t } = useI18n();
const toast = useToast();
const fmt = useFormatter();
const localePath = useLocalePath();

const {
  items: definitionSummaries,
  loadingMore: definitionsLoadingMore,
  hasMore: definitionsHasMore,
  loadMore: loadMoreDefinitions,
} = useTaskDefinitionSummaries();

const { getDefinition } = useTaskDefinitionCache();

const definitionSchemas = ref<Map<string, JsonSchemaLike | undefined>>(new Map());

function inputSchemaFor(key: string): JsonSchemaLike | undefined {
  return definitionSchemas.value.get(key);
}

// Schemas render inline per row; fetch them lazily for visible keys.
watch(
  definitionSummaries,
  (summaries) => {
    for (const { key } of summaries) {
      if (definitionSchemas.value.has(key)) continue;
      definitionSchemas.value.set(key, undefined);
      void getDefinition(key).then((definition) => {
        const schema = definition?.input_schema;
        definitionSchemas.value.set(
          key,
          typeof schema === "object" && schema !== null ? (schema as JsonSchemaLike) : undefined,
        );
      });
    }
  },
  { immediate: true },
);

const {
  items: schedules,
  pending,
  error,
  hasNext,
  hasPrev,
  loadNext,
  loadPrev,
  reload,
} = useCursorPager<TaskSchedule, ListTaskSchedulesParams>((query) =>
  apertureApi.listTaskSchedules(query),
);

// Also fetch schemas for schedule keys that have no definition summary yet.
watch(
  schedules,
  (rows) => {
    for (const row of rows) {
      if (definitionSchemas.value.has(row.key)) continue;
      definitionSchemas.value.set(row.key, undefined);
      void getDefinition(row.key).then((definition) => {
        const schema = definition?.input_schema;
        definitionSchemas.value.set(
          row.key,
          typeof schema === "object" && schema !== null ? (schema as JsonSchemaLike) : undefined,
        );
      });
    }
  },
  { immediate: true },
);

function formatTimestamp(ts: Temporal.Instant): string {
  return fmt.date(ts, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInterval(schedule: TaskSchedule): string {
  return fmt.duration(Temporal.Duration.from(schedule.interval), { fractionDigits: 1 });
}

async function toggleEnabled(schedule: TaskSchedule) {
  const next = !schedule.enabled;
  schedule.enabled = next;
  try {
    await apertureApi.updateTaskSchedule(schedule.id, { enabled: next });
  } catch {
    schedule.enabled = !next;
    toast.add({ title: t("operations.schedules.updateFailed"), color: "error" });
  }
}

async function onDelete(schedule: TaskSchedule) {
  try {
    await apertureApi.deleteTaskSchedule(schedule.id);
    await reload();
    toast.add({ title: t("operations.schedules.deleted"), color: "success" });
  } catch {
    toast.add({ title: t("operations.schedules.deleteFailed"), color: "error" });
  }
}

// Create modal.

const createOpen = ref(false);
const createKey = ref<string | undefined>(undefined);
const createState = ref<FormState>({});
const createInputSchema = ref<JsonSchemaLike | undefined>(undefined);
const createInterval = ref<Temporal.Duration | undefined>(undefined);
const creating = ref(false);

const keyItems = computed<SelectMenuItem[]>(() =>
  definitionSummaries.value.map((d) => ({ label: d.key, value: d.key })),
);

const createZodSchema = computed(() =>
  createInputSchema.value ? buildZodSchema(createInputSchema.value) : z.object({}),
);

watch(createKey, async (key) => {
  createState.value = {};
  createInputSchema.value = undefined;
  if (!key) return;
  const definition = await getDefinition(key);
  if (createKey.value !== key) return;
  const schema = definition?.input_schema;
  createInputSchema.value =
    typeof schema === "object" && schema !== null ? (schema as JsonSchemaLike) : undefined;
  if (createInputSchema.value) {
    createState.value = buildFormState(createInputSchema.value);
  }
});

function openCreate() {
  createKey.value = definitionSummaries.value[0]?.key;
  createInterval.value = undefined;
  createOpen.value = true;
}

async function onCreate() {
  if (!createKey.value || !createInterval.value) return;
  creating.value = true;
  try {
    await apertureApi.createTaskSchedule({
      key: createKey.value,
      input: cleanFormState(createState.value, createInputSchema.value),
      interval: createInterval.value.toString(),
    });
    createOpen.value = false;
    toast.add({ title: t("operations.schedules.created"), color: "success" });
    await reload();
  } catch {
    toast.add({ title: t("operations.schedules.createFailed"), color: "error" });
  } finally {
    creating.value = false;
  }
}

// Edit modal.

const editOpen = ref(false);
const editTarget = ref<TaskSchedule | null>(null);
const editInterval = ref<Temporal.Duration | undefined>(undefined);
const editing = ref(false);

function openEdit(schedule: TaskSchedule) {
  editTarget.value = schedule;
  editInterval.value = Temporal.Duration.from(schedule.interval);
  editOpen.value = true;
}

async function onEdit() {
  if (!editTarget.value || !editInterval.value) return;
  editing.value = true;
  try {
    await apertureApi.updateTaskSchedule(editTarget.value.id, {
      interval: editInterval.value.toString(),
    });
    editOpen.value = false;
    toast.add({ title: t("operations.schedules.edited"), color: "success" });
    await reload();
  } catch {
    toast.add({ title: t("operations.schedules.updateFailed"), color: "error" });
  } finally {
    editing.value = false;
  }
}
</script>

<template>
  <AppPage :title="$t('operations.schedules.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-center justify-end gap-2 px-4 py-2 border-b border-default">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :label="$t('operations.schedules.refresh')"
          :loading="pending && schedules.length === 0"
          @click="reload()"
        />
        <UButton
          icon="i-lucide-plus"
          size="sm"
          :label="$t('operations.schedules.create')"
          :disabled="!definitionSummaries.length"
          @click="openCreate()"
        />
      </div>
    </template>

    <div class="p-4">
      <DataState
        :pending="pending && schedules.length === 0"
        :error="error ? String(error) : null"
        :empty="schedules.length === 0"
        :empty-text="$t('operations.schedules.empty')"
        :error-text="$t('operations.schedules.error')"
        :retry-text="$t('common.retry')"
        @retry="reload()"
      >
        <div class="flex flex-col gap-2">
          <UPageCard v-for="schedule in schedules" :key="schedule.id" variant="subtle">
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <USwitch
                    :model-value="schedule.enabled"
                    @update:model-value="() => toggleEnabled(schedule)"
                  />
                  <span class="font-mono text-sm truncate">{{ schedule.key }}</span>
                  <UBadge :label="formatInterval(schedule)" variant="subtle" />
                  <span class="text-muted text-xs font-mono hidden md:inline">
                    {{ schedule.id }}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-muted">
                  <span>
                    {{ $t("operations.schedules.nextRun") }}:
                    {{ formatTimestamp(schedule.next_run_at) }}
                  </span>
                  <span v-if="schedule.last_run_at || schedule.last_task_id">
                    {{ $t("operations.schedules.lastRun") }}:
                    <UButton
                      v-if="schedule.last_task_id"
                      :to="localePath(`/operations/tasks/${schedule.last_task_id}`)"
                      variant="link"
                      size="xs"
                      class="px-0"
                      :label="schedule.last_run_at ? formatTimestamp(schedule.last_run_at) : 'task'"
                    />
                    <template v-else-if="schedule.last_run_at">
                      {{ formatTimestamp(schedule.last_run_at) }}
                    </template>
                  </span>
                  <span v-else>
                    {{ $t("operations.schedules.lastRun") }}: {{ $t("operations.schedules.never") }}
                  </span>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :label="$t('operations.schedules.edit')"
                    @click="openEdit(schedule)"
                  />
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="onDelete(schedule)"
                  />
                </div>
              </div>

              <USeparator />

              <div>
                <div class="text-xs font-semibold text-muted-foreground mb-1">
                  {{ $t("operations.schedules.input") }}
                </div>
                <SchemaValue
                  :value="schedule.input"
                  :schema="inputSchemaFor(schedule.key)"
                  :empty-text="$t('common.noParameters')"
                />
              </div>
            </div>
          </UPageCard>
        </div>

        <PagerBar
          :has-prev="hasPrev"
          :has-next="hasNext"
          :pending="pending && schedules.length === 0"
          :prev-text="$t('common.prev')"
          :next-text="$t('common.next')"
          @prev="loadPrev()"
          @next="loadNext()"
        />
      </DataState>
    </div>

    <UModal v-model:open="createOpen" :title="$t('operations.schedules.create')">
      <template #body>
        <UForm
          :schema="createZodSchema"
          :state="createState"
          class="flex flex-col gap-4"
          @submit="onCreate()"
        >
          <UFormField :label="$t('operations.tasks.filters.key')" name="key">
            <InfiniteSelectMenu
              v-model="createKey"
              :items="keyItems"
              :loading="definitionsLoadingMore"
              :has-more="definitionsHasMore"
              value-key="value"
              class="w-full"
              @load-more="loadMoreDefinitions()"
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
            v-model:state="createState"
            :schema="createInputSchema"
          />

          <UFormField
            :label="$t('operations.schedules.interval')"
            name="interval"
            :help="!createInterval ? $t('operations.schedules.invalidInterval') : undefined"
          >
            <IntervalInput v-model="createInterval" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="createOpen = false" />
            <UButton
              type="submit"
              :loading="creating"
              :label="$t('common.create')"
              :disabled="!createInterval"
            />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :title="$t('operations.schedules.edit')">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField
            :label="$t('operations.schedules.interval')"
            :help="!editInterval ? $t('operations.schedules.invalidInterval') : undefined"
          >
            <IntervalInput v-model="editInterval" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="editOpen = false" />
            <UButton
              :loading="editing"
              :label="$t('common.save')"
              :disabled="!editInterval"
              @click="onEdit()"
            />
          </div>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>

<script setup lang="ts">
import type { BootResponse } from "~/utils/api/types";
import { useLogsFilters } from "~/composables/useLogsFilters";
import { useLogsContextKey } from "~/composables/useLogsContext";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();

const { filters } = useLogsFilters();

const since = ref<string | undefined>(undefined);
const until = ref<string | undefined>(undefined);

const { data: targetOptions } = useLogTargets();
const { data: bootsData } = useBoots();
const boots = computed<BootResponse[]>(() => bootsData.value ?? []);

const targetItems = computed(() =>
  (targetOptions.value ?? []).map((target) => ({ label: target, value: target })),
);

const inlineFields = ref(true);
const showFieldFilter = ref(filters.fieldFilters.length > 0);
const refreshTrigger = ref(0);

function triggerRefresh() {
  refreshTrigger.value++;
}

const newFieldKey = ref("");
const newFieldValue = ref("");

function addFieldFilter() {
  if (newFieldKey.value && newFieldValue.value) {
    filters.fieldFilters.push({ key: newFieldKey.value, value: newFieldValue.value });
    newFieldKey.value = "";
    newFieldValue.value = "";
  }
}

function removeFieldFilter(idx: number) {
  filters.fieldFilters.splice(idx, 1);
}

function clearFilters() {
  filters.level = "info";
  filters.target = [];
  filters.search = undefined;
  filters.timeRange = undefined;
  filters.bootId = undefined;
  filters.fieldFilters = [];
  filters.spanId = undefined;
  filters.expandEvent = [];
  filters.expandSpan = [];
  since.value = undefined;
  until.value = undefined;
}

const levelColors: Record<
  string,
  "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral"
> = {
  trace: "neutral",
  debug: "info",
  info: "primary",
  warn: "warning",
  error: "error",
};

const levelOptions = computed(() => [
  { label: t("developer.logs.levels.trace"), value: "trace" },
  { label: t("developer.logs.levels.debug"), value: "debug" },
  { label: t("developer.logs.levels.info"), value: "info" },
  { label: t("developer.logs.levels.warn"), value: "warn" },
  { label: t("developer.logs.levels.error"), value: "error" },
]);

function formatDuration(startedAt: string, endedAt?: string | null): string {
  if (!endedAt) return t("developer.logs.running");
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatBootLabel(boot: BootResponse): string {
  const start = new Date(boot.first_seen).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dur = formatDuration(boot.first_seen, boot.last_seen);
  return `${start}  (${dur})`;
}

const bootPreview = computed(() => {
  if (!filters.bootId) return t("developer.logs.bootSelect.allBoots");
  const boot = boots.value.find((b) => b.boot_id === filters.bootId);
  if (!boot) return t("developer.logs.bootSelect.allBoots");
  return formatBootLabel(boot);
});

const bootMenuOpen = ref(false);

function selectBoot(bootId: string | undefined) {
  filters.bootId = bootId;
  bootMenuOpen.value = false;
}

function focusSpan(spanId: string) {
  filters.spanId = spanId;
  void router.push(localePath("/developer/logs/spans"));
}

function showAllSpans() {
  filters.spanId = undefined;
}

const activeTab = computed({
  get() {
    if (route.path.endsWith("/spans")) return "spans";
    return "events";
  },
  set(value: string | number) {
    void router.replace({
      path: localePath(value === "spans" ? "/developer/logs/spans" : "/developer/logs/events"),
      query: route.query,
    });
  },
});

const logsContext = {
  filters,
  inlineFields,
  since,
  until,
  boots,
  targetOptions,
  levelColors,
  formatDuration,
  focusSpan,
  showAllSpans,
  refreshTrigger,
};

provide(useLogsContextKey, logsContext);
</script>

<template>
  <AppPage :title="$t('developer.logs.title')" body-class="!overflow-hidden">
    <template #toolbar>
      <div class="flex items-center gap-3 px-4 py-2 border-b border-default">
        <UTabs
          v-model="activeTab"
          :items="[
            { label: $t('developer.logs.views.events'), value: 'events' },
            { label: $t('developer.logs.views.spans'), value: 'spans' },
          ]"
          size="sm"
          :content="false"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-default">
        <UPopover v-model:open="bootMenuOpen" :popper="{ placement: 'bottom-start' }">
          <UButton
            size="sm"
            color="neutral"
            :variant="filters.bootId ? 'soft' : 'outline'"
            icon="i-lucide-power"
            :label="bootPreview"
            class="max-w-72 truncate"
          />
          <template #content>
            <div class="w-80 py-1">
              <button
                type="button"
                class="w-full text-start px-3 py-2 text-sm hover:bg-elevated/50"
                @click="selectBoot(undefined)"
              >
                {{ $t("developer.logs.bootSelect.allBoots") }}
              </button>
              <div
                v-for="item in boots"
                :key="item.boot_id"
                class="w-full text-start px-3 py-2 hover:bg-elevated/50 cursor-pointer flex items-center justify-between gap-2"
                :class="item.boot_id === filters.bootId ? 'bg-elevated/40' : ''"
                @click="selectBoot(item.boot_id)"
              >
                <div class="min-w-0 flex flex-col">
                  <span class="text-sm truncate">{{ formatBootLabel(item) }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ item.event_count }} {{ $t("developer.logs.events") }}
                  </span>
                </div>
                <UBadge
                  v-if="item.is_current"
                  color="primary"
                  variant="subtle"
                  size="sm"
                  :label="$t('developer.logs.bootSelect.current')"
                />
              </div>
              <div v-if="!boots.length" class="px-3 py-2 text-xs text-muted-foreground">
                {{ $t("developer.logs.bootSelect.empty") }}
              </div>
            </div>
          </template>
        </UPopover>

        <TimeRangePicker
          :model-value="filters.timeRange"
          :since="since"
          :until="until"
          @update:model-value="(v) => (filters.timeRange = v)"
          @update:since="(v) => (since = v)"
          @update:until="(v) => (until = v)"
        />

        <USelect v-model="filters.level" :items="levelOptions" size="sm" class="w-32" />

        <USelectMenu
          v-model="filters.target"
          multiple
          :items="targetItems"
          searchable
          size="sm"
          class="w-60"
          value-key="value"
        >
          <template #default="{ modelValue }">
            <span
              v-if="!(modelValue as string[])?.length"
              class="text-muted-foreground text-xs truncate"
            >
              {{ $t("developer.logs.filters.targetAll") }}
            </span>
            <span v-else class="font-mono text-xs truncate">
              {{ (modelValue as string[]).join(", ") }}
            </span>
          </template>
          <template #item="{ item }">
            <div class="flex items-center gap-2 w-full">
              <UIcon
                v-if="filters.target.includes((item as { value: string }).value)"
                name="i-lucide-check"
                class="text-primary shrink-0 size-3.5"
              />
              <span v-else class="size-3.5 shrink-0" />
              <span class="font-mono text-xs truncate">{{
                (item as { label: string }).label
              }}</span>
            </div>
          </template>
        </USelectMenu>

        <UInput
          v-model="filters.search"
          :placeholder="$t('developer.logs.filters.search')"
          icon="i-lucide-search"
          size="sm"
          class="w-56"
        />

        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            size="sm"
            color="neutral"
            :variant="showFieldFilter || filters.fieldFilters.length ? 'soft' : 'outline'"
            icon="i-lucide-sliders-horizontal"
            :label="$t('developer.logs.filters.addField')"
          />
          <template #content>
            <div class="w-80 p-3 space-y-3">
              <div class="flex items-center gap-2">
                <UInput
                  v-model="newFieldKey"
                  :placeholder="$t('developer.logs.filters.fieldKey')"
                  size="sm"
                  class="flex-1"
                />
                <UInput
                  v-model="newFieldValue"
                  :placeholder="$t('developer.logs.filters.fieldValue')"
                  size="sm"
                  class="flex-1"
                  @keyup.enter="addFieldFilter"
                />
                <UButton icon="i-lucide-plus" size="sm" variant="soft" @click="addFieldFilter" />
              </div>
              <div v-if="filters.fieldFilters.length" class="flex flex-wrap gap-1">
                <UBadge
                  v-for="(f, idx) in filters.fieldFilters"
                  :key="idx"
                  variant="subtle"
                  class="gap-1 font-mono"
                >
                  <span>{{ f.key }}={{ f.value }}</span>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    variant="link"
                    @click="removeFieldFilter(idx)"
                  />
                </UBadge>
              </div>
              <UButton
                v-if="filters.fieldFilters.length"
                size="xs"
                color="neutral"
                variant="ghost"
                block
                :label="$t('developer.logs.filters.hideFields')"
                @click="
                  () => {
                    showFieldFilter = false;
                  }
                "
              />
            </div>
          </template>
        </UPopover>

        <UCheckbox v-model="inlineFields" :label="$t('developer.logs.inlineFields')" size="sm" />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :label="$t('developer.logs.refresh')"
          @click="triggerRefresh"
        />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          size="sm"
          :label="$t('developer.logs.filters.clear')"
          @click="clearFilters"
        />
      </div>
    </template>

    <NuxtPage />
  </AppPage>
</template>

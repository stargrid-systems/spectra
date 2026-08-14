<script setup lang="ts">
import type {
  BootResponse,
  ListLogBootsParams,
  ListLogTargetsParams,
  LogEvent,
  LogSpan,
} from "~~/modules/aperture/runtime/types";
import { defaultLogsState, queryKeys, schema } from "~/composables/useLogsFilters";
import { timeRangeDurations, useLogsContextKey } from "~/composables/useLogsContext";
import { LEVEL_COLORS, LOG_LEVELS } from "~/utils/logLevels";

const { t } = useI18n();
const fmt = useFormatter();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();

const filters = useRouteQueryState(schema, { keys: queryKeys });

const {
  items: targetItemsRaw,
  loadingMore: targetsLoadingMore,
  hasMore: targetsHasMore,
  loadMore: loadMoreTargets,
} = useInfiniteList<string, ListLogTargetsParams>((query) => apertureApi.listLogTargets(query));
const targetOptions = computed(() => targetItemsRaw.value);

const {
  items: bootsItems,
  hasMore: bootsHasMore,
  loadMore: loadMoreBoots,
} = useInfiniteList<BootResponse, ListLogBootsParams>((query) => apertureApi.listLogBoots(query));
const boots = computed<BootResponse[]>(() => bootsItems.value);

const targetItems = computed(() =>
  targetItemsRaw.value.map((target) => ({ label: target, value: target })),
);

const inlineFields = ref(true);
const showFieldFilter = ref(Object.keys(filters.fieldFilters).length > 0);

const refreshTick = ref(0);

function refresh() {
  refreshTick.value++;
}

const newFieldKey = ref("");
const newFieldValue = ref("");

function addFieldFilter() {
  if (newFieldKey.value && newFieldValue.value) {
    filters.fieldFilters[newFieldKey.value] = newFieldValue.value;
    newFieldKey.value = "";
    newFieldValue.value = "";
  }
}

function removeFieldFilter(key: string) {
  const { [key]: _, ...rest } = filters.fieldFilters;
  filters.fieldFilters = rest;
}

function clearFilters() {
  Object.assign(filters, defaultLogsState());
}

const levelOptions = computed(() =>
  LOG_LEVELS.map((value) => ({ label: t(`developer.logs.levels.${value}`), value })),
);

function formatDuration(startedAt: Temporal.Instant, endedAt?: Temporal.Instant | null): string {
  if (!endedAt) return t("developer.logs.running");
  return fmt.duration(endedAt.since(startedAt), { fractionDigits: 1 });
}

function formatTimestamp(ts: Temporal.Instant): string {
  return fmt.date(ts, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatBootLabel(boot: BootResponse): string {
  const start = fmt.date(boot.first_seen, {
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
  void router.push({
    path: localePath("/developer/logs/spans"),
    query: { ...route.query, span: spanId },
  });
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

const computedSince = computed(() => {
  void refreshTick.value;
  const r = filters.timeRange;
  if (r && timeRangeDurations[r]) {
    return Temporal.Now.instant().subtract(timeRangeDurations[r]).toString();
  }
  return filters.since?.toString();
});

const spanCache = ref<Map<string, LogSpan>>(new Map());
const spanEventsCache = ref<Map<string, LogEvent[]>>(new Map());

async function ensureSpan(id: string): Promise<LogSpan | null> {
  const cached = spanCache.value.get(id);
  if (cached) return cached;
  try {
    const detail = await apertureApi.getSpan(id);
    const { events, ...span } = detail;
    spanCache.value.set(id, span);
    spanEventsCache.value.set(id, events);
    return span;
  } catch (err) {
    console.error("Failed to load span", id, err);
    return null;
  }
}

async function ensureSpanEvents(id: string): Promise<LogEvent[]> {
  const cached = spanEventsCache.value.get(id);
  if (cached) return cached;
  await ensureSpan(id);
  return spanEventsCache.value.get(id) ?? [];
}

const logsContext = {
  filters,
  inlineFields,
  boots,
  targetOptions,
  levelColors: LEVEL_COLORS,
  computedSince,
  formatTimestamp,
  formatDuration,
  focusSpan,
  showAllSpans,
  refresh,
  refreshTick,
  spanCache,
  spanEventsCache,
  ensureSpan,
  ensureSpanEvents,
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
              <div class="max-h-72 overflow-y-auto">
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
                <InfiniteSentinel
                  v-if="bootsHasMore"
                  :key="boots.length"
                  @visible="loadMoreBoots()"
                />
              </div>
            </div>
          </template>
        </UPopover>

        <TimeRangePicker
          :model-value="filters.timeRange"
          :since="filters.since"
          :until="filters.until"
          @update:model-value="(v) => (filters.timeRange = v)"
          @update:since="(v) => (filters.since = v)"
          @update:until="(v) => (filters.until = v)"
        />

        <USelect v-model="filters.level" :items="levelOptions" size="sm" class="w-32" />

        <InfiniteSelectMenu
          v-model="filters.target"
          multiple
          :items="targetItems"
          :loading="targetsLoadingMore"
          :has-more="targetsHasMore"
          searchable
          size="sm"
          class="w-60"
          value-key="value"
          @load-more="loadMoreTargets()"
        >
          <template #default>
            <span v-if="!filters.target.length" class="text-muted-foreground text-xs truncate">
              {{ $t("developer.logs.filters.targetAll") }}
            </span>
            <span v-else class="font-mono text-xs truncate">
              {{ filters.target.join(", ") }}
            </span>
          </template>
          <template #item="{ item }">
            <div class="flex items-center gap-2 w-full">
              <UIcon
                v-if="filters.target.includes(item.value)"
                name="i-lucide-check"
                class="text-primary shrink-0 size-3.5"
              />
              <span v-else class="size-3.5 shrink-0" />
              <span class="font-mono text-xs truncate">{{ item.label }}</span>
            </div>
          </template>
        </InfiniteSelectMenu>

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
            :variant="
              showFieldFilter || Object.keys(filters.fieldFilters).length ? 'soft' : 'outline'
            "
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
              <div v-if="Object.keys(filters.fieldFilters).length" class="flex flex-wrap gap-1">
                <UBadge
                  v-for="(value, key) in filters.fieldFilters"
                  :key="key"
                  variant="subtle"
                  class="gap-1 font-mono"
                >
                  <span>{{ key }}={{ value }}</span>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    variant="link"
                    @click="removeFieldFilter(key)"
                  />
                </UBadge>
              </div>
              <UButton
                v-if="Object.keys(filters.fieldFilters).length"
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
          @click="refresh"
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

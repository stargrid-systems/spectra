<script setup lang="ts">
import type { ListLogsParams, LogEvent, LogSpan } from "~/utils/api/types";
import { useBootId, useLogsFilters } from "~/composables/useLogsFilters";

const { t: _t } = useI18n();

const { filters } = useLogsFilters();

const { data: versionData } = useBootId();
const bootId = computed(() => versionData.value?.boot_id);

const since = ref<string | undefined>(undefined);
const until = ref<string | undefined>(undefined);

const timeRangeMillis: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const computedSince = computed(() => {
  if (since.value) return since.value;
  const range = filters.timeRange;
  if (!range || range === "all") return undefined;
  const ms = timeRangeMillis[range];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
});

const fieldsJson = computed(() => {
  const fields: Record<string, string> = {};
  for (const f of filters.fieldFilters) {
    if (f.key && f.value) fields[f.key] = f.value;
  }
  if (filters.bootOnly && bootId.value) {
    fields.boot_id = bootId.value;
  }
  return Object.keys(fields).length > 0 ? JSON.stringify(fields) : undefined;
});

const logsParams = computed<ListLogsParams | undefined>(() => {
  const p: ListLogsParams = {};
  if (filters.level) p.min_level = filters.level as ListLogsParams["min_level"];
  if (filters.target) p.target = filters.target;
  if (filters.search) p.q = filters.search;
  if (filters.spanId !== undefined) p.span_id = filters.spanId;
  if (computedSince.value) p.since = computedSince.value;
  if (until.value) p.until = until.value;
  if (fieldsJson.value) p.fields = fieldsJson.value;
  return Object.keys(p).length > 0 ? p : undefined;
});

const { data, status, error, refresh } = useLogs(() => logsParams.value);

const { data: spansData, status: spansStatus, error: spansError, refresh: refreshSpans } = useSpans(
  () => {
    const p: NonNullable<Parameters<typeof apertureApi.listSpans>[0]> = {};
    if (filters.level) p.min_level = filters.level as "trace" | "debug" | "info" | "warn" | "error";
    if (filters.target) p.target = filters.target;
    return Object.keys(p).length > 0 ? p : undefined;
  },
);

const { data: targetOptions } = useLogTargets();

const newFieldKey = ref("");
const newFieldValue = ref("");

function addFieldFilter() {
  if (newFieldKey.value && newFieldValue.value) {
    filters.fieldFilters.push({
      key: newFieldKey.value,
      value: newFieldValue.value,
    });
    newFieldKey.value = "";
    newFieldValue.value = "";
  }
}

function removeFieldFilter(idx: number) {
  filters.fieldFilters.splice(idx, 1);
}

function clearFilters() {
  filters.level = "info";
  filters.target = undefined;
  filters.search = undefined;
  filters.timeRange = undefined;
  filters.bootOnly = false;
  filters.fieldFilters = [];
  filters.spanId = undefined;
  since.value = undefined;
  until.value = undefined;
}

const levelColors: Record<string, "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral"> = {
  trace: "neutral",
  debug: "info",
  info: "primary",
  warn: "warning",
  error: "error",
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString();
}

const expandedRows = ref<Set<number>>(new Set());

function toggleRow(id: number) {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id);
  } else {
    expandedRows.value.add(id);
  }
}

const allItems = ref<LogEvent[]>([]);
const nextCursor = ref<string | null | undefined>(undefined);
const isLoadingMore = ref(false);

function resetItems() {
  allItems.value = [];
  nextCursor.value = null;
}

watch(logsParams, () => {
  resetItems();
});

watch(data, (newData) => {
  if (newData) {
    if (allItems.value.length === 0) {
      allItems.value = newData.items;
    } else {
      allItems.value = [...allItems.value, ...newData.items];
    }
    nextCursor.value = newData.next_cursor;
  }
});

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

async function loadMore() {
  if (!nextCursor.value || isLoadingMore.value || status.value === "pending") return;
  isLoadingMore.value = true;
  try {
    const params = { ...logsParams.value, cursor: nextCursor.value };
    const result = await apertureApi.listLogs(params);
    allItems.value = [...allItems.value, ...result.items];
    nextCursor.value = result.next_cursor;
  } finally {
    isLoadingMore.value = false;
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore();
      }
    },
    { rootMargin: "100px" },
  );
  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

const spans = computed<LogSpan[]>(() => spansData.value?.items ?? []);

const expandedSpans = ref<Set<number>>(new Set());

function toggleSpan(id: number) {
  if (expandedSpans.value.has(id)) {
    expandedSpans.value.delete(id);
  } else {
    expandedSpans.value.add(id);
    if (!spanEventsCache.value.has(id)) {
      apertureApi.getSpan(id).then((detail) => {
        spanEventsCache.value.set(id, detail.events ?? []);
      });
    }
  }
}

const spanEventsCache = ref<Map<number, LogEvent[]>>(new Map());

const spanDepth = computed(() => {
  const depths = new Map<number, number>();
  function computeDepth(span: LogSpan, visited: Set<number> = new Set()): number {
    if (depths.has(span.id)) return depths.get(span.id)!;
    if (visited.has(span.id)) return 0;
    visited.add(span.id);
    let depth = 0;
    if (span.parent_id !== null && span.parent_id !== undefined) {
      const parent = spans.value.find((s) => s.id === span.parent_id);
      if (parent) depth = computeDepth(parent, visited) + 1;
    }
    depths.set(span.id, depth);
    return depth;
  }
  for (const s of spans.value) computeDepth(s);
  return depths;
});

function formatDuration(span: LogSpan): string {
  if (!span.ended_at) return "";
  const start = new Date(span.started_at).getTime();
  const end = new Date(span.ended_at).getTime();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function selectSpan(spanId: number) {
  filters.spanId = spanId;
  filters.view = "events";
}

function retry() {
  if (filters.view === "events") {
    resetItems();
    refresh();
  } else {
    refreshSpans();
  }
}
</script>

<template>
  <AppPage :title="$t('developer.logs.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-default">
        <UButtonGroup size="sm">
          <UButton
            :variant="filters.view === 'events' ? 'solid' : 'ghost'"
            color="primary"
            :label="$t('developer.logs.views.events')"
            @click="() => { filters.view = 'events'; }"
          />
          <UButton
            :variant="filters.view === 'spans' ? 'solid' : 'ghost'"
            color="primary"
            :label="$t('developer.logs.views.spans')"
            @click="() => { filters.view = 'spans'; }"
          />
        </UButtonGroup>

        <UFormField :label="$t('developer.logs.filters.level')" size="sm">
          <USelect
            v-model="filters.level"
            :items="[
              { label: $t('developer.logs.levels.trace'), value: 'trace' },
              { label: $t('developer.logs.levels.debug'), value: 'debug' },
              { label: $t('developer.logs.levels.info'), value: 'info' },
              { label: $t('developer.logs.levels.warn'), value: 'warn' },
              { label: $t('developer.logs.levels.error'), value: 'error' },
            ]"
            :placeholder="$t('developer.logs.filters.level')"
            class="w-32"
          />
        </UFormField>

        <UFormField :label="$t('developer.logs.filters.target')" size="sm">
          <USelectMenu
            v-model="filters.target"
            :items="targetOptions ?? []"
            :search-input="{ placeholder: $t('developer.logs.filters.target') }"
            searchable
            class="w-64"
          />
        </UFormField>

        <UFormField v-if="filters.view === 'events'" :label="$t('developer.logs.filters.search')" size="sm">
          <UInput
            v-model="filters.search"
            :placeholder="$t('developer.logs.filters.search')"
            icon="i-lucide-search"
            class="w-48"
          />
        </UFormField>

        <TimeRangePicker
          :model-value="filters.timeRange"
          :since="since"
          :until="until"
          @update:model-value="(v) => (filters.timeRange = v)"
          @update:since="(v) => (since = v)"
          @update:until="(v) => (until = v)"
        />

        <UCheckbox
          :model-value="filters.bootOnly"
          :label="$t('developer.logs.filters.bootOnly')"
          @update:model-value="(v) => { filters.bootOnly = v === true; }"
        />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          size="sm"
          @click="clearFilters"
        >
          {{ $t("developer.logs.filters.clear") }}
        </UButton>
      </div>

      <div v-if="filters.view === 'events'" class="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-default">
        <UFormField :label="$t('developer.logs.filters.fields')" size="sm">
          <div class="flex items-center gap-2">
            <UInput
              v-model="newFieldKey"
              :placeholder="$t('developer.logs.filters.fieldKey')"
              class="w-32"
            />
            <UInput
              v-model="newFieldValue"
              :placeholder="$t('developer.logs.filters.fieldValue')"
              class="w-32"
              @keyup.enter="addFieldFilter"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              variant="soft"
              @click="addFieldFilter"
            />
          </div>
        </UFormField>

        <UBadge
          v-for="(f, idx) in filters.fieldFilters"
          :key="idx"
          variant="subtle"
          class="gap-1"
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
    </template>

    <div class="p-4">
      <!-- Events view -->
      <template v-if="filters.view === 'events'">
        <div v-if="status === 'pending' && allItems.length === 0" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="error" class="text-center py-12 text-error">
          <p>{{ $t("developer.logs.error") }}</p>
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            :label="$t('developer.logs.retry')"
            class="mt-2"
            @click="retry"
          />
        </div>

        <div v-else-if="allItems.length === 0" class="text-center py-12 text-muted-foreground">
          <p>{{ $t("developer.logs.empty") }}</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="event in allItems"
            :key="event.id"
            class="border border-default rounded-lg hover:bg-elevated/50 transition-colors"
          >
            <div
              class="flex items-start gap-3 px-3 py-2 cursor-pointer"
              @click="() => { toggleRow(event.id); }"
            >
              <div class="flex-shrink-0 w-20 text-xs text-muted-foreground font-mono pt-0.5">
                {{ formatTime(event.timestamp) }}
              </div>
              <UBadge
                :color="levelColors[event.level] ?? 'neutral'"
                variant="subtle"
                size="sm"
                class="flex-shrink-0 font-mono"
              >
                {{ event.level }}
              </UBadge>
              <div class="flex-shrink-0 w-48 text-xs text-muted-foreground truncate pt-0.5">
                {{ event.target }}
              </div>
              <div class="flex-1 text-sm pt-0.5">
                {{ event.message }}
              </div>
              <UButton
                v-if="event.span_id"
                size="xs"
                variant="link"
                class="flex-shrink-0 pt-0.5"
                @click.stop="() => { selectSpan(event.span_id!); }"
              >
                {{ $t("developer.logs.spanId") }}: {{ event.span_id }}
              </UButton>
              <UIcon
                v-if="event.fields"
                :name="expandedRows.has(event.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 text-muted-foreground flex-shrink-0 pt-0.5"
              />
            </div>

            <div
              v-if="expandedRows.has(event.id) && event.fields"
              class="px-3 pb-3 pt-1 border-t border-default bg-elevated/25"
            >
              <div class="text-xs font-semibold text-muted-foreground mb-2">
                {{ $t("developer.logs.fields") }}
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <div v-for="(value, key) in event.fields" :key="String(key)" class="flex gap-2">
                  <span class="text-muted-foreground">{{ key }}:</span>
                  <span>{{ value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div ref="sentinel" class="h-4" />
          <div v-if="isLoadingMore" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted-foreground" />
          </div>
          <div v-if="!nextCursor && allItems.length > 0" class="text-center py-4 text-xs text-muted-foreground">
            {{ $t("developer.logs.noMore") }}
          </div>
        </div>
      </template>

      <!-- Spans view -->
      <template v-else>
        <div v-if="spansStatus === 'pending'" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="spansError" class="text-center py-12 text-error">
          <p>{{ $t("developer.logs.error") }}</p>
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            :label="$t('developer.logs.retry')"
            class="mt-2"
            @click="retry"
          />
        </div>

        <div v-else-if="spans.length === 0" class="text-center py-12 text-muted-foreground">
          <p>{{ $t("developer.logs.emptySpans") }}</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="span in spans"
            :key="span.id"
            class="border border-default rounded-lg hover:bg-elevated/50 transition-colors"
          >
            <div
              class="flex items-start gap-3 px-3 py-2 cursor-pointer"
              :style="{ paddingLeft: `${(spanDepth.get(span.id) ?? 0) * 20 + 12}px` }"
              @click="() => { toggleSpan(span.id); }"
            >
              <UIcon
                :name="expandedSpans.has(span.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 text-muted-foreground flex-shrink-0 pt-0.5"
              />
              <UBadge
                :color="levelColors[span.level] ?? 'neutral'"
                variant="subtle"
                size="sm"
                class="flex-shrink-0 font-mono"
              >
                {{ span.level }}
              </UBadge>
              <div class="flex-shrink-0 w-40 text-sm font-mono pt-0.5">
                {{ span.name }}
              </div>
              <div class="flex-shrink-0 w-40 text-xs text-muted-foreground truncate pt-0.5">
                {{ span.target }}
              </div>
              <div class="flex-shrink-0 w-20 text-xs text-muted-foreground font-mono pt-0.5">
                {{ formatTime(span.started_at) }}
              </div>
              <div class="flex-shrink-0 w-16 text-xs text-muted-foreground pt-0.5">
                {{ formatDuration(span) }}
              </div>
            </div>

            <div
              v-if="expandedSpans.has(span.id)"
              class="px-3 pb-3 pt-1 border-t border-default bg-elevated/25"
            >
              <div v-if="span.fields" class="mb-2">
                <div class="text-xs font-semibold text-muted-foreground mb-1">
                  {{ $t("developer.logs.fields") }}
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div v-for="(value, key) in span.fields" :key="String(key)" class="flex gap-2">
                    <span class="text-muted-foreground">{{ key }}:</span>
                    <span>{{ value }}</span>
                  </div>
                </div>
              </div>
              <div v-if="spanEventsCache.has(span.id)">
                <div class="text-xs font-semibold text-muted-foreground mb-1">
                  {{ $t("developer.logs.events") }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="event in spanEventsCache.get(span.id)"
                    :key="event.id"
                    class="flex items-start gap-2 text-xs"
                  >
                    <span class="text-muted-foreground font-mono">{{ formatTime(event.timestamp) }}</span>
                    <UBadge
                      :color="levelColors[event.level] ?? 'neutral'"
                      variant="subtle"
                      size="xs"
                      class="font-mono"
                    >
                      {{ event.level }}
                    </UBadge>
                    <span>{{ event.message }}</span>
                  </div>
                  <div v-if="spanEventsCache.get(span.id)?.length === 0" class="text-xs text-muted-foreground">
                    {{ $t("developer.logs.noEvents") }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppPage>
</template>
<script setup lang="ts">
import type { BootResponse, ListLogsParams, LogEvent, LogSpan } from "~/utils/api/types";
import {
  useLogsFilters,
  logsParamsFromFilters,
  spansParamsFromFilters,
} from "~/composables/useLogsFilters";

const { t } = useI18n();

const { filters } = useLogsFilters();

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

const logsParams = computed<ListLogsParams | undefined>(() => {
  const p = logsParamsFromFilters(filters) ?? ({} as ListLogsParams);
  if (computedSince.value) p.since = computedSince.value;
  if (until.value) p.until = until.value;
  return Object.keys(p).length > 0 ? p : undefined;
});

const { data, status, error, refresh } = useLogs(() => logsParams.value);

const spansParams = computed(() => spansParamsFromFilters(filters));
const {
  data: spansData,
  status: spansStatus,
  error: spansError,
  refresh: refreshSpans,
} = useSpans(() => spansParams.value);

const { data: targetOptions } = useLogTargets();
const { data: bootsData } = useBoots();

const boots = computed<BootResponse[]>(() => bootsData.value ?? []);

const inlineFields = ref(false);
const showFieldFilter = ref(filters.fieldFilters.length > 0);

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
  filters.target = undefined;
  filters.search = undefined;
  filters.timeRange = undefined;
  filters.bootId = undefined;
  filters.fieldFilters = [];
  filters.spanId = undefined;
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

const expandedRows = ref<Set<number>>(new Set());

function toggleRow(event: LogEvent) {
  if (expandedRows.value.has(event.id)) {
    expandedRows.value.delete(event.id);
    return;
  }
  expandedRows.value.add(event.id);
  if (event.fields) {
    pendingEventIds.value.add(event.id);
    void loadEventSpanChain(event);
  }
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString();
}

function asFields(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function formatFieldsInline(fields: unknown): string {
  const f = asFields(fields);
  if (!f) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(f)) {
    if (key === "message" || key === "boot_id") continue;
    parts.push(`${key}=${formatValue(value)}`);
  }
  return parts.join("  ");
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function sortedFields(fields: unknown): { key: string; value: unknown }[] {
  const f = asFields(fields);
  if (!f) return [];
  return Object.entries(f)
    .filter(([key]) => key !== "boot_id" && key !== "message")
    .map(([key, value]) => ({ key, value }));
}

// Events: infinite scroll accumulation.

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
  if (!newData) return;
  if (allItems.value.length === 0) {
    allItems.value = newData.items;
  } else {
    allItems.value = [...allItems.value, ...newData.items];
  }
  nextCursor.value = newData.next_cursor;
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
        void loadMore();
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

// Span chain (event -> span -> ancestors) loaded on expand, cached by event id and
// span id.

const spanCache = ref<Map<number, LogSpan>>(new Map());
const eventChainCache = ref<Map<number, LogSpan[]>>(new Map());
const pendingEventIds = ref<Set<number>>(new Set());

async function loadSpanIntoCache(id: number): Promise<LogSpan | null> {
  const cached = spanCache.value.get(id);
  if (cached) return cached;
  try {
    const detail = await apertureApi.getSpan(id);
    const { events: _events, ...span } = detail;
    void _events;
    spanCache.value.set(id, span);
    return span;
  } catch {
    return null;
  }
}

async function loadEventSpanChain(event: LogEvent) {
  if (!event.span_id) {
    pendingEventIds.value.delete(event.id);
    return;
  }
  const chain: LogSpan[] = [];
  let currentId: number | undefined = event.span_id;
  const visited = new Set<number>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const span = await loadSpanIntoCache(currentId);
    if (!span) break;
    chain.unshift(span);
    currentId = span.parent_id ?? undefined;
  }
  eventChainCache.value.set(event.id, chain);
  pendingEventIds.value.delete(event.id);
}

function focusSpan(spanId: number) {
  filters.spanId = spanId;
  filters.view = "spans";
}

// Spans view.

const spans = computed<LogSpan[]>(() => spansData.value?.items ?? []);

const focusedSpanDetail = computed<LogSpan | undefined>(() =>
  filters.spanId ? spanCache.value.get(filters.spanId) : undefined,
);

watch(
  () => filters.spanId,
  async (id) => {
    if (!id) return;
    if (!spanCache.value.has(id)) {
      await loadSpanIntoCache(id);
    }
  },
  { immediate: true },
);

const expandedSpans = ref<Set<number>>(new Set());

function toggleSpan(span: LogSpan) {
  if (expandedSpans.value.has(span.id)) {
    expandedSpans.value.delete(span.id);
    return;
  }
  expandedSpans.value.add(span.id);
  if (!spanEventsCache.value.has(span.id)) {
    apertureApi.getSpan(span.id).then((detail) => {
      spanEventsCache.value.set(span.id, detail.events ?? []);
    });
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
    return depths.get(span.id)!;
  }
  for (const s of spans.value) computeDepth(s, new Set());
  return depths;
});

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

function retry() {
  if (filters.view === "events") {
    resetItems();
    void refresh();
  } else {
    void refreshSpans();
  }
}

function showAllSpans() {
  filters.spanId = undefined;
}
</script>

<template>
  <AppPage :title="$t('developer.logs.title')">
    <template #toolbar>
      <div class="flex items-center justify-between gap-3 px-4 py-2 border-b border-default">
        <UTabs
          v-model="filters.view"
          :items="[
            { label: $t('developer.logs.views.events'), value: 'events' },
            { label: $t('developer.logs.views.spans'), value: 'spans' },
          ]"
          size="sm"
          :content="false"
        />
        <UCheckbox v-model="inlineFields" :label="$t('developer.logs.inlineFields')" size="sm" />
      </div>

      <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-default">
        <UInput
          v-model="filters.search"
          :placeholder="$t('developer.logs.filters.search')"
          icon="i-lucide-search"
          size="sm"
          class="w-56"
        />

        <TimeRangePicker
          :model-value="filters.timeRange"
          :since="since"
          :until="until"
          @update:model-value="(v) => (filters.timeRange = v)"
          @update:since="(v) => (since = v)"
          @update:until="(v) => (until = v)"
        />

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

        <USelect v-model="filters.level" :items="levelOptions" size="sm" class="w-32" />

        <USelectMenu
          v-model="filters.target"
          :items="(targetOptions ?? []).map((target) => ({ label: target, value: target }))"
          :placeholder="$t('developer.logs.filters.targetAll')"
          searchable
          size="sm"
          class="w-60"
          value-key="value"
        >
          <template #item="{ item }">
            <span class="font-mono text-xs">{{ (item as { label: string }).label }}</span>
          </template>
        </USelectMenu>

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

    <div class="p-4">
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
              @click="() => toggleRow(event)"
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
              <div class="flex-1 min-w-0 text-sm pt-0.5">
                <span>{{ event.message }}</span>
                <span
                  v-if="inlineFields && event.fields"
                  class="text-muted-foreground font-mono text-xs ms-2"
                >
                  {{ formatFieldsInline(event.fields) }}
                </span>
              </div>
              <UIcon
                v-if="event.fields"
                :name="
                  expandedRows.has(event.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
                "
                class="size-4 text-muted-foreground flex-shrink-0 pt-0.5"
              />
            </div>

            <div
              v-if="expandedRows.has(event.id)"
              class="px-3 pb-3 pt-1 border-t border-default bg-elevated/25 space-y-3"
            >
              <div>
                <div class="text-xs font-semibold text-muted-foreground mb-1">
                  {{ $t("developer.logs.fields") }}
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div
                    v-for="entry in sortedFields(event.fields ?? {})"
                    :key="entry.key"
                    class="flex gap-2"
                  >
                    <span class="text-muted-foreground">{{ entry.key }}:</span>
                    <span>{{ formatValue(entry.value) }}</span>
                  </div>
                  <div
                    v-if="sortedFields(event.fields ?? {}).length === 0"
                    class="text-muted-foreground col-span-2"
                  >
                    {{ $t("developer.logs.noFields") }}
                  </div>
                </div>
              </div>

              <div>
                <div class="text-xs font-semibold text-muted-foreground mb-1">
                  {{ $t("developer.logs.spanChain") }}
                </div>
                <div
                  v-if="event.span_id === null || event.span_id === undefined"
                  class="text-xs text-muted-foreground"
                >
                  {{ $t("developer.logs.noSpan") }}
                </div>
                <div
                  v-else-if="pendingEventIds.has(event.id)"
                  class="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
                  <span>{{ $t("developer.logs.loadingSpan") }}</span>
                </div>
                <div
                  v-else-if="
                    eventChainCache.get(event.id) && eventChainCache.get(event.id)!.length > 0
                  "
                  class="flex flex-wrap items-center gap-1 text-xs"
                >
                  <template
                    v-for="(span, idx) in eventChainCache.get(event.id) ?? []"
                    :key="span.id"
                  >
                    <UButton
                      size="xs"
                      variant="link"
                      color="primary"
                      class="font-mono px-1"
                      @click.stop="focusSpan(span.id)"
                    >
                      {{ span.name }}
                    </UButton>
                    <UIcon
                      v-if="idx < (eventChainCache.get(event.id)?.length ?? 0) - 1"
                      name="i-lucide-chevron-right"
                      class="size-3 text-muted-foreground"
                    />
                  </template>
                </div>
                <div v-else class="text-xs text-muted-foreground">
                  {{ $t("developer.logs.noSpan") }}
                </div>
              </div>
            </div>
          </div>

          <div ref="sentinel" class="h-4" />
          <div v-if="isLoadingMore" class="flex justify-center py-4">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-muted-foreground"
            />
          </div>
          <div
            v-if="!nextCursor && allItems.length > 0"
            class="text-center py-4 text-xs text-muted-foreground"
          >
            {{ $t("developer.logs.noMore") }}
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="filters.spanId" class="mb-3 flex items-center gap-2">
          <UBadge color="primary" variant="subtle" size="sm">
            {{ $t("developer.logs.spanFocus") }}
          </UBadge>
          <span class="text-sm font-mono">{{ focusedSpanDetail?.name ?? "..." }}</span>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            :label="$t('developer.logs.showAllSpans')"
            @click="showAllSpans"
          />
        </div>

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
        <div
          v-else-if="spans.length === 0 && !filters.spanId"
          class="text-center py-12 text-muted-foreground"
        >
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
              @click="() => toggleSpan(span)"
            >
              <UIcon
                :name="
                  expandedSpans.has(span.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
                "
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
                {{ formatDuration(span.started_at, span.ended_at) }}
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
                    <span class="text-muted-foreground font-mono">{{
                      formatTime(event.timestamp)
                    }}</span>
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
                  <div
                    v-if="spanEventsCache.get(span.id)?.length === 0"
                    class="text-xs text-muted-foreground"
                  >
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

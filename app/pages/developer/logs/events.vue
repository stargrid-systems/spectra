<script setup lang="ts">
import type { ListLogsParams, LogEvent, LogSpan } from "~/utils/api/types";
import { useInfiniteScroll } from "@vueuse/core";
import { useLogsContext } from "~/composables/useLogsContext";
import { logsParamsFromFilters } from "~/composables/useLogsFilters";

const ctx = useLogsContext();
const { filters, inlineFields, since, until, levelColors, focusSpan } = ctx;

const computedSince = computed(() => {
  const range = filters.timeRange;
  if (since.value) return since.value;
  if (!range || range === "all") return undefined;
  const ms = timeRangeMillis[range];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
});

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

const logsParams = computed<ListLogsParams | undefined>(() => {
  const p = logsParamsFromFilters(filters) ?? ({} as ListLogsParams);
  if (computedSince.value) p.since = computedSince.value;
  if (until.value) p.until = until.value;
  return Object.keys(p).length > 0 ? p : undefined;
});

const { data, status, error, refresh } = useLogs(() => logsParams.value);

const expandedRows = computed(() => new Set(filters.expandEvent));

function toggleRow(event: LogEvent) {
  const arr = filters.expandEvent;
  const idx = arr.indexOf(event.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  arr.push(event.id);
  if (event.fields) {
    pendingEventIds.value.add(event.id);
    void loadEventSpanChain(event);
  }
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

const scrollArea = useTemplateRef("scrollArea");

watch(
  () => scrollArea.value?.$el,
  (el) => {
    if (!el) return;
    useInfiniteScroll(el, () => loadMore(), {
      distance: 200,
      canLoadMore: () =>
        nextCursor.value !== null &&
        nextCursor.value !== undefined &&
        status.value !== "pending" &&
        !isLoadingMore.value,
    });
  },
  { immediate: true },
);

function retry() {
  resetItems();
  void refresh();
}

watch(ctx.refreshTrigger, () => {
  resetItems();
  void refresh();
});

// Span chain (event -> span -> ancestors) loaded on expand, cached by event id and
// span id.

const spanCache = ref<Map<string, LogSpan>>(new Map());
const eventChainCache = ref<Map<string, LogSpan[]>>(new Map());
const pendingEventIds = ref<Set<string>>(new Set());

async function loadSpanIntoCache(id: string): Promise<LogSpan | null> {
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
  let currentId: string | undefined = event.span_id;
  const visited = new Set<string>();
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
</script>

<template>
  <UScrollArea ref="scrollArea" class="h-full" :ui="{ viewport: 'gap-1 p-4' }">
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
    <template v-else>
      <div
        class="flex items-center gap-3 px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-default sticky top-0 bg-default z-10"
      >
        <div class="w-32 flex-shrink-0">{{ $t("developer.logs.columns.timestamp") }}</div>
        <div class="w-16 flex-shrink-0">{{ $t("developer.logs.columns.level") }}</div>
        <div class="w-44 flex-shrink-0">{{ $t("developer.logs.columns.target") }}</div>
        <div class="flex-1 min-w-0">{{ $t("developer.logs.columns.message") }}</div>
        <div class="w-4 flex-shrink-0"></div>
      </div>
      <div
        v-for="event in allItems"
        :key="event.id"
        class="border border-default rounded-lg hover:bg-elevated/50 transition-colors"
      >
        <div
          class="flex items-start gap-3 px-3 py-2 cursor-pointer"
          @click="() => toggleRow(event)"
        >
          <div
            class="flex-shrink-0 w-32 text-xs text-muted-foreground font-mono pt-0.5 whitespace-nowrap"
          >
            {{ formatTimestamp(event.timestamp) }}
          </div>
          <div class="flex-shrink-0 w-16">
            <UBadge
              :color="levelColors[event.level] ?? 'neutral'"
              variant="subtle"
              size="sm"
              class="font-mono"
            >
              {{ event.level }}
            </UBadge>
          </div>
          <div
            class="flex-shrink-0 w-44 text-xs text-muted-foreground truncate pt-0.5"
            :title="event.target"
          >
            {{ event.target }}
          </div>
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
            :name="expandedRows.has(event.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
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
              v-else-if="eventChainCache.get(event.id) && eventChainCache.get(event.id)!.length > 0"
              class="flex flex-wrap items-center gap-1 text-xs"
            >
              <template v-for="(span, idx) in eventChainCache.get(event.id) ?? []" :key="span.id">
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
    </template>

    <div v-if="isLoadingMore" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted-foreground" />
    </div>
    <div
      v-if="!nextCursor && allItems.length > 0"
      class="text-center py-4 text-xs text-muted-foreground"
    >
      {{ $t("developer.logs.noMore") }}
    </div>
  </UScrollArea>
</template>

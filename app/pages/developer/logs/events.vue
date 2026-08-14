<script setup lang="ts">
import type { ListLogsParams, LogEvent, LogSpan } from "~~/modules/aperture/runtime/types";
import { useInfiniteScroll } from "@vueuse/core";
import { useLogsContext } from "~/composables/useLogsContext";
import { logsParamsFromFilters } from "~/composables/useLogsFilters";

const ctx = useLogsContext();
const { filters, inlineFields, focusSpan, formatTimestamp, ensureSpan } = ctx;

const logsParams = computed<ListLogsParams | undefined>(() => {
  void ctx.refreshTick.value;
  const p = logsParamsFromFilters(filters) ?? {};
  if (ctx.computedSince.value) p.since = ctx.computedSince.value;
  if (filters.until) p.until = filters.until.toString();
  return Object.keys(p).length > 0 ? p : undefined;
});

const {
  items: allItems,
  pending,
  loadingMore,
  error,
  hasMore,
  loadMore,
  reload,
} = useInfiniteList<LogEvent, ListLogsParams>(
  (query) => apertureApi.listLogs(query),
  () => logsParams.value,
);

const expandedRows = computed(() => new Set(filters.expand.events));

function toggleRow(event: LogEvent) {
  const arr = filters.expand.events;
  const idx = arr.indexOf(event.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  arr.push(event.id);
  if (event.span_id) {
    pendingEventIds.value.add(event.id);
    void loadEventSpanChain(event);
  }
}

watch(allItems, (items) => {
  for (const event of items) {
    if (
      expandedRows.value.has(event.id) &&
      event.span_id &&
      !eventChainCache.value.has(event.id) &&
      !pendingEventIds.value.has(event.id)
    ) {
      pendingEventIds.value.add(event.id);
      void loadEventSpanChain(event);
    }
  }
});

const scrollArea = useTemplateRef("scrollArea");

useInfiniteScroll(
  () => scrollArea.value?.$el,
  () => loadMore(),
  {
    distance: 200,
    canLoadMore: () => hasMore.value && !pending.value && !loadingMore.value,
  },
);

function retry() {
  void reload();
}

// Span chain (event -> span -> ancestors) loaded on expand, cached by event id.

const eventChainCache = ref<Map<string, LogSpan[]>>(new Map());
const pendingEventIds = ref<Set<string>>(new Set());

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
    const span = await ensureSpan(currentId);
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
    <DataState
      :pending="pending && allItems.length === 0"
      :error="error"
      :empty="allItems.length === 0"
      :error-text="$t('developer.logs.error')"
      :empty-text="$t('developer.logs.empty')"
      :retry-text="$t('developer.logs.retry')"
      @retry="retry"
    >
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
            <LevelBadge :level="event.level" />
          </div>
          <div
            class="flex-shrink-0 w-44 text-xs text-muted-foreground truncate pt-0.5"
            :title="event.target"
          >
            {{ event.target }}
          </div>
          <div class="flex-1 min-w-0 text-sm pt-0.5">
            <span>{{ event.message }}</span>
            <FieldsDisplay v-if="inlineFields && event.fields" :fields="event.fields" inline />
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
          <FieldsDisplay :fields="event.fields" />

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
              <LoadingSpinner class="size-3.5" />
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
    </DataState>

    <div v-if="loadingMore" class="flex justify-center py-4">
      <LoadingSpinner class="size-5 text-muted-foreground" />
    </div>
    <div
      v-if="!hasMore && allItems.length > 0"
      class="text-center py-4 text-xs text-muted-foreground"
    >
      {{ $t("developer.logs.noMore") }}
    </div>
  </UScrollArea>
</template>

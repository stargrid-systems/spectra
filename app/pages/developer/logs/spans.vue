<script setup lang="ts">
import type { ListLogSpansParams, LogSpan } from "~~/modules/aperture/runtime/types";
import { useInfiniteScroll } from "@vueuse/core";
import { useLogsContext } from "~/composables/useLogsContext";
import { spansParamsFromFilters } from "~/composables/useLogsFilters";

const ctx = useLogsContext();
const {
  filters,
  inlineFields,
  focusSpan,
  showAllSpans,
  formatTimestamp,
  spanCache,
  spanEventsCache,
  ensureSpan,
  ensureSpanEvents,
} = ctx;

const spansParams = computed<ListLogSpansParams | undefined>(() => {
  void ctx.refreshTick.value;
  const base = spansParamsFromFilters(filters);
  if (!ctx.computedSince.value && !filters.until) return base;
  const p: ListLogSpansParams = { ...base };
  if (ctx.computedSince.value) p.since = ctx.computedSince.value;
  if (filters.until) p.until = filters.until.toString();
  return p;
});

const {
  items: rootSpans,
  pending: spansPending,
  loadingMore: spansLoadingMore,
  error: spansError,
  hasMore: spansHasMore,
  loadMore: loadMoreSpans,
  reload: reloadSpans,
} = useInfiniteList<LogSpan, ListLogSpansParams>(
  (query) => apertureApi.listSpans(query),
  () => spansParams.value,
);

const scrollArea = useTemplateRef("scrollArea");

useInfiniteScroll(
  () => scrollArea.value?.$el,
  () => loadMoreSpans(),
  {
    distance: 200,
    canLoadMore: () => spansHasMore.value && !spansPending.value && !spansLoadingMore.value,
  },
);

watch(rootSpans, (rows) => {
  for (const s of rows) {
    spanCache.value.set(s.id, s);
    if (expandedSpans.value.has(s.id)) {
      void loadChildren(s.id);
      void loadEvents(s.id);
    }
  }
});

const childrenCache = ref<Map<string, LogSpan[]>>(new Map());
const loadingChildren = ref<Set<string>>(new Set());
let childrenGen = 0;

async function loadChildren(parentId: string) {
  if (childrenCache.value.has(parentId) || loadingChildren.value.has(parentId)) return;
  loadingChildren.value.add(parentId);
  const myGen = childrenGen;
  try {
    const { parent_null: _, ...rest } = { ...spansParams.value, parent_id: parentId };
    const result = await apertureApi.listSpans(rest);
    if (myGen !== childrenGen) return;
    const children = result.items ?? [];
    for (const c of children) spanCache.value.set(c.id, c);
    childrenCache.value.set(parentId, children);
  } catch (err) {
    console.error("Failed to load child spans", parentId, err);
  } finally {
    loadingChildren.value.delete(parentId);
  }
}

const loadingEvents = ref<Set<string>>(new Set());

async function loadEvents(spanId: string) {
  if (spanEventsCache.value.has(spanId) || loadingEvents.value.has(spanId)) return;
  loadingEvents.value.add(spanId);
  await ensureSpanEvents(spanId);
  loadingEvents.value.delete(spanId);
}

const expandedSpans = computed(() => new Set(filters.expand.spans));

function spanExpandable(span: LogSpan): boolean {
  const children = childrenCache.value.get(span.id);
  return children === undefined || children.length > 0;
}

async function toggleSpan(span: LogSpan) {
  const arr = filters.expand.spans;
  const idx = arr.indexOf(span.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  arr.push(span.id);
  await loadChildren(span.id);
  void loadEvents(span.id);
}

watch(
  () => filters.spanId,
  async (id) => {
    if (id) await ensureSpan(id);
  },
  { immediate: true },
);

const focusedSpanDetail = computed<LogSpan | undefined>(() =>
  filters.spanId ? spanCache.value.get(filters.spanId) : undefined,
);

function retry() {
  childrenGen++;
  childrenCache.value.clear();
  spanEventsCache.value.clear();
  void reloadSpans();
}

watch(
  () => ctx.refreshTick.value,
  () => {
    childrenGen++;
    childrenCache.value.clear();
    spanEventsCache.value.clear();
  },
);
</script>

<template>
  <UScrollArea ref="scrollArea" class="h-full" :ui="{ viewport: 'gap-1 p-4' }">
    <div v-if="filters.spanId" class="mb-3 flex items-center gap-2 px-4">
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

    <DataState
      :pending="spansPending && rootSpans.length === 0"
      :error="spansError"
      :empty="rootSpans.length === 0 && !filters.spanId"
      :error-text="$t('developer.logs.error')"
      :empty-text="$t('developer.logs.emptySpans')"
      :retry-text="$t('developer.logs.retry')"
      @retry="retry"
    >
      <div
        class="flex items-center gap-3 px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-default sticky top-0 bg-default z-10"
      >
        <div class="w-4 flex-shrink-0"></div>
        <div class="w-32 flex-shrink-0">{{ $t("developer.logs.columns.timestamp") }}</div>
        <div class="w-16 flex-shrink-0">{{ $t("developer.logs.columns.level") }}</div>
        <div class="w-44 flex-shrink-0">{{ $t("developer.logs.columns.target") }}</div>
        <div class="w-20 flex-shrink-0 text-right">
          {{ $t("developer.logs.columns.duration") }}
        </div>
        <div class="flex-1 min-w-0">{{ $t("developer.logs.columns.name") }}</div>
      </div>
      <div
        v-for="span in rootSpans"
        :key="span.id"
        class="border border-default rounded-lg hover:bg-elevated/50 transition-colors"
      >
        <div
          class="flex items-start gap-3 px-3 py-2 cursor-pointer"
          @click="() => toggleSpan(span)"
        >
          <UIcon
            :name="
              expandedSpans.has(span.id)
                ? 'i-lucide-chevron-down'
                : spanExpandable(span)
                  ? 'i-lucide-chevron-right'
                  : 'i-lucide-dot'
            "
            class="size-4 text-muted-foreground flex-shrink-0 pt-0.5"
          />
          <div
            class="flex-shrink-0 w-32 text-xs text-muted-foreground font-mono pt-0.5 whitespace-nowrap"
          >
            {{ formatTimestamp(span.started_at) }}
          </div>
          <div class="flex-shrink-0 w-16">
            <LevelBadge :level="span.level" />
          </div>
          <div
            class="flex-shrink-0 w-44 text-xs text-muted-foreground truncate pt-0.5"
            :title="span.target"
          >
            {{ span.target }}
          </div>
          <div
            class="flex-shrink-0 w-20 text-xs text-muted-foreground pt-0.5 text-right tabular-nums"
          >
            {{ ctx.formatDuration(span.started_at, span.ended_at) }}
          </div>
          <div class="flex-1 min-w-0 text-sm font-mono pt-0.5">
            <span>{{ span.name }}</span>
            <FieldsDisplay v-if="inlineFields && span.fields" :fields="span.fields" inline />
          </div>
        </div>

        <div
          v-if="expandedSpans.has(span.id)"
          class="px-3 pb-3 pt-1 border-t border-default bg-elevated/25 space-y-3"
        >
          <FieldsDisplay v-if="span.fields" :fields="span.fields" />

          <div>
            <div class="text-xs font-semibold text-muted-foreground mb-1">
              {{ $t("developer.logs.childSpans") }}
            </div>
            <div v-if="loadingChildren.has(span.id)" class="text-xs text-muted-foreground">
              {{ $t("developer.logs.loadingMore") }}
            </div>
            <div
              v-else-if="(childrenCache.get(span.id) ?? []).length === 0"
              class="text-xs text-muted-foreground"
            >
              {{ $t("developer.logs.noChildSpans") }}
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="child in childrenCache.get(span.id) ?? []"
                :key="child.id"
                class="flex items-start gap-2 text-xs font-mono cursor-pointer hover:text-primary"
                @click.stop="focusSpan(child.id)"
              >
                <span class="text-muted-foreground">{{ formatTimestamp(child.started_at) }}</span>
                <LevelBadge :level="child.level" size="xs" />
                <span>{{ child.name }}</span>
              </div>
            </div>
          </div>

          <div>
            <div class="text-xs font-semibold text-muted-foreground mb-1">
              {{ $t("developer.logs.events") }}
            </div>
            <div v-if="loadingEvents.has(span.id)" class="text-xs text-muted-foreground">
              {{ $t("developer.logs.loadingMore") }}
            </div>
            <div v-else-if="spanEventsCache.has(span.id)" class="space-y-1">
              <div
                v-for="event in spanEventsCache.get(span.id) ?? []"
                :key="event.id"
                class="flex items-start gap-2 text-xs"
              >
                <span class="text-muted-foreground font-mono">{{
                  formatTimestamp(event.timestamp)
                }}</span>
                <LevelBadge :level="event.level" size="xs" />
                <span>{{ event.message }}</span>
              </div>
              <div
                v-if="(spanEventsCache.get(span.id) ?? []).length === 0"
                class="text-xs text-muted-foreground"
              >
                {{ $t("developer.logs.noEvents") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DataState>

    <div v-if="spansLoadingMore" class="flex justify-center py-4">
      <LoadingSpinner class="size-5 text-muted-foreground" />
    </div>
    <div
      v-if="!spansHasMore && rootSpans.length > 0"
      class="text-center py-4 text-xs text-muted-foreground"
    >
      {{ $t("developer.logs.noMore") }}
    </div>
  </UScrollArea>
</template>

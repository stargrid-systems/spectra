<script setup lang="ts">
import type { ListLogSpansParams, LogEvent, LogSpan } from "~/utils/api/types";
import { useLogsContext } from "~/composables/useLogsContext";
import { fieldFiltersJson } from "~/composables/useLogsFilters";

const ctx = useLogsContext();
const { filters, inlineFields, since, until, levelColors, focusSpan, showAllSpans } = ctx;

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

const spansParams = computed<ListLogSpansParams | undefined>(() => {
  const base = {} as ListLogSpansParams;
  if (filters.level) base.min_level = filters.level as ListLogSpansParams["min_level"];
  if (filters.target.length)
    base.target = filters.target.join(",") as unknown as ListLogSpansParams["target"];
  if (filters.spanId !== undefined) {
    base.parent_id = filters.spanId;
  } else {
    base.parent_null = true;
  }
  if (computedSince.value) base.since = computedSince.value;
  if (until.value) base.until = until.value;
  const fieldsJson = fieldFiltersJson(filters);
  if (fieldsJson) base.fields = fieldsJson;
  return Object.keys(base).length > 0 ? base : undefined;
});

const {
  data: spansData,
  status: spansStatus,
  error: spansError,
  refresh: refreshSpans,
} = useSpans(() => spansParams.value);

const rootSpans = computed<LogSpan[]>(() => spansData.value?.items ?? []);

// Shared span detail cache (span id -> bare span info without events).
const spanCache = ref<Map<number, LogSpan>>(new Map());
watch(rootSpans, (rows) => {
  for (const s of rows) spanCache.value.set(s.id, s);
});

// Children cache: span id -> child spans.
const childrenCache = ref<Map<number, LogSpan[]>>(new Map());
const loadingChildren = ref<Set<number>>(new Set());

async function loadChildren(parentId: number) {
  if (childrenCache.value.has(parentId) || loadingChildren.value.has(parentId)) return;
  loadingChildren.value.add(parentId);
  try {
    const result = await apertureApi.listSpans({ parent_id: parentId });
    const children = result.items ?? [];
    for (const c of children) spanCache.value.set(c.id, c);
    childrenCache.value.set(parentId, children);
  } finally {
    loadingChildren.value.delete(parentId);
  }
}

// Event cache for the expanded body section.
const spanEventsCache = ref<Map<number, LogEvent[]>>(new Map());
const loadingEvents = ref<Set<number>>(new Set());

async function loadEvents(spanId: number) {
  if (spanEventsCache.value.has(spanId) || loadingEvents.value.has(spanId)) return;
  loadingEvents.value.add(spanId);
  try {
    const detail = await apertureApi.getSpan(spanId);
    spanEventsCache.value.set(spanId, detail.events ?? []);
  } finally {
    loadingEvents.value.delete(spanId);
  }
}

const expandedSpans = computed(() => new Set(filters.expandSpan));

function spanHasChildren(span: LogSpan): boolean {
  return childrenCache.value.get(span.id)?.length !== 0;
}

async function toggleSpan(span: LogSpan) {
  const arr = filters.expandSpan;
  const idx = arr.indexOf(span.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  arr.push(span.id);
  await loadChildren(span.id);
  void loadEvents(span.id);
}

// Focus support: jump to a specific span via filters.spanId, show its subtree.
watch(
  () => filters.spanId,
  async (id) => {
    if (!id) return;
    const cached = spanCache.value.get(id);
    if (!cached) {
      try {
        const detail = await apertureApi.getSpan(id);
        const { events, ...rest } = detail;
        void events;
        spanCache.value.set(id, rest as LogSpan);
      } catch {
        return;
      }
    }
  },
  { immediate: true },
);

const focusedSpanDetail = computed<LogSpan | undefined>(() =>
  filters.spanId ? (spanCache.value.get(filters.spanId) as LogSpan | undefined) : undefined,
);

function retry() {
  void refreshSpans();
}

watch(ctx.refreshTrigger, () => {
  void refreshSpans();
});
</script>

<template>
  <UScrollArea class="h-full" :ui="{ viewport: 'gap-1 p-4' }">
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
      v-else-if="rootSpans.length === 0 && !filters.spanId"
      class="text-center py-12 text-muted-foreground"
    >
      <p>{{ $t("developer.logs.emptySpans") }}</p>
    </div>
    <template v-else>
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
                : spanHasChildren(span)
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
            <UBadge
              :color="levelColors[span.level] ?? 'neutral'"
              variant="subtle"
              size="sm"
              class="font-mono"
            >
              {{ span.level }}
            </UBadge>
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
            <span v-if="inlineFields && span.fields" class="text-muted-foreground text-xs ms-1">
              {{ formatFieldsInline(span.fields) }}
            </span>
          </div>
        </div>

        <div
          v-if="expandedSpans.has(span.id)"
          class="px-3 pb-3 pt-1 border-t border-default bg-elevated/25 space-y-3"
        >
          <div v-if="span.fields">
            <div class="text-xs font-semibold text-muted-foreground mb-1">
              {{ $t("developer.logs.fields") }}
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div v-for="entry in sortedFields(span.fields)" :key="entry.key" class="flex gap-2">
                <span class="text-muted-foreground">{{ entry.key }}:</span>
                <span>{{ formatValue(entry.value) }}</span>
              </div>
            </div>
          </div>

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
                <UBadge :color="levelColors[child.level] ?? 'neutral'" variant="subtle" size="xs">
                  {{ child.level }}
                </UBadge>
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
                v-if="(spanEventsCache.get(span.id) ?? []).length === 0"
                class="text-xs text-muted-foreground"
              >
                {{ $t("developer.logs.noEvents") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UScrollArea>
</template>

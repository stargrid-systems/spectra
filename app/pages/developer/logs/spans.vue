<script setup lang="ts">
import type { ListLogSpansParams, LogEvent, LogSpan } from "~/utils/api/types";
import { useLogsContext } from "~/composables/useLogsContext";
import { spansParamsFromFilters } from "~/composables/useLogsFilters";

const { t } = useI18n();
const ctx = useLogsContext();
const { filters, inlineFields, since, until, boots, targetOptions, levelColors, focusSpan, showAllSpans } =
  ctx;

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
  const p = spansParamsFromFilters(filters) ?? ({} as ListLogSpansParams);
  if (computedSince.value) p.since = computedSince.value;
  if (until.value) p.until = until.value;
  return Object.keys(p).length > 0 ? p : undefined;
});

const {
  data: spansData,
  status: spansStatus,
  error: spansError,
  refresh: refreshSpans,
} = useSpans(() => spansParams.value);

const spans = computed<LogSpan[]>(() => spansData.value?.items ?? []);

// Shared span cache (also populated by the events tab when expanding). Loaded
// on demand by span id so we can fetch the focus span's full detail.
const spanCache = ref<Map<number, LogSpan>>(new Map());
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

const focusedSpanDetail = computed<LogSpan | undefined>(() =>
  filters.spanId ? spanCache.value.get(filters.spanId) : undefined,
);

const expandedSpans = computed(() => new Set(filters.expandSpan));

const spanEventsCache = ref<Map<number, LogEvent[]>>(new Map());

function toggleSpan(span: LogSpan) {
  const arr = filters.expandSpan;
  const idx = arr.indexOf(span.id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  arr.push(span.id);
  if (!spanEventsCache.value.has(span.id)) {
    apertureApi.getSpan(span.id).then((detail) => {
      spanEventsCache.value.set(span.id, detail.events ?? []);
    });
  }
}

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

function retry() {
  void refreshSpans();
}
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
      v-else-if="spans.length === 0 && !filters.spanId"
      class="text-center py-12 text-muted-foreground"
    >
      <p>{{ $t("developer.logs.emptySpans") }}</p>
    </div>
    <template v-else>
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
            <span
              v-if="inlineFields && span.fields"
              class="text-muted-foreground text-xs ms-1"
            >
              {{ formatFieldsInline(span.fields) }}
            </span>
          </div>
          <div class="flex-shrink-0 w-40 text-xs text-muted-foreground truncate pt-0.5">
            {{ span.target }}
          </div>
          <div class="flex-shrink-0 w-28 text-xs text-muted-foreground font-mono pt-0.5">
            {{ formatTimestamp(span.started_at) }}
          </div>
          <div class="flex-shrink-0 w-16 text-xs text-muted-foreground pt-0.5">
            {{ ctx.formatDuration(span.started_at, span.ended_at) }}
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
              <div v-if="spanEventsCache.get(span.id)?.length === 0" class="text-xs text-muted-foreground">
                {{ $t("developer.logs.noEvents") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UScrollArea>
</template>
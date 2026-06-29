<script setup lang="ts">
import type { ListLogsParams } from "~/utils/api/types";

const level = ref<string>();
const target = ref<string>();
const search = ref<string>();
const timeRange = ref<string>();
const fieldFilters = ref<{ key: string; value: string }[]>([]);
const newFieldKey = ref("");
const newFieldValue = ref("");

const timeRangeMillis: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const since = computed(() => {
  const range = timeRange.value;
  if (!range || range === "all") return undefined;
  const ms = timeRangeMillis[range];
  if (!ms) return undefined;
  return new Date(Date.now() - ms).toISOString();
});

const fieldsJson = computed(() => {
  if (fieldFilters.value.length === 0) return undefined;
  const obj: Record<string, string> = {};
  for (const f of fieldFilters.value) {
    if (f.key && f.value) obj[f.key] = f.value;
  }
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
});

const params = computed<ListLogsParams | undefined>(() => {
  const p: ListLogsParams = {};
  if (level.value) p.min_level = level.value as ListLogsParams["min_level"];
  if (target.value) p.target = target.value;
  if (search.value) p.q = search.value;
  if (since.value) p.since = since.value;
  if (fieldsJson.value) p.fields = fieldsJson.value;
  return Object.keys(p).length > 0 ? p : undefined;
});

const { data, status, error, refresh } = useLogs(() => params.value);

const targetParams = computed(() =>
  target.value ? { q: target.value } : undefined,
);
const { data: targetOptions } = useLogTargets(() => targetParams.value);

function addFieldFilter() {
  if (newFieldKey.value && newFieldValue.value) {
    fieldFilters.value.push({
      key: newFieldKey.value,
      value: newFieldValue.value,
    });
    newFieldKey.value = "";
    newFieldValue.value = "";
  }
}

function removeFieldFilter(idx: number) {
  fieldFilters.value.splice(idx, 1);
}

function clearFilters() {
  level.value = undefined;
  target.value = undefined;
  search.value = undefined;
  timeRange.value = undefined;
  fieldFilters.value = [];
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

const items = computed(() => data.value?.items ?? []);
</script>

<template>
  <AppPage :title="$t('developer.logs.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-default">
        <UFormField :label="$t('developer.logs.filters.level')" size="sm">
          <USelect
            v-model="level"
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
            v-model="target"
            :items="targetOptions ?? []"
            :search-input="{ placeholder: $t('developer.logs.filters.target') }"
            searchable
            class="w-64"
          />
        </UFormField>

        <UFormField :label="$t('developer.logs.filters.search')" size="sm">
          <UInput
            v-model="search"
            :placeholder="$t('developer.logs.filters.search')"
            icon="i-lucide-search"
            class="w-48"
          />
        </UFormField>

        <UFormField :label="$t('developer.logs.filters.timeRange')" size="sm">
          <USelect
            v-model="timeRange"
            :items="[
              { label: $t('developer.logs.timeRanges.5m'), value: '5m' },
              { label: $t('developer.logs.timeRanges.1h'), value: '1h' },
              { label: $t('developer.logs.timeRanges.24h'), value: '24h' },
              { label: $t('developer.logs.timeRanges.7d'), value: '7d' },
              { label: $t('developer.logs.timeRanges.all'), value: 'all' },
            ]"
            :placeholder="$t('developer.logs.filters.timeRange')"
            class="w-40"
          />
        </UFormField>

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

      <div class="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-default">
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
          v-for="(f, idx) in fieldFilters"
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
      <div v-if="status === 'pending'" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="error" class="text-center py-12 text-error">
        <p>{{ $t("developer.logs.error") }}</p>
      </div>

      <div v-else-if="items.length === 0" class="text-center py-12 text-muted-foreground">
        <p>{{ $t("developer.logs.empty") }}</p>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="event in items"
          :key="event.id"
          class="border border-default rounded-lg hover:bg-elevated/50 transition-colors"
        >
          <div
            class="flex items-start gap-3 px-3 py-2 cursor-pointer"
            @click="toggleRow(event.id)"
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

        <div class="flex justify-center pt-4">
          <UButton
            v-if="data?.next_cursor"
            variant="soft"
            size="sm"
            @click="() => refresh()"
          >
            {{ $t("developer.logs.title") }}
          </UButton>
        </div>
      </div>
    </div>
  </AppPage>
</template>

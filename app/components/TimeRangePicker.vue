<script setup lang="ts">
import { timeRangeDurations } from "~/composables/useLogsContext";

type Range = "5m" | "15m" | "1h" | "6h" | "12h" | "24h" | "7d" | "30d" | "all" | "custom";

const props = defineProps<{
  modelValue: string | undefined;
  since?: Temporal.Instant;
  until?: Temporal.Instant;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | undefined];
  "update:since": [value: Temporal.Instant | undefined];
  "update:until": [value: Temporal.Instant | undefined];
}>();

const { t } = useI18n();
const fmt = useFormatter();

const open = ref(false);

const mode = ref<"relative" | "absolute">(props.since || props.until ? "absolute" : "relative");

const relativeRanges: { label: string; value: Range }[] = [
  { label: t("developer.logs.timeRanges.5m"), value: "5m" },
  { label: t("developer.logs.timeRanges.15m"), value: "15m" },
  { label: t("developer.logs.timeRanges.1h"), value: "1h" },
  { label: t("developer.logs.timeRanges.6h"), value: "6h" },
  { label: t("developer.logs.timeRanges.12h"), value: "12h" },
  { label: t("developer.logs.timeRanges.24h"), value: "24h" },
  { label: t("developer.logs.timeRanges.7d"), value: "7d" },
  { label: t("developer.logs.timeRanges.30d"), value: "30d" },
  { label: t("developer.logs.timeRanges.all"), value: "all" },
];

const selectedRange = ref<Range>((props.modelValue as Range) || "all");

function instantToDatetimeLocal(instant: Temporal.Instant): string {
  return instant
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}

function datetimeLocalToInstant(value: string): Temporal.Instant | undefined {
  if (!value) return undefined;
  return Temporal.PlainDateTime.from(value)
    .toZonedDateTime(Temporal.Now.timeZoneId())
    .toInstant();
}

const absoluteSince = ref(props.since ? instantToDatetimeLocal(props.since) : "");
const absoluteUntil = ref(props.until ? instantToDatetimeLocal(props.until) : "");

function selectRelative(r: Range) {
  selectedRange.value = r;
  mode.value = "relative";
  emit("update:modelValue", r === "all" ? undefined : r);
  emit("update:since", undefined);
  emit("update:until", undefined);
}

function switchMode(m: "relative" | "absolute") {
  mode.value = m;
  if (m === "relative") {
    applyRelative();
  }
}

function applyRelative() {
  const r = selectedRange.value;
  if (r === "all" || !timeRangeDurations[r]) {
    emit("update:modelValue", undefined);
    emit("update:since", undefined);
    emit("update:until", undefined);
  } else {
    emit("update:modelValue", r);
    emit("update:since", Temporal.Now.instant().subtract(timeRangeDurations[r]!));
    emit("update:until", undefined);
  }
}

function applyAbsolute() {
  emit("update:modelValue", "custom");
  emit("update:since", datetimeLocalToInstant(absoluteSince.value));
  emit("update:until", datetimeLocalToInstant(absoluteUntil.value));
  open.value = false;
}

function formatShortDate(instant: Temporal.Instant): string {
  return fmt.date(instant, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const preview = computed(() => {
  const r = props.modelValue;
  if (props.since || props.until) {
    const parts: string[] = [];
    if (props.since) parts.push(formatShortDate(props.since));
    if (props.until) parts.push(formatShortDate(props.until));
    if (parts.length === 0) {
      return t("developer.logs.timeRange.absolute");
    }
    if (parts.length === 1) {
      return props.since
        ? `${t("developer.logs.timeRange.from")} ${parts[0]}`
        : `${t("developer.logs.timeRange.to")} ${parts[0]}`;
    }
    return parts.join(" - ");
  }
  if (!r || r === "all") {
    return t("developer.logs.timeRanges.all");
  }
  const match = relativeRanges.find((x) => x.value === r);
  return match ? match.label : r;
});

function clear() {
  selectedRange.value = "all";
  mode.value = "relative";
  absoluteSince.value = "";
  absoluteUntil.value = "";
  emit("update:modelValue", undefined);
  emit("update:since", undefined);
  emit("update:until", undefined);
}

const hasActiveFilter = computed(() => !!props.modelValue || !!props.since || !!props.until);
</script>

<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom-start' }">
    <UButton
      size="sm"
      color="neutral"
      :variant="hasActiveFilter ? 'soft' : 'outline'"
      icon="i-lucide-calendar-clock"
      :label="preview"
      class="max-w-72 truncate"
    />

    <template #content>
      <div class="w-80 p-3 space-y-3">
        <div class="flex items-center justify-between">
          <UTabs
            v-model="mode"
            :items="[
              { label: $t('developer.logs.timeRange.relative'), value: 'relative' },
              { label: $t('developer.logs.timeRange.absolute'), value: 'absolute' },
            ]"
            size="xs"
            :content="false"
            @update:model-value="
              (v: string | number) => {
                if (v === 'relative' || v === 'absolute') switchMode(v);
              }
            "
          />
          <UButton
            v-if="hasActiveFilter"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="clear"
          />
        </div>

        <div v-if="mode === 'relative'" class="grid grid-cols-3 gap-1">
          <UButton
            v-for="r in relativeRanges"
            :key="r.value"
            :label="r.label"
            size="xs"
            :variant="selectedRange === r.value ? 'solid' : 'soft'"
            color="primary"
            @click="
              () => {
                selectRelative(r.value);
                open = false;
              }
            "
          />
        </div>

        <div v-else class="space-y-2">
          <UFormField :label="$t('developer.logs.timeRange.from')" size="sm">
            <UInput v-model="absoluteSince" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField :label="$t('developer.logs.timeRange.to')" size="sm">
            <UInput v-model="absoluteUntil" type="datetime-local" class="w-full" />
          </UFormField>
          <UButton
            size="sm"
            color="primary"
            block
            :label="$t('developer.logs.timeRange.apply')"
            @click="applyAbsolute"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

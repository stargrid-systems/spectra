<script setup lang="ts">
type Range = "5m" | "15m" | "1h" | "6h" | "12h" | "24h" | "7d" | "30d" | "all" | "custom";

const props = defineProps<{
  modelValue: string | undefined;
  since?: string;
  until?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | undefined];
  "update:since": [value: string | undefined];
  "update:until": [value: string | undefined];
}>();

const { t } = useI18n();

const mode = ref<"relative" | "absolute">(
  props.since || props.until ? "absolute" : "relative",
);

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

const rangeMillis: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const selectedRange = ref<Range>((props.modelValue as Range) || "all");

const absoluteSince = ref(props.since || "");
const absoluteUntil = ref(props.until || "");

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
  if (r === "all" || !rangeMillis[r]) {
    emit("update:modelValue", undefined);
    emit("update:since", undefined);
    emit("update:until", undefined);
  } else {
    emit("update:modelValue", r);
    emit("update:since", new Date(Date.now() - rangeMillis[r]).toISOString());
    emit("update:until", undefined);
  }
}

function applyAbsolute() {
  emit("update:modelValue", "custom");
  emit("update:since", absoluteSince.value || undefined);
  emit("update:until", absoluteUntil.value || undefined);
}

const computedSince = computed(() => {
  if (mode.value === "absolute") return absoluteSince.value || undefined;
  const r = selectedRange.value;
  if (r === "all" || !rangeMillis[r]) return undefined;
  return new Date(Date.now() - rangeMillis[r]).toISOString();
});

defineExpose({ computedSince });
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex gap-1">
      <UButton
        size="xs"
        :variant="mode === 'relative' ? 'solid' : 'ghost'"
        color="primary"
        :label="$t('developer.logs.timeRange.relative')"
        @click="switchMode('relative')"
      />
      <UButton
        size="xs"
        :variant="mode === 'absolute' ? 'solid' : 'ghost'"
        color="primary"
        :label="$t('developer.logs.timeRange.absolute')"
        @click="switchMode('absolute')"
      />
    </div>

    <div v-if="mode === 'relative'">
      <UFieldGroup size="xs" orientation="horizontal" class="flex-wrap">
        <UButton
          v-for="r in relativeRanges"
          :key="r.value"
          :label="r.label"
          :variant="selectedRange === r.value ? 'solid' : 'ghost'"
          color="primary"
          @click="() => { selectRelative(r.value); }"
        />
      </UFieldGroup>
    </div>

    <div v-else class="flex items-end gap-2">
      <UFormField :label="$t('developer.logs.timeRange.from')" size="sm">
        <UInput
          v-model="absoluteSince"
          type="datetime-local"
          class="w-44"
        />
      </UFormField>
      <UFormField :label="$t('developer.logs.timeRange.to')" size="sm">
        <UInput
          v-model="absoluteUntil"
          type="datetime-local"
          class="w-44"
        />
      </UFormField>
      <UButton
        size="sm"
        :label="$t('developer.logs.timeRange.apply')"
        @click="() => { applyAbsolute(); }"
      />
    </div>
  </div>
</template>
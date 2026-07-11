<script setup lang="ts">
type DataPoint = { label: string; usage: number };

defineProps<{
  deviceId: string;
}>();

const { t, locale } = useI18n();

const timeRanges = [
  { value: "1h", labelKey: "devices.meter.range.1h" },
  { value: "24h", labelKey: "devices.meter.range.24h" },
  { value: "7d", labelKey: "devices.meter.range.7d" },
  { value: "30d", labelKey: "devices.meter.range.30d" },
  { value: "1y", labelKey: "devices.meter.range.1y" },
  { value: "5y", labelKey: "devices.meter.range.5y" },
] as const satisfies readonly { value: string; labelKey: string }[];

type TimeRange = (typeof timeRanges)[number]["value"];

const unitFormat = (unit: string, value: number) =>
  new Intl.NumberFormat(locale.value, { style: "unit", unit, unitDisplay: "narrow" }).format(value);

const timeLabels: Record<TimeRange, (index: number, total: number) => string> = {
  "1h": (idx, total) => unitFormat("minute", (total - idx - 1) * 5),
  "24h": (idx, total) => unitFormat("hour", total - idx - 1),
  "7d": (idx, total) => unitFormat("day", total - idx - 1),
  "30d": (idx, total) => unitFormat("day", total - idx - 1),
  "1y": (idx, total) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (total - idx - 1));
    return new Intl.DateTimeFormat(locale.value, { month: "short" }).format(date);
  },
  "5y": (idx, total) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (total - idx - 1));
    return new Intl.DateTimeFormat(locale.value, { month: "short", year: "2-digit" }).format(date);
  },
};

const generateSeries = (
  points: number,
  base: number,
  variance: number,
  range: TimeRange,
): DataPoint[] => {
  const labelFor = timeLabels[range]!;
  return Array.from({ length: points }).map((_, idx) => {
    const noise = (Math.sin(idx / 2) + Math.cos(idx / 3)) * variance;
    const value = Math.max(0, base + noise + Math.random() * variance);
    return {
      label: labelFor(idx, points),
      usage: Number(value.toFixed(2)),
    };
  });
};

const seriesByRange = reactive<Record<TimeRange, DataPoint[]>>({
  "1h": generateSeries(12, 4.2, 0.6, "1h"),
  "24h": generateSeries(24, 3.8, 0.8, "24h"),
  "7d": generateSeries(28, 3.5, 1.0, "7d"),
  "30d": generateSeries(30, 3.2, 1.2, "30d"),
  "1y": generateSeries(12, 3.4, 1.0, "1y"),
  "5y": generateSeries(60, 3.2, 1.4, "5y"),
});

const activeRange = ref<TimeRange>("24h");
const currentSeries = computed(() => seriesByRange[activeRange.value] ?? []);
const currentPower = computed(() => currentSeries.value.at(-1)?.usage ?? 0);

const chartCategories = computed(() => ({
  usage: {
    name: t("devices.meter.consumption"),
    color: "var(--ui-primary-500, #2563eb)",
  },
}));

const chartData = computed(() =>
  currentSeries.value.map((point) => ({
    usage: point.usage,
    label: point.label,
  })),
);

const xLabels = computed(() => currentSeries.value.map((point) => point.label));

const formatTickLabel = (tick: number) => {
  const index = Math.round(tick);
  return xLabels.value[index] ?? "";
};

const formatKw = (value: number) => `${value.toFixed(1)} ${t("devices.meter.unitKw")}`;
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <UCard class="lg:col-span-1">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ $t("devices.meter.currentPower") }}</span>
          <UIcon name="i-lucide-activity" class="size-5 text-muted-foreground" />
        </div>
      </template>
      <div class="space-y-2">
        <p class="text-4xl font-semibold tracking-tight">
          {{ currentPower.toFixed(2) }}
          <span class="text-base font-medium text-muted-foreground">
            {{ $t("devices.meter.unitKw") }}
          </span>
        </p>
        <p class="text-sm text-muted-foreground">
          {{ $t("devices.meter.currentPowerLive") }}
        </p>
      </div>
    </UCard>

    <UCard class="lg:col-span-2">
      <template #header>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-chart-line" class="size-5" />
            <span class="font-semibold">{{ $t("devices.meter.consumption") }}</span>
          </div>
          <UFieldGroup size="xs" orientation="horizontal">
            <UButton
              v-for="range in timeRanges"
              :key="range.value"
              :label="$t(range.labelKey)"
              :variant="activeRange === range.value ? 'solid' : 'ghost'"
              color="primary"
              @click="
                () => {
                  activeRange = range.value;
                }
              "
            />
          </UFieldGroup>
        </div>
      </template>

      <div class="pt-2">
        <div class="h-48">
          <LineChart
            v-if="chartData.length"
            :data="chartData"
            :categories="chartCategories"
            :height="220"
            :x-formatter="formatTickLabel"
            :y-formatter="formatKw"
            :x-num-ticks="6"
            :y-grid-line="true"
            :x-grid-line="true"
          />
          <div v-else class="flex h-full items-center justify-center text-muted-foreground">
            {{ $t("devices.empty") }}
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

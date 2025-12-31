<script setup lang="ts">
type TimeRange = "1h" | "24h" | "7d" | "30d" | "1y" | "5y";
type DataPoint = { label: string; usage: number };

const route = useRoute();
const deviceId = route.params.id as string;
const { t, locale } = useI18n();

// Mock device - replace with API call later
const device = ref({
  id: deviceId,
  type: "meter",
  name: "Main Energy Meter",
  status: "online",
});

const timeRanges: { value: TimeRange; labelKey: string }[] = [
  { value: "1h", labelKey: "devices.meter.range.1h" },
  { value: "24h", labelKey: "devices.meter.range.24h" },
  { value: "7d", labelKey: "devices.meter.range.7d" },
  { value: "30d", labelKey: "devices.meter.range.30d" },
  { value: "1y", labelKey: "devices.meter.range.1y" },
  { value: "5y", labelKey: "devices.meter.range.5y" },
];

const timeLabels: Record<TimeRange, (index: number, total: number) => string> =
  {
    "1h": (idx, total) => `${(total - idx - 1) * 5}m`,
    "24h": (idx, total) => `${total - idx - 1}h`,
    "7d": (idx, total) => `${total - idx - 1}d`,
    "30d": (idx, total) => `${total - idx - 1}d`,
    "1y": (idx, total) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (total - idx - 1));
      return date.toLocaleString(locale.value, { month: "short" });
    },
    "5y": (idx, total) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (total - idx - 1));
      const month = date.toLocaleString(locale.value, { month: "short" });
      const year = String(date.getFullYear()).slice(-2);
      return `${month} '${year}`;
    },
  };

// Mock series generator
const generateSeries = (
  points: number,
  base: number,
  variance: number,
  range: TimeRange,
): DataPoint[] => {
  const labelFor = timeLabels[range];
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
  "1h": generateSeries(12, 4.2, 0.6, "1h"), // 5-min granularity
  "24h": generateSeries(24, 3.8, 0.8, "24h"),
  "7d": generateSeries(28, 3.5, 1.0, "7d"), // ~6-hour granularity
  "30d": generateSeries(30, 3.2, 1.2, "30d"), // daily
  "1y": generateSeries(12, 3.4, 1.0, "1y"), // monthly
  "5y": generateSeries(60, 3.2, 1.4, "5y"), // monthly across 5 years
});

const activeRange = ref<TimeRange>("24h");
const currentSeries = computed(() => seriesByRange[activeRange.value]);
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

const formatKw = (value: number) =>
  `${value.toFixed(1)} ${t("devices.meter.unitKw")}`;
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="device.name" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :to="$localePath('/devices')"
          />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <div class="flex items-start gap-4">
          <UAvatar icon="i-lucide-gauge" color="blue" size="xl" />
          <div>
            <h2 class="text-2xl font-semibold">{{ device.name }}</h2>
            <p class="text-muted-foreground">{{ $t("devices.types.meter") }}</p>
            <UBadge color="success" variant="subtle" class="mt-2">
              {{ $t("devices.status.online") }}
            </UBadge>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <UCard class="lg:col-span-1">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{
                  $t("devices.meter.currentPower")
                }}</span>
                <UIcon
                  name="i-lucide-activity"
                  class="size-5 text-muted-foreground"
                />
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
                  <span class="font-semibold">{{
                    $t("devices.meter.consumption")
                  }}</span>
                </div>
                <UFieldGroup size="xs" orientation="horizontal">
                  <UButton
                    v-for="range in timeRanges"
                    :key="range.value"
                    :label="$t(range.labelKey)"
                    :variant="activeRange === range.value ? 'solid' : 'ghost'"
                    color="primary"
                    @click="activeRange = range.value"
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
                <div
                  v-else
                  class="flex h-full items-center justify-center text-muted-foreground"
                >
                  {{ $t("devices.empty") }}
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t("devices.details.title") }}</h3>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground">
                {{ $t("devices.details.id") }}
              </p>
              <p class="font-medium">{{ deviceId }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                {{ $t("devices.details.type") }}
              </p>
              <p class="font-medium">{{ $t("devices.types.meter") }}</p>
            </div>
            <div class="text-muted-foreground">
              <p>{{ $t("devices.details.placeholder") }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

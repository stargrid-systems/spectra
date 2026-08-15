<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import {
  durationToUnitCombo,
  INTERVAL_UNITS,
  unitComboToDuration,
  type IntervalUnit,
} from "~/utils/scheduleInterval";

/**
 * Interval picker: a whole number plus a unit. Exposes the selection as a
 * Temporal.Duration; undefined while the number is empty or invalid.
 */
const model = defineModel<Temporal.Duration | undefined>("modelValue");

const { t } = useI18n();

// UInput with type "number" emits numbers, not strings.
const valueText = ref<number | string>("");
const unit = ref<IntervalUnit>("minute");

const unitItems = computed<SelectMenuItem[]>(() =>
  INTERVAL_UNITS.map((u) => ({ label: t(`common.durationUnits.${u}`), value: u })),
);

watch(
  model,
  (duration) => {
    if (!duration) {
      valueText.value = "";
      return;
    }
    const combo = durationToUnitCombo(duration);
    if (combo) {
      valueText.value = combo.value;
      unit.value = combo.unit;
    } else {
      valueText.value = "";
    }
  },
  { immediate: true },
);

watch([valueText, unit], () => {
  const n = typeof valueText.value === "number" ? valueText.value : Number(valueText.value);
  if (valueText.value === "" || valueText.value == null || !Number.isInteger(n) || n < 1) {
    model.value = undefined;
    return;
  }
  const duration = unitComboToDuration({ value: n, unit: unit.value });
  if (model.value?.toString() !== duration.toString()) {
    model.value = duration;
  }
});
</script>

<template>
  <div class="flex gap-2 w-full">
    <!-- UInput types modelValue as string but emits numbers for type number. -->
    <UInput
      :model-value="valueText === '' ? '' : String(valueText)"
      type="number"
      min="1"
      step="1"
      class="flex-1"
      @update:model-value="(v) => (valueText = v ?? '')"
    />
    <USelectMenu v-model="unit" :items="unitItems" value-key="value" class="w-32" />
  </div>
</template>

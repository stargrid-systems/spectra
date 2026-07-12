<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: Temporal.Instant;
  }>(),
  { modelValue: undefined },
);

const emit = defineEmits<{
  "update:modelValue": [value: Temporal.Instant | undefined];
}>();

const fmt = useFormatter();
const text = ref("");

watch(
  () => props.modelValue,
  (instant) => {
    text.value = instant ? fmt.toInputDatetimeLocal(instant) : "";
  },
  { immediate: true },
);

function onInput(value: string) {
  text.value = value;
  emit("update:modelValue", fmt.fromInputDatetimeLocal(value));
}
</script>

<template>
  <UInput
    :model-value="text"
    type="datetime-local"
    class="w-full"
    @update:model-value="onInput"
  />
</template>

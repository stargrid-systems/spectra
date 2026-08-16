<script setup lang="ts">
import { resolveRef, type JsonSchemaLike } from "~/utils/schemaDisplay";

/**
 * Leaf widget for a schema property: enum select, boolean checkbox, number
 * input, or text input. Exposes the plain value; number inputs keep the
 * string placeholder convention of the form state.
 */
const props = withDefaults(
  defineProps<{
    schema?: JsonSchemaLike;
    doc?: JsonSchemaLike;
  }>(),
  { schema: undefined, doc: undefined },
);

const model = defineModel<FormValue>({ required: true });

const resolved = computed(() =>
  props.schema ? resolveRef(props.schema, props.doc ?? props.schema) : undefined,
);

const enumValues = computed<string[] | undefined>(() => {
  if (!resolved.value?.enum?.length) return undefined;
  return resolved.value.enum.filter((v): v is string => typeof v === "string");
});

const isBoolean = computed(() => resolved.value?.type === "boolean");
const isNumber = computed(() => {
  const t = resolved.value?.type;
  return t === "number" || t === "integer";
});

function setText(v: string | number | null | undefined) {
  if (typeof v === "number") {
    model.value = String(v);
    return;
  }
  model.value = v ?? "";
}
</script>

<template>
  <USelectMenu
    v-if="enumValues"
    :model-value="String(model ?? '')"
    :items="enumValues"
    class="w-full"
    @update:model-value="(v) => (model = typeof v === 'string' ? v : '')"
  />
  <UCheckbox
    v-else-if="isBoolean"
    :model-value="model === true"
    @update:model-value="(v) => (model = v === true)"
  />
  <UInput
    v-else-if="isNumber"
    :model-value="String(model ?? '')"
    type="number"
    class="w-full"
    @update:model-value="setText"
  />
  <UInput v-else :model-value="String(model ?? '')" class="w-full" @update:model-value="setText" />
</template>

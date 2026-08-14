<script setup lang="ts">
import {
  pickOneOfBranch,
  resolveRef,
  schemaEntries,
  type JsonSchemaLike,
  type SchemaRow,
} from "~/utils/schemaDisplay";
import { formatValue } from "~/utils/logFields";

const props = withDefaults(
  defineProps<{
    value: unknown;
    schema?: JsonSchemaLike;
    depth?: number;
    emptyText?: string;
  }>(),
  { schema: undefined, depth: 0, emptyText: undefined },
);

const MAX_DEPTH = 8;

const resolved = computed<JsonSchemaLike | undefined>(() => {
  if (!props.schema) return undefined;
  const base = resolveRef(props.schema);
  if (!base) return undefined;
  if (base.oneOf && typeof props.value === "object" && props.value !== null) {
    const branch = pickOneOfBranch(base.oneOf, props.value);
    if (branch) return branch;
  }
  return base;
});

const rows = computed(() => {
  if (props.depth >= MAX_DEPTH || props.value === null) return undefined;
  if (Array.isArray(props.value)) return undefined;
  if (!resolved.value) return undefined;
  return schemaEntries(resolved.value, props.value);
});

const isObject = (v: unknown): boolean => typeof v === "object" && v !== null && !Array.isArray(v);

const isArray = Array.isArray;

const rowSchema = (row: SchemaRow): JsonSchemaLike | undefined => row.schema;

function scalarType(schema: JsonSchemaLike | undefined): "bool" | "enum" | "text" {
  if (schema?.type === "boolean") return "bool";
  if (schema?.enum?.length) return "enum";
  return "text";
}

const rawJson = computed(() => {
  try {
    return JSON.stringify(props.value, null, 2) ?? "null";
  } catch {
    return formatValue(props.value);
  }
});
</script>

<template>
  <div v-if="isArray(value)" class="flex flex-col gap-1">
    <template v-if="depth < MAX_DEPTH">
      <div
        v-for="(item, i) in value as unknown[]"
        :key="i"
        class="border border-default rounded px-2 py-1"
      >
        <SchemaValue
          :value="item"
          :schema="resolved?.items"
          :depth="depth + 1"
          :empty-text="emptyText"
        />
      </div>
    </template>
    <pre v-else class="text-xs font-mono whitespace-pre-wrap">{{ rawJson }}</pre>
  </div>

  <div v-else-if="rows !== undefined && rows.length > 0" class="flex flex-col gap-1.5">
    <div
      v-for="row in rows"
      :key="row.key"
      class="flex max-sm:flex-col sm:items-baseline gap-x-2 gap-y-0.5"
    >
      <span :title="row.description" class="text-muted-foreground font-mono text-xs shrink-0">
        {{ row.label }}:
      </span>
      <div class="min-w-0 text-xs font-mono">
        <SchemaValue
          v-if="isObject(row.value) || isArray(row.value)"
          :value="row.value"
          :schema="rowSchema(row)"
          :depth="depth + 1"
          :empty-text="emptyText"
        />
        <template v-else-if="row.value !== null">
          <UBadge
            v-if="scalarType(row.schema) === 'enum'"
            :label="formatValue(row.value)"
            variant="subtle"
          />
          <UIcon
            v-else-if="scalarType(row.schema) === 'bool' && row.value === true"
            name="i-lucide-check"
            class="size-3.5 text-success"
          />
          <UIcon
            v-else-if="scalarType(row.schema) === 'bool'"
            name="i-lucide-x"
            class="size-3.5 text-error"
          />
          <span v-else class="break-all tabular-nums">{{ formatValue(row.value) }}</span>
        </template>
        <span v-else class="text-muted-foreground">null</span>
      </div>
    </div>
  </div>

  <span v-else-if="rows !== undefined && rows.length === 0" class="text-muted-foreground text-xs">
    {{ emptyText }}
  </span>

  <span v-else-if="value === null" class="text-muted-foreground text-xs">null</span>

  <pre v-else-if="typeof value === 'object'" class="text-xs font-mono whitespace-pre-wrap">{{
    rawJson
  }}</pre>

  <template v-else>
    <UBadge v-if="scalarType(resolved) === 'enum'" :label="formatValue(value)" variant="subtle" />
    <UIcon
      v-else-if="scalarType(resolved) === 'bool' && value === true"
      name="i-lucide-check"
      class="size-3.5 text-success"
    />
    <UIcon
      v-else-if="scalarType(resolved) === 'bool'"
      name="i-lucide-x"
      class="size-3.5 text-error"
    />
    <span v-else class="break-all tabular-nums">{{ formatValue(value) }}</span>
  </template>
</template>

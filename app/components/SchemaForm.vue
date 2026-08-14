<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- the state object is owned by the
   surrounding UForm and shared by reference, like any nested form state. */
import { resolveRef, type JsonSchemaLike } from "~/utils/schemaDisplay";
import { buildFormState, oneOfBranchTag, type FormState, type FormValue } from "~/utils/schemaForm";

const props = withDefaults(
  defineProps<{
    schema: JsonSchemaLike;
    state: FormState;
    namePrefix?: string;
    depth?: number;
  }>(),
  { namePrefix: "", depth: 0 },
);

const MAX_DEPTH = 6;

function typeOf(schema: JsonSchemaLike | undefined): string | undefined {
  if (!schema) return undefined;
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== "null");
  return undefined;
}

function enumValues(schema: JsonSchemaLike | undefined): string[] | undefined {
  if (!schema?.enum?.length) return undefined;
  return schema.enum.filter((v): v is string => typeof v === "string");
}

interface Field {
  key: string;
  label: string;
  description?: string;
  schema: JsonSchemaLike | undefined;
  path: string;
  kind: "branch-select" | "object" | "array" | "enum" | "boolean" | "number" | "text";
  branches?: { label: string; branch: JsonSchemaLike }[];
}

const branchChoices = reactive(new Map<string, string>());

function classify(field: Omit<Field, "kind" | "branches">): Pick<Field, "kind" | "branches"> {
  const schema = field.schema;
  if (schema?.oneOf?.length) {
    const branches = schema.oneOf.map((branch) => ({
      label: branch.description ?? String(oneOfBranchTag(branch)?.[1] ?? branch.title ?? "option"),
      branch,
    }));
    return { kind: "branch-select", branches };
  }
  switch (typeOf(schema)) {
    case "object":
      return props.depth < MAX_DEPTH ? { kind: "object" } : { kind: "text" };
    case "array":
      return props.depth < MAX_DEPTH ? { kind: "array" } : { kind: "text" };
    case "boolean":
      return { kind: "boolean" };
    case "number":
    case "integer":
      return { kind: "number" };
    default:
      return enumValues(schema)?.length ? { kind: "enum" } : { kind: "text" };
  }
}

const fields = computed<Field[]>(() => {
  const schema = resolveRef(props.schema);
  if (!schema?.properties) return [];
  return Object.entries(schema.properties)
    .map(([key, prop]) => {
      const resolved = resolveRef(prop);
      const base = {
        key,
        label: resolved?.title ?? key,
        description: resolved?.description,
        schema: resolved,
        path: props.namePrefix ? `${props.namePrefix}.${key}` : key,
      };
      // A single oneOf branch becomes the effective schema; its tag constant
      // is already injected into the state by buildFormState.
      const single = resolved?.oneOf?.length === 1 ? resolveRef(resolved.oneOf[0]!) : undefined;
      const field: Field = {
        ...base,
        schema: single ?? base.schema!,
        ...classify({ ...base, schema: single ?? base.schema }),
      };
      return field;
    })
    .filter((f) => !isTagField(f));
});

/**
 * Single-value enum properties are oneOf discriminator tags. Their value is
 * injected into the state, so they never render as a field.
 */
function isTagField(field: Field): boolean {
  return field.kind === "enum" && field.schema?.enum?.length === 1;
}

function selectedBranch(field: Field): JsonSchemaLike | undefined {
  if (field.kind !== "branch-select" || !field.branches) return undefined;
  const label = branchChoices.get(field.key) ?? field.branches[0]?.label;
  return field.branches.find((b) => b.label === label)?.branch;
}

function selectBranch(field: Field, label: string | undefined) {
  branchChoices.set(field.key, label ?? "");
  const branch = field.branches?.find((b) => b.label === label)?.branch;
  if (!branch) return;
  const nested = buildFormState(branch);
  const tag = oneOfBranchTag(branch);
  if (tag) nested[tag[0]] = tag[1];
  props.state[field.key] = nested;
}

function isRecord(value: FormValue | undefined): value is FormState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stateAt(key: string): FormState | undefined {
  const v = props.state[key];
  return isRecord(v) ? v : undefined;
}

function itemAt(key: string, index: number): FormState | undefined {
  const v = asArray(key)[index];
  return isRecord(v) ? v : undefined;
}

function asArray(key: string): FormValue[] {
  const v = props.state[key];
  return Array.isArray(v) ? v : [];
}

function addItem(field: Field) {
  const arr = [...asArray(field.key)];
  arr.push(buildFormState(field.schema?.items ?? {}));
  props.state[field.key] = arr;
}

function removeItem(field: Field, index: number) {
  const arr = [...asArray(field.key)];
  arr.splice(index, 1);
  props.state[field.key] = arr;
}

function setLeaf(key: string, value: FormValue) {
  props.state[key] = value;
}

function setArrayItem(key: string, index: number, value: string) {
  const arr = [...asArray(key)];
  arr[index] = value;
  props.state[key] = arr;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-for="field in fields" :key="field.key">
      <UFormField
        v-if="field.kind === 'branch-select'"
        :label="field.label"
        :description="field.description"
        :name="field.path"
      >
        <USelectMenu
          :model-value="branchChoices.get(field.key) || field.branches![0]!.label"
          :items="field.branches!.map((b) => b.label)"
          class="w-full"
          @update:model-value="(v) => selectBranch(field, typeof v === 'string' ? v : undefined)"
        />
        <div
          v-if="selectedBranch(field) && stateAt(field.key)"
          class="border border-default rounded-md p-3 w-full"
        >
          <SchemaForm
            :schema="selectedBranch(field)!"
            :state="stateAt(field.key)!"
            :name-prefix="field.path"
            :depth="depth + 1"
          />
        </div>
      </UFormField>

      <div v-else-if="field.kind === 'object'" class="flex flex-col gap-1">
        <span v-if="field.label" class="text-sm font-medium">{{ field.label }}</span>
        <span v-if="field.description" class="text-xs text-muted-foreground">
          {{ field.description }}
        </span>
        <div class="border border-default rounded-md p-3">
          <SchemaForm
            v-if="stateAt(field.key)"
            :schema="field.schema!"
            :state="stateAt(field.key)!"
            :name-prefix="field.path"
            :depth="depth + 1"
          />
        </div>
      </div>

      <UFormField
        v-else-if="field.kind === 'array'"
        :label="field.label"
        :description="field.description"
        :name="field.path"
      >
        <div class="flex flex-col gap-2 w-full">
          <div
            v-for="(_, i) in asArray(field.key)"
            :key="i"
            class="flex items-start gap-2 border border-default rounded-md p-2"
          >
            <div class="flex-1 min-w-0">
              <SchemaForm
                v-if="itemAt(field.key, i)"
                :schema="field.schema!.items!"
                :state="itemAt(field.key, i)!"
                :name-prefix="`${field.path}.${i}`"
                :depth="depth + 1"
              />
              <UInput
                v-else
                :model-value="String(asArray(field.key)[i] ?? '')"
                class="w-full"
                @update:model-value="(v) => setArrayItem(field.key, i, v)"
              />
            </div>
            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              size="xs"
              @click="removeItem(field, i)"
            />
          </div>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            size="xs"
            class="self-start"
            :label="$t('common.add')"
            @click="addItem(field)"
          />
        </div>
      </UFormField>

      <UFormField v-else :label="field.label" :description="field.description" :name="field.path">
        <USelectMenu
          v-if="field.kind === 'enum'"
          :model-value="String(state[field.key] ?? '')"
          :items="enumValues(field.schema)!"
          class="w-full"
          @update:model-value="(v) => setLeaf(field.key, typeof v === 'string' ? v : '')"
        />
        <UCheckbox
          v-else-if="field.kind === 'boolean'"
          :model-value="state[field.key] === true"
          @update:model-value="(v) => setLeaf(field.key, v === true)"
        />
        <UInput
          v-else-if="field.kind === 'number'"
          :model-value="String(state[field.key] ?? '')"
          type="number"
          class="w-full"
          @update:model-value="(v) => setLeaf(field.key, v)"
        />
        <UInput
          v-else
          :model-value="String(state[field.key] ?? '')"
          class="w-full"
          @update:model-value="(v) => setLeaf(field.key, v)"
        />
      </UFormField>
    </template>
  </div>
</template>

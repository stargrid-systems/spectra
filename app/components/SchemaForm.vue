<script setup lang="ts">
import {
  isRecord,
  oneOfBranchTag,
  resolveRef,
  stringEnums,
  type JsonSchemaLike,
  typeOf,
} from "~/utils/schemaCore";
import {
  buildFormState,
  defaultOneOfBranch,
  type FormState,
  type FormValue,
} from "~/utils/schemaForm";

const props = withDefaults(
  defineProps<{
    schema: JsonSchemaLike;
    /** The standalone document the schema and its $defs belong to. */
    doc?: JsonSchemaLike;
    namePrefix?: string;
    depth?: number;
  }>(),
  { doc: undefined, namePrefix: "", depth: 0 },
);

// The form state is owned by the surrounding UForm and shared by reference.
const state = defineModel<FormState>("state", { required: true });

const rootDoc = computed(() => props.doc ?? props.schema);

const MAX_DEPTH = 6;

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
      return stringEnums(schema ?? {})?.length ? { kind: "enum" } : { kind: "text" };
  }
}

const rootBranches = computed<{ label: string; branch: JsonSchemaLike }[] | undefined>(() => {
  const resolved = resolveRef(props.schema, rootDoc.value);
  if (!resolved?.oneOf?.length) return undefined;
  if (defaultOneOfBranch(resolved)) return undefined; // single branch unwraps silently
  return resolved.oneOf.map((branch) => ({
    label: branch.description ?? String(oneOfBranchTag(branch)?.[1] ?? branch.title ?? "option"),
    branch,
  }));
});

const rootChoice = ref<string | undefined>(undefined);
const activeRootBranch = computed(
  () => rootBranches.value?.find((b) => b.label === rootChoice.value) ?? rootBranches.value?.[0],
);

// A root oneOf with a single resolvable branch renders that branch directly.
function effectiveSchema(): JsonSchemaLike | undefined {
  if (rootBranches.value) {
    const branch = activeRootBranch.value?.branch;
    return branch ? (resolveRef(branch, rootDoc.value) ?? branch) : undefined;
  }
  const resolved = resolveRef(props.schema, rootDoc.value);
  if (!resolved?.oneOf?.length) return resolved;
  const branch = defaultOneOfBranch(resolved)?.branch;
  return branch ? (resolveRef(branch, rootDoc.value) ?? branch) : resolved;
}

const fields = computed<Field[]>(() => {
  const schema = effectiveSchema();
  if (!schema?.properties) return [];
  return Object.entries(schema.properties)
    .map(([key, prop]) => {
      const resolved = resolveRef(prop, rootDoc.value);
      const base = {
        key,
        label: resolved?.title ?? key,
        description: resolved?.description,
        schema: resolved,
        path: props.namePrefix ? `${props.namePrefix}.${key}` : key,
      };
      // A single oneOf branch becomes the effective schema; its tag constant
      // is already injected into the state by buildFormState.
      const single =
        resolved?.oneOf?.length === 1 ? resolveRef(resolved.oneOf[0]!, rootDoc.value) : undefined;
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

function seedBranchState(field: Field, branch: JsonSchemaLike) {
  const nested = buildFormState(branch, rootDoc.value);
  const tag = oneOfBranchTag(branch);
  if (tag) nested[tag[0] as string] = tag[1] as FormValue;
  state.value[field.key] = nested;
}

function selectBranch(field: Field, label: string | undefined) {
  branchChoices.set(field.key, label ?? "");
  const branch = field.branches?.find((b) => b.label === label)?.branch;
  if (branch) seedBranchState(field, branch);
}

function stateAt(key: string): FormState | undefined {
  const v = state.value[key];
  return isRecord(v) ? (v as FormState) : undefined;
}

function itemAt(key: string, index: number): FormState | undefined {
  const v = asArray(key)[index];
  return isRecord(v) ? (v as FormState) : undefined;
}

function asArray(key: string): FormValue[] {
  const v = state.value[key];
  return Array.isArray(v) ? v : [];
}

function addItem(field: Field) {
  const arr = [...asArray(field.key)];
  arr.push(buildFormState(field.schema?.items ?? {}));
  state.value[field.key] = arr;
}

function removeItem(field: Field, index: number) {
  const arr = [...asArray(field.key)];
  arr.splice(index, 1);
  state.value[field.key] = arr;
}

function setLeaf(key: string, value: FormValue) {
  state.value[key] = value;
}

function setArrayItem(key: string, index: number, value: string) {
  const arr = [...asArray(key)];
  arr[index] = value;
  state.value[key] = arr;
}

function selectRootBranch(label: string | undefined) {
  rootChoice.value = label;
  const branch = rootBranches.value?.find((b) => b.label === label)?.branch;
  if (!branch) return;
  const nested = buildFormState(branch, rootDoc.value);
  const tag = oneOfBranchTag(branch);
  if (tag) nested[tag[0] as string] = tag[1] as FormValue;
  state.value = nested;
}

watch(
  rootBranches,
  (branches) => {
    if (!branches?.length) return;
    if (Object.keys(state.value).length > 0) return;
    selectRootBranch(branches[0]!.label);
  },
  { immediate: true },
);

watch(
  () => fields.value.filter((f) => f.kind === "branch-select"),
  (branchFields) => {
    for (const field of branchFields) {
      if (stateAt(field.key) !== undefined) continue;
      const branch = field.branches?.[0]?.branch;
      if (branch) seedBranchState(field, branch);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField v-if="rootBranches" :label="activeRootBranch?.label">
      <USelectMenu
        :model-value="activeRootBranch?.label"
        :items="rootBranches.map((b) => b.label)"
        class="w-full"
        @update:model-value="(v) => selectRootBranch(typeof v === 'string' ? v : undefined)"
      />
    </UFormField>
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
            :doc="rootDoc"
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
            :doc="rootDoc"
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
                :doc="rootDoc"
                :state="itemAt(field.key, i)!"
                :name-prefix="`${field.path}.${i}`"
                :depth="depth + 1"
              />
              <SchemaField
                v-else
                :model-value="asArray(field.key)[i] ?? ''"
                :schema="field.schema?.items"
                :doc="rootDoc"
                @update:model-value="
                  (v) => setArrayItem(field.key, i, typeof v === 'string' ? v : String(v ?? ''))
                "
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
        <SchemaField
          :model-value="state[field.key] ?? ''"
          :schema="field.schema"
          :doc="rootDoc"
          @update:model-value="(v) => setLeaf(field.key, v)"
        />
      </UFormField>
    </template>
  </div>
</template>

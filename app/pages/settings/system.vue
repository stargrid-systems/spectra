<script setup lang="ts">
import * as z from "zod/v4/mini";
import type { Setting } from "~~/modules/aperture/runtime/types";
import type { JsonSchemaLike } from "~/utils/schemaDisplay";
import {
  buildFormState,
  buildZodSchema,
  cleanFormState,
  mergeFormState,
  type FormState,
} from "~/utils/schemaForm";
import {
  useSettingDefinitionCache,
  useSettingDefinitionSummaries,
} from "~/composables/useSettingDefinitions";

const { t } = useI18n();
const toast = useToast();
const { isAdmin } = useAuth();

const { data, pending, error, refresh } = await useAsyncData<Setting[]>(
  "settings",
  () => apertureApi.listSettings(),
  { server: false },
);

useSettingDefinitionSummaries();
const { getDefinition } = useSettingDefinitionCache();

const schemas = ref<Map<string, JsonSchemaLike | undefined>>(new Map());

function schemaFor(key: string): JsonSchemaLike | undefined {
  return schemas.value.get(key);
}

async function loadSchema(key: string) {
  if (schemas.value.has(key)) return;
  schemas.value.set(key, undefined);
  const definition = await getDefinition(key);
  const schema = definition?.value_schema;
  schemas.value.set(
    key,
    typeof schema === "object" && schema !== null ? (schema as JsonSchemaLike) : undefined,
  );
}

watch(
  () => data.value?.map((s) => s.key) ?? [],
  (keys) => {
    for (const key of keys) void loadSchema(key);
  },
  { immediate: true },
);

// A scalar schema root (string, number, boolean) renders one field instead
// of an object form.
function isObjectRoot(schema: JsonSchemaLike | undefined): boolean {
  if (!schema) return false;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  return type === "object" || !!schema.properties || !!schema.oneOf;
}

// Edit modal: schema-driven when a definition exists, raw JSON otherwise.

const editOpen = ref(false);
const editRaw = ref("");
const editKey = ref("");
const editSchema = ref<JsonSchemaLike | undefined>(undefined);
const editState = ref<FormState>({});
const editScalar = ref<string | number | boolean>("");
const editError = ref<string | null>(null);
const saving = ref(false);

const editZodSchema = computed(() =>
  editSchema.value && isObjectRoot(editSchema.value) ? buildZodSchema(editSchema.value) : z.any(),
);

function openEdit(setting: Setting) {
  const schema = schemaFor(setting.key);
  editKey.value = setting.key;
  editSchema.value = schema;
  editError.value = null;
  if (schema && isObjectRoot(schema)) {
    editState.value = mergeFormState(buildFormState(schema), setting.value);
  } else if (schema) {
    const v = setting.value;
    editScalar.value =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : "";
  } else {
    editRaw.value = JSON.stringify(setting.value, null, 2) ?? "null";
  }
  editOpen.value = true;
}

async function onSave() {
  let value: unknown;
  if (editSchema.value && isObjectRoot(editSchema.value)) {
    value = cleanFormState(editState.value, editSchema.value);
  } else if (editSchema.value) {
    value = editScalar.value;
    const type = Array.isArray(editSchema.value.type)
      ? editSchema.value.type[0]
      : editSchema.value.type;
    if ((type === "number" || type === "integer") && typeof value === "string" && value !== "") {
      value = Number(value);
    }
  } else {
    // No definition: fall back to raw JSON.
    try {
      value = JSON.parse(editRaw.value);
    } catch {
      editError.value = t("settings.system.invalidJson");
      return;
    }
  }
  editError.value = null;
  saving.value = true;
  try {
    await apertureApi.updateSetting(editKey.value, { value });
    editOpen.value = false;
    toast.add({ title: t("settings.system.saved"), color: "success" });
    await refresh();
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      editError.value = t("settings.system.rejectedValue");
    } else if (err instanceof ApiError && err.status === 404) {
      editError.value = t("settings.system.missingKey");
    } else {
      toast.add({ title: t("settings.system.saveFailed"), color: "error" });
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <UPageCard
      :title="$t('settings.system.title')"
      :description="$t('settings.system.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <p v-if="!isAdmin" class="text-muted text-sm mb-4">
      {{ $t("settings.system.adminOnly") }}
    </p>

    <DataState
      :pending="pending"
      :error="error ? String(error) : null"
      :empty="!data?.length"
      :empty-text="$t('settings.system.empty')"
      :error-text="$t('settings.system.error')"
      :retry-text="$t('common.retry')"
      @retry="refresh()"
    >
      <div class="flex flex-col gap-2">
        <UPageCard v-for="setting in data" :key="setting.key" variant="subtle">
          <div class="flex flex-col gap-2">
            <div class="flex sm:items-center justify-between gap-3">
              <span class="font-mono text-sm truncate">{{ setting.key }}</span>
              <UButton
                v-if="isAdmin"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="$t('settings.system.edit')"
                @click="openEdit(setting)"
              />
            </div>
            <SchemaValue :value="setting.value" :schema="schemaFor(setting.key)" />
          </div>
        </UPageCard>
      </div>
    </DataState>

    <UModal v-model:open="editOpen" :title="editKey">
      <template #body>
        <UForm
          :schema="editZodSchema"
          :state="editState"
          class="flex flex-col gap-4"
          @submit="onSave()"
        >
          <SchemaForm
            v-if="editSchema && isObjectRoot(editSchema)"
            v-model:state="editState"
            :schema="editSchema"
          />
          <UFormField v-else-if="editSchema" :label="$t('settings.system.value')">
            <SchemaField v-model="editScalar" :schema="editSchema" />
          </UFormField>
          <template v-else>
            <p class="text-muted text-xs">{{ $t("settings.system.fallbackJson") }}</p>
            <UFormField
              :label="$t('settings.system.value')"
              :error="editError ?? undefined"
              name="raw"
            >
              <UTextarea
                v-model="editRaw"
                :rows="8"
                class="w-full font-mono text-xs"
                autocomplete="off"
                spellcheck="false"
              />
            </UFormField>
          </template>

          <p v-if="editError && editSchema" class="text-error text-xs">{{ editError }}</p>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="editOpen = false" />
            <UButton type="submit" :loading="saving" :label="$t('common.save')" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

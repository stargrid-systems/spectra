<script setup lang="ts">
import type { Setting } from "~~/modules/aperture/runtime/types";

const { t } = useI18n();
const toast = useToast();
const { isAdmin } = useAuth();

const { data, pending, error, refresh } = await useAsyncData<Setting[]>(
  "settings",
  () => apertureApi.listSettings(),
  { server: false },
);

function valuePreview(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

// Edit modal with a JSON editor; values are arbitrary JSON, so the text is
// parsed before sending and the server's 400 is surfaced inline.

const editOpen = ref(false);
const editKey = ref("");
const editText = ref("");
const editError = ref<string | null>(null);
const saving = ref(false);

function openEdit(setting: Setting) {
  editKey.value = setting.key;
  editText.value = JSON.stringify(setting.value, null, 2) ?? "null";
  editError.value = null;
  editOpen.value = true;
}

async function onSave() {
  let parsed: unknown;
  try {
    parsed = JSON.parse(editText.value);
  } catch {
    editError.value = t("settings.system.invalidJson");
    return;
  }
  editError.value = null;
  saving.value = true;
  try {
    await apertureApi.updateSetting(editKey.value, { value: parsed });
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
          <div class="flex sm:items-center justify-between gap-3">
            <div class="flex flex-col min-w-0">
              <span class="font-mono text-sm truncate">{{ setting.key }}</span>
              <span
                class="text-muted text-xs font-mono truncate"
                :title="valuePreview(setting.value)"
              >
                {{ valuePreview(setting.value) }}
              </span>
            </div>
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
        </UPageCard>
      </div>
    </DataState>

    <UModal v-model:open="editOpen" :title="editKey">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField
            :label="$t('settings.system.value')"
            :error="editError ?? undefined"
            name="value"
          >
            <UTextarea
              v-model="editText"
              :rows="8"
              class="w-full font-mono text-xs"
              autocomplete="off"
              spellcheck="false"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="editOpen = false" />
            <UButton :loading="saving" :label="$t('common.save')" @click="onSave()" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent, SelectMenuItem } from "@nuxt/ui";
import type { ApiKey, CreatedApiKey } from "~~/modules/aperture/runtime/types";
import { createApiKeySchema, type CreateApiKeyValues } from "~/utils/auth";

const { t } = useI18n();
const toast = useToast();
const formatter = useFormatter();
const { isAdmin } = useAuth();

const {
  items: keys,
  pending,
  error,
  hasNext,
  hasPrev,
  loadNext,
  loadPrev,
  reload: refresh,
} = useCursorPager<ApiKey>((query) => apertureApi.listApiKeys(query));

const createOpen = ref(false);
const createState = reactive({ name: "", role: undefined as CreateApiKeyValues["role"] });
const creating = ref(false);

const createdKey = ref<CreatedApiKey | null>(null);
const copied = ref(false);

const roleItems = computed<SelectMenuItem[]>(() => [
  { label: t("auth.apiKeys.noRole"), value: undefined },
  ...(["admin", "operator", "viewer"] as const).map((r) => ({
    label: t(`auth.roles.${r}`),
    value: r,
  })),
]);

async function onCreate(event: FormSubmitEvent<CreateApiKeyValues>) {
  creating.value = true;
  try {
    createdKey.value = await apertureApi.createApiKey(event.data);
    await refresh();
    createOpen.value = false;
    createState.name = "";
    createState.role = undefined;
    copied.value = false;
  } catch {
    toast.add({ title: t("auth.apiKeys.createFailed"), color: "error" });
  } finally {
    creating.value = false;
  }
}

async function onDelete(key: ApiKey) {
  try {
    await apertureApi.deleteApiKey(key.id);
    await refresh();
    toast.add({ title: t("auth.apiKeys.deleted"), color: "success" });
  } catch {
    toast.add({ title: t("auth.apiKeys.deleteFailed"), color: "error" });
  }
}

async function copyKey() {
  if (!createdKey.value) return;
  await navigator.clipboard.writeText(createdKey.value.key);
  copied.value = true;
}

function formatLastUsed(value: ApiKey["last_used_at"]): string {
  return value ? formatter.date(Temporal.Instant.from(value)) : t("auth.apiKeys.neverUsed");
}
</script>

<template>
  <div>
    <DataState
      :pending="pending && keys.length === 0"
      :error="error ? String(error) : null"
      @retry="refresh"
    >
      <div class="flex justify-end mb-4">
        <UButton
          v-if="isAdmin"
          icon="i-lucide-plus"
          :label="$t('auth.apiKeys.create')"
          @click="createOpen = true"
        />
      </div>

      <p v-if="!isAdmin" class="text-muted text-sm mb-4">{{ $t("auth.apiKeys.adminOnly") }}</p>

      <div class="flex flex-col gap-2">
        <UPageCard v-for="k in keys" :key="k.id" variant="subtle">
          <div class="flex sm:items-center justify-between gap-3">
            <div class="flex flex-col">
              <span class="font-medium">{{ k.name }}</span>
              <span class="text-muted text-xs font-mono">{{ k.prefix }}...</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-muted text-xs">{{ formatLastUsed(k.last_used_at) }}</span>
              <UButton icon="i-lucide-trash" color="error" variant="ghost" @click="onDelete(k)" />
            </div>
          </div>
        </UPageCard>
      </div>

      <PagerBar
        :has-prev="hasPrev"
        :has-next="hasNext"
        :pending="pending"
        :prev-text="$t('common.prev')"
        :next-text="$t('common.next')"
        @prev="loadPrev"
        @next="loadNext"
      />
    </DataState>

    <UModal v-model:open="createOpen" :title="$t('auth.apiKeys.create')">
      <template #body>
        <UForm
          :schema="createApiKeySchema"
          :state="createState"
          class="flex flex-col gap-4"
          @submit="onCreate"
        >
          <UFormField :label="$t('auth.apiKeys.name')" name="name">
            <UInput v-model="createState.name" autofocus class="w-full" />
          </UFormField>

          <UFormField :label="$t('auth.apiKeys.role')" name="role">
            <USelectMenu
              v-model="createState.role"
              :items="roleItems"
              value-attribute="value"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="createOpen = false" />
            <UButton type="submit" :loading="creating" :label="$t('common.create')" />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal
      :open="createdKey !== null"
      :title="$t('auth.apiKeys.created')"
      @update:open="
        (v) => {
          if (!v) createdKey = null;
        }
      "
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert color="warning" variant="subtle" :title="$t('auth.apiKeys.keyWarning')" />
          <div class="flex items-center gap-2">
            <UInput :model-value="createdKey?.key" readonly class="flex-1 font-mono" />
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied ? 'success' : 'neutral'"
              @click="copyKey"
            />
          </div>
          <div class="flex justify-end">
            <UButton :label="$t('common.done')" @click="createdKey = null" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { setupSchema, type SetupValues } from "~/utils/auth";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();
const { setupAdmin } = useAuth();

const state = reactive({ username: "", password: "", confirmPassword: "" });
const errorMessage = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<SetupValues>) {
  errorMessage.value = null;
  if (event.data.password !== event.data.confirmPassword) {
    errorMessage.value = t("auth.setup.passwordsMismatch");
    return;
  }
  loading.value = true;
  try {
    await setupAdmin(event.data.username, event.data.password);
    await navigateTo(localePath("/"));
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      await navigateTo(localePath("/login"));
      return;
    }
    errorMessage.value = t("auth.setup.failed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UPageCard variant="subtle">
    <div class="flex flex-col gap-1 mb-4">
      <h2 class="text-lg font-semibold">{{ $t("auth.setup.title") }}</h2>
      <p class="text-muted text-sm">{{ $t("auth.setup.subtitle") }}</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

    <UForm :schema="setupSchema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
      <UFormField :label="$t('auth.setup.username')" name="username">
        <UInput v-model="state.username" autofocus autocomplete="username" class="w-full" />
      </UFormField>

      <UFormField :label="$t('auth.setup.password')" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.setup.confirmPassword')" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" block :loading="loading" :label="$t('auth.setup.submit')" />
    </UForm>
  </UPageCard>
</template>

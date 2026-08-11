<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { changePasswordSchema, type ChangePasswordValues } from "~/utils/auth";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();
const { changePassword } = useAuth();

const state = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const errorMessage = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<ChangePasswordValues>) {
  errorMessage.value = null;
  if (event.data.newPassword !== event.data.confirmPassword) {
    errorMessage.value = t("auth.changePassword.passwordsMismatch");
    return;
  }
  if (event.data.newPassword === event.data.currentPassword) {
    errorMessage.value = t("auth.changePassword.passwordReuse");
    return;
  }
  loading.value = true;
  try {
    await changePassword(event.data.currentPassword, event.data.newPassword);
    await navigateTo(localePath("/"));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      errorMessage.value = t("auth.changePassword.wrongCurrent");
    } else {
      errorMessage.value = t("auth.changePassword.failed");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UPageCard variant="subtle">
    <div class="flex flex-col gap-1 mb-4">
      <h2 class="text-lg font-semibold">{{ $t("auth.changePassword.title") }}</h2>
      <p class="text-muted text-sm">{{ $t("auth.changePassword.subtitle") }}</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

    <UForm
      :schema="changePasswordSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField :label="$t('auth.changePassword.current')" name="currentPassword">
        <UInput
          v-model="state.currentPassword"
          type="password"
          autofocus
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.changePassword.new')" name="newPassword">
        <UInput
          v-model="state.newPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
        <PasswordRequirements :value="state.newPassword" />
      </UFormField>

      <UFormField :label="$t('auth.changePassword.confirm')" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" block :loading="loading" :label="$t('auth.changePassword.submit')" />
    </UForm>
  </UPageCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { loginSchema, type LoginValues } from "~/utils/auth";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();
const { login } = useAuth();

const state = reactive({ username: "", password: "" });
const errorMessage = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<LoginValues>) {
  errorMessage.value = null;
  loading.value = true;
  try {
    await login(event.data.username, event.data.password);
    await navigateTo(localePath("/"));
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError && err.status === 429
        ? t("auth.login.tooManyAttempts")
        : t("auth.login.invalidCredentials");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UPageCard variant="subtle">
    <div class="flex flex-col gap-1 mb-4">
      <h2 class="text-lg font-semibold">{{ $t("auth.login.title") }}</h2>
      <p class="text-muted text-sm">{{ $t("auth.login.subtitle") }}</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

    <UForm :schema="loginSchema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
      <UFormField :label="$t('auth.login.username')" name="username">
        <UInput v-model="state.username" autofocus autocomplete="username" class="w-full" />
      </UFormField>

      <UFormField :label="$t('auth.login.password')" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" block :loading="loading" :label="$t('auth.login.submit')" />
    </UForm>
  </UPageCard>
</template>

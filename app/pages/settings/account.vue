<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { changePasswordSchema, type ChangePasswordValues } from "~/utils/auth";

const { t } = useI18n();
const toast = useToast();
const { user, changePassword } = useAuth();

const state = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<ChangePasswordValues>) {
  if (event.data.newPassword !== event.data.confirmPassword) {
    toast.add({ title: t("auth.changePassword.passwordsMismatch"), color: "error" });
    return;
  }
  if (event.data.newPassword === event.data.currentPassword) {
    toast.add({ title: t("auth.changePassword.passwordReuse"), color: "error" });
    return;
  }
  loading.value = true;
  try {
    await changePassword(event.data.currentPassword, event.data.newPassword);
    state.currentPassword = "";
    state.newPassword = "";
    state.confirmPassword = "";
    toast.add({ title: t("auth.changePassword.success"), color: "success" });
  } catch (err) {
    toast.add({
      title:
        err instanceof ApiError && err.status === 401
          ? t("auth.changePassword.wrongCurrent")
          : t("auth.changePassword.failed"),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UPageCard
      :title="$t('auth.account.title')"
      :description="$t('auth.account.description')"
      variant="naked"
    />

    <UPageCard v-if="user" variant="subtle">
      <div class="flex flex-col gap-3">
        <div class="flex max-sm:flex-col justify-between items-start gap-2">
          <span class="text-muted">{{ $t("auth.account.username") }}</span>
          <span class="font-medium">{{ user.username ?? user.display_name }}</span>
        </div>
        <USeparator />
        <div class="flex max-sm:flex-col justify-between items-start gap-2">
          <span class="text-muted">{{ $t("auth.account.role") }}</span>
          <UBadge v-if="user.role" :label="$t(`auth.roles.${user.role}`)" variant="subtle" />
        </div>
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
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
        </UFormField>

        <UFormField :label="$t('auth.changePassword.confirm')" name="confirmPassword">
          <UInput
            v-model="state.confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <div>
          <UButton type="submit" :loading="loading" :label="$t('auth.changePassword.submit')" />
        </div>
      </UForm>
    </UPageCard>
  </div>
</template>

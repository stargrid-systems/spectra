<script setup lang="ts">
import type { FormSubmitEvent, SelectMenuItem } from "@nuxt/ui";
import type { User } from "~~/modules/aperture/runtime/types";
import { createUserSchema, type CreateUserValues, ROLES } from "~/utils/auth";

const { t } = useI18n();
const toast = useToast();
const { user: currentUser } = useAuth();

const {
  items: users,
  pending,
  error,
  hasNext,
  hasPrev,
  loadNext,
  loadPrev,
  reload: refresh,
} = useCursorPager<User>((query) => apertureApi.listUsers(query));

const createOpen = ref(false);
const createState = reactive({
  username: "",
  password: "",
  role: "operator" as CreateUserValues["role"],
});
const creating = ref(false);

const roleItems = computed<SelectMenuItem[]>(() =>
  ROLES.map((r) => ({
    label: t(`auth.roles.${r}`),
    value: r,
  })),
);

async function onCreate(event: FormSubmitEvent<CreateUserValues>) {
  creating.value = true;
  try {
    await apertureApi.createUser(event.data);
    await refresh();
    createOpen.value = false;
    createState.username = "";
    createState.password = "";
    createState.role = "operator";
    toast.add({ title: t("auth.users.created"), color: "success" });
  } catch {
    toast.add({ title: t("auth.users.createFailed"), color: "error" });
  } finally {
    creating.value = false;
  }
}

async function onDelete(target: User) {
  try {
    await apertureApi.deleteUser(target.id);
    await refresh();
    toast.add({ title: t("auth.users.deleted"), color: "success" });
  } catch {
    toast.add({ title: t("auth.users.deleteFailed"), color: "error" });
  }
}
</script>

<template>
  <div>
    <DataState
      :pending="pending && users.length === 0"
      :error="error ? String(error) : null"
      @retry="refresh"
    >
      <div class="flex justify-end mb-4">
        <UButton icon="i-lucide-plus" :label="$t('auth.users.create')" @click="createOpen = true" />
      </div>

      <div class="flex flex-col gap-2">
        <UPageCard v-for="u in users" :key="u.id" variant="subtle">
          <div class="flex sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <UAvatar :src="userAvatarUrl(u.id)" :alt="u.username" size="sm" />
              <div class="flex flex-col min-w-0">
                <span class="font-medium truncate">{{ u.username }}</span>
                <span class="text-muted text-xs">{{ u.id }}</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <UBadge
                v-if="u.must_change_password"
                :label="$t('auth.users.mustChange')"
                color="warning"
                variant="subtle"
              />
              <UButton
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                :disabled="u.actor_id === currentUser?.actor_id"
                @click="onDelete(u)"
              />
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

    <UModal v-model:open="createOpen" :title="$t('auth.users.create')">
      <template #body>
        <UForm
          :schema="createUserSchema"
          :state="createState"
          class="flex flex-col gap-4"
          @submit="onCreate"
        >
          <UFormField :label="$t('auth.users.username')" name="username">
            <UInput v-model="createState.username" autofocus class="w-full" />
          </UFormField>

          <UFormField :label="$t('auth.users.password')" name="password">
            <UInput
              v-model="createState.password"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
            <PasswordRequirements :value="createState.password" />
          </UFormField>

          <UFormField :label="$t('auth.users.role')" name="role">
            <USelectMenu
              v-model="createState.role"
              :items="roleItems"
              value-key="value"
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
  </div>
</template>

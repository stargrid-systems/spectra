<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const localePath = useLocalePath();
const { isAdmin } = useAuth();

const links = computed(
  () =>
    [
      [
        {
          label: t("settings.nav.general"),
          icon: "i-lucide-sliders-horizontal",
          to: localePath("/settings"),
          exact: true,
        },
        {
          label: t("settings.nav.about"),
          icon: "i-lucide-info",
          to: localePath("/settings/about"),
        },
      ],
      [
        {
          label: t("settings.nav.account"),
          icon: "i-lucide-user-cog",
          to: localePath("/settings/account"),
        },
        {
          label: t("settings.nav.apiKeys"),
          icon: "i-lucide-key",
          to: localePath("/settings/api-keys"),
        },
        ...(isAdmin.value
          ? [
              {
                label: t("settings.nav.users"),
                icon: "i-lucide-users",
                to: localePath("/settings/users"),
              },
              {
                label: t("settings.nav.system"),
                icon: "i-lucide-server",
                to: localePath("/settings/system"),
              },
            ]
          : []),
      ],
    ] satisfies NavigationMenuItem[][],
);
</script>

<template>
  <AppPage :title="$t('settings.title')" body-class="lg:py-12">
    <template #toolbar>
      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-5xl mx-auto px-4">
      <NuxtPage />
    </div>
  </AppPage>
</template>

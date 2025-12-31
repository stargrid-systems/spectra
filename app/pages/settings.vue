<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const localePath = useLocalePath();

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
    ] satisfies NavigationMenuItem[][],
);
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="$t('settings.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div
        class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-5xl mx-auto px-4"
      >
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>

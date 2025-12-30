<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(false);

const links = [
  [
    {
      label: $t("home"),
      icon: "i-lucide-house",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: $t("devices.title"),
      icon: "i-lucide-network",
      to: "/devices",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
  [
    {
      label: $t("developer.title"),
      icon: "i-lucide-terminal-square",
      to: "/developer",
      onSelect: () => {
        open.value = false;
      },
      children: [
        {
          label: $t("developer.logs.title"),
          icon: "i-lucide-list-tree",
          to: "/developer/logs",
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: $t("developer.events.title"),
          icon: "i-lucide-radio",
          to: "/developer/events",
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },
    {
      label: $t("settings.title"),
      icon: "i-lucide-sliders-horizontal",
      to: "/settings",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: "links",
    label: $t("go-to"),
    items: links.flat(),
  },
]);
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          v-if="links[1]?.length"
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>

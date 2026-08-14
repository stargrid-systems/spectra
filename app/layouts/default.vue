<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const open = ref(false);
const { t } = useI18n();
const localePath = useLocalePath();
const { user, logout } = useAuth();

const avatarUrl = computed(() => {
  const id = user.value?.user_id;
  return id ? userAvatarUrl(id) : undefined;
});
const avatarAlt = computed(() => user.value?.username ?? user.value?.display_name ?? "");

const closeSidebar = () => {
  open.value = false;
};

async function signOut() {
  await logout();
  await navigateTo(localePath("/login"));
}

const links = computed(() => [
  [
    {
      label: t("home"),
      icon: "i-lucide-house",
      to: localePath("/"),
      onSelect: closeSidebar,
    },
  ],
  [
    {
      label: t("operations.title"),
      icon: "i-lucide-list-checks",
      to: localePath("/operations/tasks"),
      onSelect: closeSidebar,
      children: [
        {
          label: t("operations.tasks.title"),
          icon: "i-lucide-list-checks",
          to: localePath("/operations/tasks"),
          onSelect: closeSidebar,
        },
        {
          label: t("operations.schedules.title"),
          icon: "i-lucide-calendar-clock",
          to: localePath("/operations/schedules"),
          onSelect: closeSidebar,
        },
        {
          label: t("operations.artifacts.title"),
          icon: "i-lucide-package",
          to: localePath("/operations/artifacts"),
          onSelect: closeSidebar,
        },
      ],
    },
    {
      label: t("developer.title"),
      icon: "i-lucide-terminal-square",
      to: localePath("/developer"),
      onSelect: closeSidebar,
      children: [
        {
          label: t("developer.logs.title"),
          icon: "i-lucide-list-tree",
          to: localePath("/developer/logs"),
          onSelect: closeSidebar,
        },
      ],
    },
    {
      label: t("settings.title"),
      icon: "i-lucide-sliders-horizontal",
      to: localePath("/settings"),
      onSelect: closeSidebar,
    },
  ],
]);

const groups = computed(() => [
  {
    id: "links",
    label: t("go-to"),
    items: links.value.flat(),
  },
]);

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: user.value?.username ?? user.value?.display_name ?? "",
      avatar: {
        src: avatarUrl.value,
        alt: avatarAlt.value,
        icon: avatarUrl.value ? undefined : "i-lucide-user",
      },
      type: "label",
    },
    {
      label: t("auth.menu.account"),
      icon: "i-lucide-user-cog",
      to: localePath("/settings/account"),
      onSelect: closeSidebar,
    },
  ],
  [
    {
      label: t("auth.menu.signOut"),
      icon: "i-lucide-log-out",
      onSelect: signOut,
    },
  ],
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
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

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

      <template #footer="{ collapsed }">
        <UDropdownMenu
          v-if="user"
          :items="userItems"
          :content="{ align: 'start' }"
          :ui="{ content: 'w-56' }"
          class="w-full"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="w-full"
            :class="collapsed ? 'justify-center' : 'justify-start'"
            :block="!collapsed"
          >
            <UAvatar
              :src="avatarUrl"
              :alt="avatarAlt"
              :icon="avatarUrl ? undefined : 'i-lucide-user'"
              size="2xs"
            />
            <span v-if="!collapsed" class="truncate">
              {{ user.username ?? user.display_name }}
            </span>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>

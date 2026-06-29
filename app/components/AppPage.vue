<script setup lang="ts">
const props = defineProps<{
  title: string;
  backTo?: string;
  bodyClass?: string;
}>();

useHead({
  title: computed(() => props.title),
});
</script>

<template>
  <UDashboardPanel :ui="bodyClass ? { body: bodyClass } : undefined">
    <template #header>
      <UDashboardNavbar :title="title" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UButton
            v-if="backTo"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :to="$localePath(backTo)"
          />
          <UDashboardSidebarCollapse v-else />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>

      <slot name="toolbar" />
    </template>

    <template #body>
      <slot />
    </template>
  </UDashboardPanel>
</template>

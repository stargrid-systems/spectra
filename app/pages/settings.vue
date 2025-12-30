<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('settings.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold">{{ $t("settings.title") }}</h2>
          <p class="text-muted-foreground">{{ $t("settings.description") }}</p>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-sliders-horizontal" class="size-5" />
              <span class="font-semibold">{{ $t("settings.quick") }}</span>
            </div>
          </template>
          <div class="space-y-3 text-muted-foreground">
            <p>{{ $t("settings.placeholder") }}</p>
            <p>{{ $t("settings.placeholderDetail") }}</p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar
        :title="$t('developer.logs.title')"
        :ui="{ right: 'gap-3' }"
      >
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
          <h2 class="text-2xl font-semibold">
            {{ $t("developer.logs.title") }}
          </h2>
          <p class="text-muted-foreground">{{ $t("developer.logs.body") }}</p>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-list-tree" class="size-5" />
              <span class="font-semibold">{{
                $t("developer.logs.title")
              }}</span>
            </div>
          </template>
          <p class="text-muted-foreground">{{ $t("developer.description") }}</p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

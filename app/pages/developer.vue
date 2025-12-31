<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('developer.title')" :ui="{ right: 'gap-3' }">
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
          <h2 class="text-2xl font-semibold">{{ $t("developer.title") }}</h2>
          <p class="text-muted-foreground">{{ $t("developer.description") }}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-activity" class="size-5" />
                <span class="font-semibold">{{
                  $t("developer.logs.title")
                }}</span>
              </div>
            </template>
            <p class="text-muted-foreground">{{ $t("developer.logs.body") }}</p>
            <div class="mt-4">
              <UButton
                :to="$localePath('/developer/logs')"
                color="primary"
                variant="soft"
                size="sm"
              >
                {{ $t("developer.logs.title") }}
              </UButton>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-radio" class="size-5" />
                <span class="font-semibold">{{
                  $t("developer.events.title")
                }}</span>
              </div>
            </template>
            <p class="text-muted-foreground">
              {{ $t("developer.events.body") }}
            </p>
            <div class="mt-4">
              <UButton
                :to="$localePath('/developer/events')"
                color="primary"
                variant="soft"
                size="sm"
              >
                {{ $t("developer.events.title") }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

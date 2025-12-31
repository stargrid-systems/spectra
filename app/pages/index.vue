<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('home')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body> Hello World </template>
  </UDashboardPanel>
</template>

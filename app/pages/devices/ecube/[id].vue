<script setup lang="ts">
const route = useRoute();
const deviceId = route.params.id;

// Mock data - replace with API call later
const device = ref({
  id: deviceId,
  type: "ecube",
  name: "Battery Storage eCube",
  status: "online",
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="device.name" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/devices"
          />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="mb-6 flex items-start gap-4">
          <UAvatar icon="i-lucide-battery" color="green" size="xl" />
          <div>
            <h2 class="text-2xl font-semibold">{{ device.name }}</h2>
            <p class="text-muted-foreground">{{ $t("devices.types.ecube") }}</p>
            <UBadge color="success" variant="subtle" class="mt-2">
              {{ $t("devices.status.online") }}
            </UBadge>
          </div>
        </div>

        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t("devices.details.title") }}</h3>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground">
                {{ $t("devices.details.id") }}
              </p>
              <p class="font-medium">{{ deviceId }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                {{ $t("devices.details.type") }}
              </p>
              <p class="font-medium">{{ $t("devices.types.ecube") }}</p>
            </div>
            <div class="text-muted-foreground">
              <p>{{ $t("devices.details.placeholder") }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
interface Device {
  id: string;
  type: "meter" | "ecube" | "inverter";
  name: string;
}

// Mock data - replace with API calls to EnergyBridge later
const devices = ref<Device[]>([
  { id: "1", type: "meter", name: "Main Energy Meter" },
  { id: "2", type: "meter", name: "Solar Production Meter" },
  { id: "3", type: "ecube", name: "Battery Storage eCube" },
  { id: "4", type: "inverter", name: "Solar Inverter 1" },
  { id: "5", type: "inverter", name: "Solar Inverter 2" },
]);

// Device type configuration
const deviceConfig = {
  meter: {
    icon: "i-lucide-gauge",
    color: "blue" as const,
  },
  ecube: {
    icon: "i-lucide-battery",
    color: "green" as const,
  },
  inverter: {
    icon: "i-lucide-zap",
    color: "amber" as const,
  },
};

const getDeviceIcon = (type: Device["type"]) => deviceConfig[type].icon;
const getDeviceColor = (type: Device["type"]) => deviceConfig[type].color;
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('devices.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="mb-6">
          <h2 class="text-2xl font-semibold mb-2">{{ $t("devices.title") }}</h2>
          <p class="text-muted-foreground">{{ $t("devices.description") }}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="device in devices"
            :key="device.id"
            :to="$localePath(`/devices/${device.type}/${device.id}`)"
            class="block"
          >
            <UCard
              class="hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              :ui="{ body: 'space-y-3' }"
            >
              <div class="flex items-start gap-4">
                <UAvatar
                  :icon="getDeviceIcon(device.type)"
                  :color="getDeviceColor(device.type)"
                  size="lg"
                />
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-lg truncate">
                    {{ device.name }}
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ $t(`devices.types.${device.type}`) }}
                  </p>
                </div>
              </div>

              <div
                class="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <UIcon name="i-lucide-circle-dot" class="size-4" />
                <span>{{ $t("devices.status.online") }}</span>
              </div>
            </UCard>
          </NuxtLink>
        </div>

        <div v-if="devices.length === 0" class="text-center py-12">
          <UIcon
            name="i-lucide-inbox"
            class="size-12 mx-auto mb-4 text-muted-foreground"
          />
          <p class="text-muted-foreground">{{ $t("devices.empty") }}</p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

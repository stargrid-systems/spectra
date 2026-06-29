<script setup lang="ts">
import { deviceConfig, isDeviceType } from "~/utils/devices";

const typeParam = useRouteParam("type");
const idParam = useRouteParam("id");

definePageMeta({
  validate: (route) => {
    const type = route.params.type;
    return typeof type === "string" && isDeviceType(type);
  },
});

const deviceType = computed(() => {
  const type = typeParam.value;
  return isDeviceType(type) ? type : null;
});

const { data: device, status, error } = useDevice(deviceType.value ?? "meter", idParam.value);

const config = computed(() => (deviceType.value ? deviceConfig[deviceType.value] : null));

const statusColor = computed(() => (device.value?.status === "online" ? "success" : "error"));
</script>

<template>
  <AppPage :title="device?.name ?? ''" back-to="/devices">
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="error || !device" class="text-center py-12 text-error">
      <p>{{ $t("devices.error") }}</p>
    </div>

    <div v-else class="p-6 space-y-6">
      <div class="flex items-start gap-4">
        <UAvatar :icon="config!.icon" :color="config!.color" size="xl" />
        <div>
          <h2 class="text-2xl font-semibold">{{ device.name }}</h2>
          <p class="text-muted-foreground">
            {{ $t(`devices.types.${device.type}`) }}
          </p>
          <UBadge :color="statusColor" variant="subtle" class="mt-2">
            {{ $t(`devices.status.${device.status}`) }}
          </UBadge>
        </div>
      </div>

      <DevicesMeterChart v-if="device.type === 'meter'" :device-id="device.id" />

      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t("devices.details.title") }}</h3>
        </template>

        <div class="space-y-4">
          <div>
            <p class="text-sm text-muted-foreground">
              {{ $t("devices.details.id") }}
            </p>
            <p class="font-medium">{{ device.id }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">
              {{ $t("devices.details.type") }}
            </p>
            <p class="font-medium">{{ $t(`devices.types.${device.type}`) }}</p>
          </div>
          <div class="text-muted-foreground">
            <p>{{ $t("devices.details.placeholder") }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </AppPage>
</template>

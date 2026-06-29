<script setup lang="ts">
import { deviceConfig } from "~/utils/devices";

const { data: devices, status, error } = useDevices();
</script>

<template>
  <AppPage :title="$t('devices.title')">
    <div class="p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-semibold mb-2">{{ $t("devices.title") }}</h2>
        <p class="text-muted-foreground">{{ $t("devices.description") }}</p>
      </div>

      <div v-if="status === 'pending'" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="error" class="text-center py-12 text-error">
        <p>{{ $t("devices.error") }}</p>
      </div>

      <template v-else>
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
                  :icon="deviceConfig[device.type].icon"
                  :color="deviceConfig[device.type].color"
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

              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <UIcon name="i-lucide-circle-dot" class="size-4" />
                <span>{{ $t(`devices.status.${device.status}`) }}</span>
              </div>
            </UCard>
          </NuxtLink>
        </div>

        <div v-if="devices?.length === 0" class="text-center py-12">
          <UIcon name="i-lucide-inbox" class="size-12 mx-auto mb-4 text-muted-foreground" />
          <p class="text-muted-foreground">{{ $t("devices.empty") }}</p>
        </div>
      </template>
    </div>
  </AppPage>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const spectraVersion = runtimeConfig.public.appVersion ?? "0.0.0";

const { data: apertureData, status: apertureStatus } = useApertureVersion();
const apertureVersion = computed(() => apertureData.value?.aperture ?? "—");
</script>

<template>
  <div>
    <UPageCard
      :title="$t('settings.sections.about.title')"
      :description="$t('settings.sections.about.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <div class="space-y-4">
        <div
          class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
        >
          <span class="text-muted-foreground">{{
            $t("settings.sections.about.spectraVersion")
          }}</span>
          <UBadge variant="soft" color="primary">v{{ spectraVersion }}</UBadge>
        </div>

        <div
          class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
        >
          <span class="text-muted-foreground">{{
            $t("settings.sections.about.apertureVersion")
          }}</span>
          <div v-if="apertureStatus === 'pending'" class="flex items-center gap-2">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-muted-foreground"
            />
          </div>
          <UBadge v-else variant="soft" color="neutral">{{ apertureVersion }}</UBadge>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

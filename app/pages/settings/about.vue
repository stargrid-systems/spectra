<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const version = runtimeConfig.public.appVersion ?? "0.0.0";
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
            $t("settings.sections.about.version")
          }}</span>
          <UBadge variant="soft" color="primary">v{{ version }}</UBadge>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

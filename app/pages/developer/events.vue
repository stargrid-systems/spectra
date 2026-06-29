<template>
  <AppPage :title="$t('developer.events.title')">
    <div class="p-6 space-y-6">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold">
          {{ $t("developer.events.title") }}
        </h2>
        <p class="text-muted-foreground">{{ $t("developer.events.body") }}</p>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-broadcast" class="size-5" />
            <span class="font-semibold">{{ $t("developer.events.title") }}</span>
          </div>
        </template>
        <p class="text-muted-foreground">{{ $t("developer.description") }}</p>
      </UCard>
    </div>
  </AppPage>
</template>

<template>
  <UTooltip :text="$t('notifications')" :shortcuts="['N']">
    <UButton color="neutral" variant="ghost" square>
      <UChip color="error" inset>
        <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>

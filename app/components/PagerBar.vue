<script setup lang="ts">
defineProps<{
  hasPrev: boolean;
  hasNext: boolean;
  pending?: boolean;
  prevText?: string;
  nextText?: string;
}>();

defineEmits<{ prev: []; next: [] }>();
</script>

<template>
  <div class="flex items-center justify-center gap-3 py-2">
    <UButton
      size="sm"
      color="neutral"
      variant="outline"
      icon="i-lucide-chevron-left"
      :label="prevText"
      :disabled="!hasPrev || pending"
      @click="$emit('prev')"
    />
    <LoadingSpinner v-if="pending" class="size-4 text-muted-foreground" />
    <UButton
      size="sm"
      color="neutral"
      variant="outline"
      icon-right="i-lucide-chevron-right"
      :label="nextText"
      :disabled="!hasNext || pending"
      @click="$emit('next')"
    />
  </div>
</template>

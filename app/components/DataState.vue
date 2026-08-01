<script setup lang="ts">
defineProps<{
  pending?: boolean;
  error?: unknown;
  empty?: boolean;
  emptyText?: string;
  errorText?: string;
  retryText?: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="pending" class="flex justify-center py-12">
    <LoadingSpinner class="size-6 text-muted-foreground" />
  </div>
  <div v-else-if="error" class="text-center py-12 text-error">
    <p>{{ errorText }}</p>
    <UButton
      v-if="retryText"
      variant="soft"
      color="primary"
      size="sm"
      :label="retryText"
      class="mt-2"
      @click="$emit('retry')"
    />
  </div>
  <div v-else-if="empty" class="text-center py-12 text-muted-foreground">
    <p>{{ emptyText }}</p>
  </div>
  <slot v-else />
</template>

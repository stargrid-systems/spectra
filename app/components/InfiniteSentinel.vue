<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";

defineProps<{
  loading?: boolean;
  text?: string;
}>();

const emit = defineEmits<{ visible: [] }>();

const el = useTemplateRef("el");

const { stop } = useIntersectionObserver(
  el,
  ([entry]) => {
    if (entry?.isIntersecting) emit("visible");
  },
  { rootMargin: "80px" },
);

onUnmounted(stop);
</script>

<template>
  <div ref="el" class="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
    <LoadingSpinner v-if="loading" class="size-3.5" />
    <span v-else>{{ text }}</span>
  </div>
</template>

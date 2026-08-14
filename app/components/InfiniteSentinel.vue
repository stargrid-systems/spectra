<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";

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
  <div ref="el" class="flex items-center justify-center py-2">
    <LoadingSpinner class="size-4 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { useLogsContext } from "~/composables/useLogsContext";

withDefaults(defineProps<{ level: string; size?: "sm" | "xs" }>(), { size: "sm" });

const { levelColors } = useLogsContext();
</script>

<template>
  <UBadge :color="levelColors[level] ?? 'neutral'" variant="subtle" :size="size" class="font-mono">
    {{ level }}
  </UBadge>
</template>

<script setup lang="ts">
defineProps<{
  fields?: Record<string, unknown>;
  inline?: boolean;
}>();
</script>

<template>
  <span v-if="inline && fields" class="text-muted-foreground font-mono text-xs ms-2">
    {{ formatFieldsInline(fields) }}
  </span>
  <div v-else>
    <div class="text-xs font-semibold text-muted-foreground mb-1">
      {{ $t("developer.logs.fields") }}
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs font-mono">
      <div v-for="entry in sortedFields(fields ?? {})" :key="entry.key" class="flex gap-2">
        <span class="text-muted-foreground">{{ entry.key }}:</span>
        <span>{{ formatValue(entry.value) }}</span>
      </div>
      <div v-if="sortedFields(fields ?? {}).length === 0" class="text-muted-foreground col-span-2">
        {{ $t("developer.logs.noFields") }}
      </div>
    </div>
  </div>
</template>

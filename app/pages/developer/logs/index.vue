<script setup lang="ts">
definePageMeta({
  middleware: [
    () => {
      const localePath = useLocalePath();
      return navigateTo(localePath("/developer/logs/events"));
    },
  ],
});
</script>

<template>
  <div />
</template>

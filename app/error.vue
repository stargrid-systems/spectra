<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";
import type { NuxtError } from "#app";

defineProps<{
  error: NuxtError;
}>();

const { locale } = useI18n();

const lang = computed(() => locales[locale.value].code);
const dir = computed(() => locales[locale.value].dir);

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
});
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <UContainer>
        <UError :error="error" />
      </UContainer>
    </NuxtLayout>
  </UApp>
</template>

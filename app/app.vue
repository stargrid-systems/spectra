<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";

const { t, locale } = useI18n();

const lang = computed(() => locales[locale.value].code);
const dir = computed(() => locales[locale.value].dir);

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
  titleTemplate: (title) => (title ? t("app.titleWithPage", { page: title }) : t("app.name")),
});

useSeoMeta({
  description: computed(() => t("app.description")),
});
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

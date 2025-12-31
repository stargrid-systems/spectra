<script setup lang="ts">
import * as allLocales from "@nuxt/ui/locale";

const { locale, setLocale, availableLocales } = useI18n();

const locales = computed(() => availableLocales.map((loc) => allLocales[loc]));

type AvailableLocale = (typeof availableLocales)[number];

const isAvailableLocale = (value: string): value is AvailableLocale =>
  (availableLocales as string[]).includes(value);

const handleLocaleChange = (value: string) => {
  if (isAvailableLocale(value)) {
    setLocale(value);
  }
};
</script>

<template>
  <form>
    <UPageCard
      :title="$t('settings.sections.dashboard.title')"
      :description="$t('settings.sections.dashboard.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        :label="$t('settings.sections.dashboard.theme.label')"
        :description="$t('settings.sections.dashboard.theme.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UColorModeSelect />
      </UFormField>

      <USeparator />

      <UFormField
        :label="$t('settings.sections.dashboard.locale.label')"
        :description="$t('settings.sections.dashboard.locale.description')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <ULocaleSelect
          :model-value="locale"
          :locales="locales"
          @update:model-value="handleLocaleChange"
        />
      </UFormField>
    </UPageCard>
  </form>
</template>

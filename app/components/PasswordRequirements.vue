<script setup lang="ts">
import { PASSWORD_MIN, passwordRequirements } from "~/utils/auth";

const props = defineProps<{ value: string }>();
const { t } = useI18n();

const items = computed(() =>
  passwordRequirements(props.value).map((rule) => ({
    key: rule.key,
    satisfied: rule.satisfied,
    label: t(`auth.passwordRequirements.${rule.key}`, { n: PASSWORD_MIN }),
  })),
);
</script>

<template>
  <ul class="flex flex-col gap-1 mt-2 text-sm">
    <li
      v-for="item in items"
      :key="item.key"
      class="flex items-center gap-1.5"
      :class="item.satisfied ? 'text-success' : 'text-muted-foreground'"
    >
      <UIcon :name="item.satisfied ? 'i-lucide-circle-check' : 'i-lucide-circle'" class="size-4" />
      <span>{{ item.label }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  items: SelectMenuItem[];
  loading?: boolean;
  hasMore?: boolean;
}>();

const emit = defineEmits<{ loadMore: [] }>();

const SENTINEL = "__infinite-more__";

const itemsWithSentinel = computed<SelectMenuItem[]>(() => [
  ...props.items,
  ...(props.hasMore ? [{ label: "", value: SENTINEL, disabled: true }] : []),
]);

function isSentinel(item: unknown): boolean {
  return (item as { value?: unknown } | null)?.value === SENTINEL;
}

const slots = useSlots();

const sentinelEl = ref<HTMLElement | null>(null);

function setSentinelEl(el: Element | ComponentPublicInstance | null): void {
  sentinelEl.value = el instanceof HTMLElement ? el : null;
}

// The sentinel is keyed on the item count so it is recreated whenever a page
// is appended. A fresh observer then re-checks intersection, which keeps
// loading until the viewport can actually scroll.
watch(sentinelEl, (el, _, onCleanup) => {
  if (!el) return;
  const root = el.closest('[data-slot="viewport"]');
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && props.hasMore && !props.loading) {
        emit("loadMore");
      }
    },
    { root, rootMargin: "40px" },
  );
  io.observe(el);
  onCleanup(() => io.disconnect());
});
</script>

<template>
  <USelectMenu :items="itemsWithSentinel" v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <template v-if="name === 'item'">
        <div
          v-if="isSentinel(slotProps.item)"
          :key="items.length"
          :ref="setSentinelEl"
          class="flex items-center justify-center py-2"
        >
          <LoadingSpinner class="size-4 text-muted-foreground" />
        </div>
        <slot v-else name="item" v-bind="slotProps" />
      </template>
      <slot v-else :name="name" v-bind="slotProps ?? {}" />
    </template>
  </USelectMenu>
</template>

import type { Ref } from "vue";
import type { CursorPage } from "~/composables/useCursorPager";

/**
 * Append-mode cursor pagination: accumulates pages with `loadMore` until
 * `next_cursor` runs out. Param changes reset to the first page.
 */
export function useInfiniteList<T, P extends object = Record<string, never>>(
  fetchPage: (query: P) => Promise<CursorPage<T>>,
  params?: () => P | undefined,
  options?: { limit?: number },
) {
  const items = ref<T[]>([]) as Ref<T[]>;
  // undefined = not loaded yet, null = exhausted.
  const nextCursor = ref<string | null | undefined>(undefined);
  const pending = ref(false);
  const loadingMore = ref(false);
  const error = ref<unknown>(null);
  let gen = 0;

  async function loadFirst() {
    const myGen = ++gen;
    pending.value = true;
    error.value = null;
    try {
      const query: P = Object.assign({}, params?.(), { limit: options?.limit });
      const page = await fetchPage(query);
      if (myGen !== gen) return;
      items.value = page.items;
      nextCursor.value = page.next_cursor ?? null;
    } catch (err) {
      if (myGen !== gen) return;
      error.value = err;
    } finally {
      if (myGen === gen) pending.value = false;
    }
  }

  async function loadMore() {
    const cursor = nextCursor.value;
    if (cursor == null || loadingMore.value || pending.value) return;
    const myGen = ++gen;
    loadingMore.value = true;
    try {
      const query: P = Object.assign({}, params?.(), { cursor, limit: options?.limit });
      const page = await fetchPage(query);
      if (myGen !== gen) return;
      items.value = [...items.value, ...page.items];
      nextCursor.value = page.next_cursor ?? null;
    } catch (err) {
      if (myGen !== gen) return;
      console.error("Failed to load more items", err);
    } finally {
      if (myGen === gen) loadingMore.value = false;
    }
  }

  const hasMore = computed(() => nextCursor.value != null);

  function reload() {
    void loadFirst();
  }

  if (import.meta.client) {
    const paramsKey = computed(() => JSON.stringify(params?.() ?? null));
    watch(paramsKey, () => void loadFirst(), { immediate: true });
  }

  return { items, nextCursor, pending, loadingMore, error, hasMore, loadMore, reload };
}

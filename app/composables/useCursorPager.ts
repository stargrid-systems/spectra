import type { Ref } from "vue";

export interface CursorPage<T> {
  items: T[];
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export type PageQuery = { cursor?: string; limit?: number };

/**
 * Replace-mode cursor pagination: holds one page at a time and moves it with
 * `next_cursor` / `prev_cursor` from the server.
 */
export function useCursorPager<T, P extends object = Record<string, never>>(
  fetchPage: (query: P) => Promise<CursorPage<T>>,
  params?: () => P | undefined,
  options?: { limit?: number },
) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const pending = ref(false);
  const error = ref<unknown>(null);
  const nextCursor = ref<string | null>(null);
  const prevCursor = ref<string | null>(null);
  const currentCursor = ref<string | undefined>(undefined);
  let gen = 0;

  async function load(cursor?: string) {
    const myGen = ++gen;
    pending.value = true;
    error.value = null;
    try {
      const query: P = Object.assign({}, params?.(), { cursor, limit: options?.limit });
      const page = await fetchPage(query);
      if (myGen !== gen) return;
      items.value = page.items;
      nextCursor.value = page.next_cursor ?? null;
      prevCursor.value = page.prev_cursor ?? null;
      currentCursor.value = cursor;
    } catch (err) {
      if (myGen !== gen) return;
      error.value = err;
    } finally {
      if (myGen === gen) pending.value = false;
    }
  }

  const hasNext = computed(() => nextCursor.value !== null);
  const hasPrev = computed(() => prevCursor.value !== null);

  function loadNext() {
    if (nextCursor.value === null) return;
    void load(nextCursor.value);
  }

  function loadPrev() {
    if (prevCursor.value === null) return;
    void load(prevCursor.value);
  }

  function reload() {
    void load(currentCursor.value);
  }

  if (import.meta.client) {
    const paramsKey = computed(() => JSON.stringify(params?.() ?? null));
    watch(paramsKey, () => void load(undefined), { immediate: true });
  }

  return { items, pending, error, hasNext, hasPrev, loadNext, loadPrev, reload };
}

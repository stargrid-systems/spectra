export type QueryValue = string | string[] | undefined;

export interface QueryFieldConfig<T> {
  key: string;
  parse: (value: QueryValue) => T;
  serialize: (value: T) => QueryValue;
}

export type QuerySchema<T> = { [K in keyof T]: QueryFieldConfig<T[K]> };

export function useRouteQueryState<T extends object>(schema: QuerySchema<T>): T {
  const route = useRoute();
  const router = useRouter();

  function toQueryValue(raw: unknown): QueryValue {
    if (raw == null) return undefined;
    if (Array.isArray(raw)) return raw.filter((v): v is string => v != null);
    return raw as string;
  }

  function readFromQuery(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field in schema) {
      const config = schema[field]!;
      result[field] = config.parse(toQueryValue(route.query[config.key]));
    }
    return result;
  }

  function writeToQuery(): Record<string, QueryValue> {
    const query: Record<string, QueryValue> = {};
    const source = state as Record<string, unknown>;
    for (const field in schema) {
      const config = schema[field]! as QueryFieldConfig<unknown>;
      const serialized = config.serialize(source[field]);
      if (serialized !== undefined) {
        query[config.key] = serialized;
      }
    }
    return query;
  }

  const state = reactive(readFromQuery()) as T;

  let skipRouteWatch = false;

  watch(
    state,
    () => {
      skipRouteWatch = true;
      void router.replace({ query: writeToQuery() });
    },
    { deep: true },
  );

  watch(
    () => route.query,
    () => {
      if (skipRouteWatch) {
        skipRouteWatch = false;
        return;
      }
      Object.assign(state as object, readFromQuery());
    },
    { deep: true },
  );

  return state;
}

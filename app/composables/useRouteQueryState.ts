import * as z from "zod/v4/mini";

type RouteQueryRaw = string | null | (string | null)[] | undefined;

function getAll(raw: RouteQueryRaw): string[] {
  if (raw === undefined) return [];
  if (raw === null) return [""];
  if (Array.isArray(raw)) return raw.map((v) => (v === null ? "" : v));
  return [raw];
}

function queryEquals(
  a: Record<string, string[]>,
  b: Record<string, string[]>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    const av = a[k]!;
    const bv = b[k];
    if (!bv || av.length !== bv.length) return false;
    if (!av.every((v, i) => v === bv[i])) return false;
  }
  return true;
}

export function querySingle<T extends z.core.$ZodType>(inner: T) {
  return z.codec(
    z.array(z.string()),
    z.custom<z.output<T> | undefined>(),
    {
      decode: (arr: string[]) => {
        const first = arr[0];
        if (first === undefined || first === "") return undefined;
        const r = z.safeDecode(inner, first as z.input<T>);
        return r.success ? (r.data as z.output<T>) : undefined;
      },
      encode: (v: z.output<T> | undefined): string[] => {
        if (v == null) return [];
        return [z.encode(inner, v as z.output<T>) as string];
      },
    },
  );
}

export function queryStringDefault(def: string) {
  return z.codec(z.array(z.string()), z.string(), {
    decode: (arr: string[]) => arr[0] ?? def,
    encode: (s: string) => (s === def ? [] : [s]),
  });
}

export function queryOptionalString() {
  return z.codec(z.array(z.string()), z.optional(z.string()), {
    decode: (arr: string[]) => arr[0],
    encode: (s: string | undefined): string[] => (s != null ? [s] : []),
  });
}

export function queryStringArray() {
  return z.codec(z.array(z.string()), z.array(z.string()), {
    decode: (arr: string[]): string[] => arr,
    encode: (arr: string[]): string[] => arr,
  });
}

export function useRouteQueryState<S extends z.core.$ZodObject>(
  schema: S,
  options?: { keys?: Partial<Record<string, string>> },
): z.output<S> {
  const route = useRoute();
  const router = useRouter();

  const keyMap = options?.keys ?? {};
  const shape = schema._zod.def.shape;
  const stateKeys = Object.keys(shape);

  const toUrlKey = (stateKey: string): string => keyMap[stateKey] ?? stateKey;

  function readRawStateKeyed(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const k of stateKeys) {
      result[k] = getAll(route.query[toUrlKey(k)] as RouteQueryRaw);
    }
    return result;
  }

  function toUrlKeyed(
    stateKeyed: Record<string, string[]>,
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const k of stateKeys) {
      result[toUrlKey(k)] = stateKeyed[k]!;
    }
    return result;
  }

  const initialState = (() => {
    const raw = readRawStateKeyed();
    const result = z.safeDecode(schema, raw as z.input<S>);
    return (result.success ? result.data : {}) as z.output<S>;
  })();

  const state = reactive(initialState) as z.output<S>;

  let cachedQuery: Record<string, string[]> = toUrlKeyed(readRawStateKeyed());

  function serialize(): Record<string, string[]> {
    const result = z.safeEncode(schema, state);
    if (!result.success) return cachedQuery;
    const encoded = result.data as Record<string, string[]>;
    const query: Record<string, string[]> = {};
    for (const k of stateKeys) {
      const arr = encoded[k] ?? [];
      if (arr.length > 0) query[toUrlKey(k)] = arr;
    }
    return query;
  }

  watch(
    state,
    () => {
      const query = serialize();
      if (queryEquals(query, cachedQuery)) return;
      cachedQuery = query;
      void router.replace({ query });
    },
    { deep: true },
  );

  watch(
    () => route.query,
    () => {
      const rawStateKeyed = readRawStateKeyed();
      const incoming = toUrlKeyed(rawStateKeyed);
      if (queryEquals(incoming, cachedQuery)) return;
      cachedQuery = incoming;
      const result = z.safeDecode(schema, rawStateKeyed as z.input<S>);
      if (result.success) {
        Object.assign(state as object, result.data);
      }
    },
    { deep: true },
  );

  return state;
}

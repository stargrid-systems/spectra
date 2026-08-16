import type {
  ListSettingDefinitionsParams,
  SettingDefinition,
  SettingDefinitionSummary,
} from "~~/modules/aperture/runtime/types";

/** Paginated setting definition summaries. */
export function useSettingDefinitionSummaries() {
  return useInfiniteList<SettingDefinitionSummary, ListSettingDefinitionsParams>((query) =>
    apertureApi.listSettingDefinitions(query),
  );
}

/**
 * Full setting definitions (with value schemas), fetched per key and cached
 * app-wide. Failed fetches are not cached so a retry can succeed.
 */
export function useSettingDefinitionCache() {
  const cache = useState<Map<string, SettingDefinition>>("setting-definitions", () => new Map());

  async function getDefinition(key: string): Promise<SettingDefinition | undefined> {
    const cached = cache.value.get(key);
    if (cached) return cached;
    try {
      const definition = await apertureApi.getSettingDefinition(key);
      cache.value.set(key, definition);
      return definition;
    } catch {
      return undefined;
    }
  }

  return { getDefinition };
}

import type {
  ListTaskDefinitionsParams,
  TaskDefinition,
  TaskDefinitionSummary,
} from "~~/modules/aperture/runtime/types";

/** Paginated task definition summaries for key selects. */
export function useTaskDefinitionSummaries() {
  return useInfiniteList<TaskDefinitionSummary, ListTaskDefinitionsParams>((query) =>
    apertureApi.listTaskDefinitions(query),
  );
}

/**
 * Full task definitions (with schemas), fetched per key and cached app-wide.
 * Failed fetches are not cached so a retry can succeed.
 */
export function useTaskDefinitionCache() {
  const cache = useState<Map<string, TaskDefinition>>("task-definitions", () => new Map());

  async function getDefinition(key: string): Promise<TaskDefinition | undefined> {
    const cached = cache.value.get(key);
    if (cached) return cached;
    try {
      const definition = await apertureApi.getTaskDefinition(key);
      cache.value.set(key, definition);
      return definition;
    } catch {
      return undefined;
    }
  }

  return { getDefinition };
}

import componentsJson from "~~/modules/aperture/runtime/taskSchemaComponents.json";

export interface JsonSchemaLike {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  oneOf?: JsonSchemaLike[];
  properties?: Record<string, JsonSchemaLike>;
  items?: JsonSchemaLike;
  required?: string[];
  format?: string;
  [key: string]: unknown;
}

export type SchemaComponents = Record<string, JsonSchemaLike>;

const taskSchemaComponents = componentsJson as SchemaComponents;

const REF_PREFIX = "#/components/schemas/";

/**
 * Resolves `$ref` pointers against the bundled spec components. Sibling
 * keywords next to `$ref` (e.g. a `description`) win over the target.
 * Returns undefined for refs the bundle does not know.
 */
export function resolveRef(
  schema: JsonSchemaLike,
  components: SchemaComponents = taskSchemaComponents,
): JsonSchemaLike | undefined {
  if (!schema.$ref) return schema;
  const name = schema.$ref.startsWith(REF_PREFIX) ? schema.$ref.slice(REF_PREFIX.length) : null;
  const target = name ? components[name] : undefined;
  if (!target) return undefined;
  const { $ref: _, ...siblings } = schema;
  return { ...resolveRef(target, components), ...siblings };
}

/**
 * Picks the `oneOf` branch the given value matches. Prefers a literal
 * discriminator (`type`/`kind` enum constant), then falls back to scoring
 * branches by how many required properties the value carries.
 */
export function pickOneOfBranch(
  branches: JsonSchemaLike[],
  value: unknown,
): JsonSchemaLike | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;

  for (const branch of branches) {
    const tag = tagValue(branch);
    if (tag && recordMatchesTag(record, tag)) return branch;
  }

  let best: { branch: JsonSchemaLike; score: number } | undefined;
  for (const branch of branches) {
    const required = (branch.required ?? []).filter((k) => k in record);
    if (required.length === 0) continue;
    const total = branch.required?.length ?? 0;
    const score = required.length / total;
    if (!best || score > best.score) best = { branch, score };
  }
  return best?.branch;
}

function tagValue(branch: JsonSchemaLike): [string, unknown] | undefined {
  for (const key of ["type", "kind"]) {
    const prop = branch.properties?.[key];
    if (prop?.enum?.length === 1) return [key, prop.enum[0]];
  }
  return undefined;
}

function recordMatchesTag(record: Record<string, unknown>, [key, expected]: [string, unknown]) {
  return key in record && record[key] === expected;
}

export interface SchemaRow {
  key: string;
  label: string;
  description?: string;
  value: unknown;
  schema?: JsonSchemaLike;
}

/**
 * Builds ordered display rows for an object value against its schema. Rows
 * follow schema property order; value keys the schema does not describe are
 * appended with no schema so nothing is silently hidden.
 */
export function schemaEntries(
  schema: JsonSchemaLike,
  value: unknown,
  components?: SchemaComponents,
): SchemaRow[] | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;

  const rows: SchemaRow[] = [];
  const seen = new Set<string>();
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (!(key in record)) continue;
    seen.add(key);
    const resolved = resolveRef(prop, components);
    rows.push({
      key,
      label: resolved?.title ?? key,
      description: resolved?.description,
      value: record[key],
      schema: resolved,
    });
  }
  for (const key of Object.keys(record)) {
    if (seen.has(key)) continue;
    rows.push({ key, label: key, value: record[key] });
  }
  return rows;
}

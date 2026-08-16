export interface JsonSchemaLike {
  $ref?: string;
  $defs?: Record<string, JsonSchemaLike>;
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  oneOf?: JsonSchemaLike[];
  properties?: Record<string, JsonSchemaLike>;
  items?: JsonSchemaLike;
  required?: string[];
  format?: string;
  default?: unknown;
  [key: string]: unknown;
}

/**
 * Resolves `$ref` pointers against the standalone schema document they came
 * from. Definitions endpoints serve draft 2020-12 documents with dependencies
 * under `$defs`, so `#/$defs/Name` is the shape in play. Sibling keywords next
 * to `$ref` (e.g. a `description`) win over the target. Returns undefined for
 * pointers the document does not contain.
 */
export function resolveRef(
  schema: JsonSchemaLike,
  doc?: JsonSchemaLike,
): JsonSchemaLike | undefined {
  if (!schema.$ref) return schema;
  const prefix = "#/$defs/";
  if (!schema.$ref.startsWith(prefix) || !doc?.$defs) return undefined;
  const name = schema.$ref.slice(prefix.length);
  const target = doc.$defs[name];
  if (!target) return undefined;
  const { $ref: _, ...siblings } = schema;
  return { ...resolveRef(target, doc), ...siblings };
}

/**
 * Picks the `oneOf` branch the given value matches. Prefers a literal
 * discriminator (`type`/`kind`/`key` enum constant), then falls back to
 * scoring branches by how many required properties the value carries.
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
  for (const key of ["type", "kind", "key"]) {
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
  doc?: JsonSchemaLike,
): SchemaRow[] | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;

  const rows: SchemaRow[] = [];
  const seen = new Set<string>();
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (!(key in record)) continue;
    seen.add(key);
    const resolved = resolveRef(prop, doc);
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

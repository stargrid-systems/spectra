import { isRecord, oneOfBranchTag, resolveRef, type JsonSchemaLike } from "./schemaCore";

/**
 * Picks the `oneOf` branch the given value matches. Prefers a literal
 * discriminator (`type`/`kind`/`key` enum constant), then falls back to
 * scoring branches by how many required properties the value carries.
 */
export function pickOneOfBranch(
  branches: JsonSchemaLike[],
  value: unknown,
): JsonSchemaLike | undefined {
  if (!isRecord(value)) return undefined;

  for (const branch of branches) {
    const tag = oneOfBranchTag(branch);
    if (tag && recordMatchesTag(value, tag)) return branch;
  }

  let best: { branch: JsonSchemaLike; score: number } | undefined;
  for (const branch of branches) {
    const required = (branch.required ?? []).filter((k) => k in value);
    if (required.length === 0) continue;
    const total = branch.required?.length ?? 0;
    const score = required.length / total;
    if (!best || score > best.score) best = { branch, score };
  }
  return best?.branch;
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

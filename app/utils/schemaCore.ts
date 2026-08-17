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
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
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

export function typeOf(schema: JsonSchemaLike | undefined): string | undefined {
  if (!schema) return undefined;
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== "null");
  return undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The single-value enum constant a `oneOf` branch carries under `type`,
 * `kind`, or `key`, which discriminates it from sibling branches.
 */
export function oneOfBranchTag(branch: JsonSchemaLike): [string, unknown] | undefined {
  for (const key of ["type", "kind", "key"]) {
    const prop = branch.properties?.[key];
    if (prop?.enum?.length === 1) return [key, prop.enum[0]];
  }
  return undefined;
}

export function stringEnums(schema: JsonSchemaLike): string[] | undefined {
  if (!schema.enum?.length) return undefined;
  const values = schema.enum.filter((v): v is string => typeof v === "string");
  return values.length === 0 ? undefined : values;
}

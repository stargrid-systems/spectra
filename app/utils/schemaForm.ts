import * as z from "zod/v4/mini";
import { resolveRef, type JsonSchemaLike } from "~/utils/schemaDisplay";

export type FormValue =
  string | number | boolean | null | FormValue[] | { [key: string]: FormValue };
export type FormState = { [key: string]: FormValue };

function typeOf(schema: JsonSchemaLike): string | undefined {
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== "null");
  return undefined;
}

/**
 * The branch a `oneOf` schema should use for form state. A single tagged
 * branch (`type`/`kind` enum with one value) is auto-selected; with several
 * candidates the caller must let the user choose.
 */
export function defaultOneOfBranch(
  schema: JsonSchemaLike,
): { branch: JsonSchemaLike; tag?: [string, FormValue] } | undefined {
  if (!schema.oneOf?.length) return undefined;
  const tagged = schema.oneOf.filter((b) => oneOfBranchTag(b) !== undefined);
  if (tagged.length === 1) {
    const branch = tagged[0]!;
    const tag = oneOfBranchTag(branch);
    return tag ? { branch, tag } : { branch };
  }
  if (schema.oneOf.length === 1) return { branch: schema.oneOf[0]! };
  return undefined;
}

export function oneOfBranchTag(branch: JsonSchemaLike): [string, FormValue] | undefined {
  for (const key of ["type", "kind"]) {
    const value = branch.properties?.[key]?.enum?.[0];
    if (value !== undefined) return [key, value as FormValue];
  }
  return undefined;
}

/**
 * Seeds form state from a schema: `default` values when present, empty
 * strings/objects/arrays otherwise. OneOf branches with a single tagged
 * variant are auto-selected and the tag constant is injected.
 */
export function buildFormState(schemaIn: JsonSchemaLike, doc?: JsonSchemaLike): FormState {
  const state: FormState = {};
  // At the document root the schema IS the document its $defs live in.
  const docRef = doc ?? schemaIn;
  let schema = resolveRef(schemaIn, docRef);
  if (schema?.oneOf?.length) {
    const branch = defaultOneOfBranch(schema);
    if (branch) {
      schema = branch.branch;
      if (branch.tag) {
        const nested = buildFormState(branch.branch, docRef);
        nested[branch.tag[0]] = branch.tag[1];
        return nested;
      }
    } else {
      return {};
    }
  }
  if (!schema?.properties) return state;

  for (const [key, propIn] of Object.entries(schema.properties)) {
    const prop = resolveRef(propIn, docRef);
    if (!prop) continue;

    if (prop.default !== undefined) {
      state[key] = prop.default as FormValue;
      continue;
    }

    const branch = defaultOneOfBranch(prop);
    if (branch) {
      const nested = buildFormState(branch.branch, docRef);
      if (branch.tag) nested[branch.tag[0]] = branch.tag[1];
      state[key] = nested;
      continue;
    }

    switch (typeOf(prop)) {
      case "object":
        state[key] = buildFormState(prop, docRef);
        break;
      case "array":
        state[key] = [];
        break;
      case "boolean":
        state[key] = false;
        break;
      default:
        state[key] = "";
        break;
    }
  }
  return state;
}

function isFormState(value: FormValue): value is FormState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strips empty-string and empty-array placeholders and converts numeric
 * fields (kept as strings for the inputs) to numbers, so the request body
 * only carries values the user actually entered.
 */
export function cleanFormState(
  state: FormState,
  schemaIn?: JsonSchemaLike,
  doc?: JsonSchemaLike,
): FormState {
  const docRef = doc ?? schemaIn;
  const schema = schemaIn ? resolveRef(schemaIn, docRef) : undefined;
  const out: FormState = {};
  for (const [key, value] of Object.entries(state)) {
    if (value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const items = schema?.properties?.[key]?.items;
      out[key] = value.map((v) => (isFormState(v) ? cleanFormState(v, items, docRef) : v));
      continue;
    }
    if (isFormState(value)) {
      out[key] = cleanFormState(value, schema?.properties?.[key], docRef);
      continue;
    }
    if (
      typeof value === "string" &&
      (typeOf(schema?.properties?.[key] ?? {}) === "number" ||
        typeOf(schema?.properties?.[key] ?? {}) === "integer") &&
      value.trim() !== "" &&
      !Number.isNaN(Number(value))
    ) {
      out[key] = Number(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const INTEGER_RE = /^-?\d+$/;

/**
 * Builds a zod schema validating form state against the JSON Schema:
 * required checks, enum domains, numeric strings, nested objects, and
 * arrays. Optional fields accept the empty-string placeholder.
 */
export function buildZodSchema(
  schemaIn: JsonSchemaLike,
  required = true,
  doc?: JsonSchemaLike,
): z.core.$ZodType {
  const docRef = doc ?? schemaIn;
  const schema = resolveRef(schemaIn, docRef) ?? schemaIn;

  if (schema.oneOf?.length) {
    const branch = defaultOneOfBranch(schema)?.branch;
    if (branch) return buildZodSchema(branch, required, docRef);
  }

  switch (typeOf(schema)) {
    case "object": {
      const shape: Record<string, z.core.$ZodType> = {};
      const req = new Set(schema.required ?? []);
      for (const [key, propIn] of Object.entries(schema.properties ?? {})) {
        const prop = resolveRef(propIn, docRef);
        if (!prop) continue;
        const field = buildZodSchema(prop, req.has(key), docRef);
        // Optional fields accept absence and the empty-string placeholder.
        shape[key] = req.has(key) ? field : z.optional(z.union([z.literal(""), field]));
      }
      return z.object(shape);
    }
    case "array": {
      const items = schema.items ? buildZodSchema(schema.items, true, docRef) : z.any();
      const arr = z.array(items);
      return required ? arr.check(z.minLength(1)) : arr;
    }
    case "boolean":
      return z.boolean();
    case "number":
    case "integer": {
      const re = typeOf(schema) === "integer" ? INTEGER_RE : NUMBER_RE;
      const num = z.string().check(z.regex(re));
      return required ? num.check(z.minLength(1)) : num;
    }
    case "string": {
      if (schema.enum?.length && schema.enum.every((v): v is string => typeof v === "string")) {
        const values: [string, ...string[]] = schema.enum as [string, ...string[]];
        return z.enum(values);
      }
      return required ? z.string().check(z.minLength(1)) : z.string();
    }
    default:
      return z.any();
  }
}

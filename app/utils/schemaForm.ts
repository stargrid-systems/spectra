import * as z from "zod/v4/mini";
import { oneOfBranchTag, resolveRef, stringEnums, type JsonSchemaLike, typeOf } from "./schemaCore";

export type FormValue =
  string | number | boolean | null | FormValue[] | { [key: string]: FormValue };
export type FormState = { [key: string]: FormValue };

/**
 * The branch a `oneOf` schema should use for form state. A single tagged
 * branch (`type`/`kind`/`key` enum with one value) is auto-selected; with
 * several candidates the caller must let the user choose.
 */
export function defaultOneOfBranch(
  schema: JsonSchemaLike,
): { branch: JsonSchemaLike; tag?: [string, FormValue] } | undefined {
  if (!schema.oneOf?.length) return undefined;
  const tagged = schema.oneOf.filter((b) => oneOfBranchTag(b) !== undefined);
  if (tagged.length === 1) {
    const branch = tagged[0]!;
    const tag = oneOfBranchTag(branch);
    return tag ? { branch, tag: [tag[0], tag[1] as FormValue] } : { branch };
  }
  if (schema.oneOf.length === 1) return { branch: schema.oneOf[0]! };
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
      default: {
        const values = stringEnums(prop);
        state[key] = values?.length === 1 ? (values[0] ?? "") : "";
        break;
      }
    }
  }
  return state;
}

function isFormState(value: FormValue | undefined): value is FormState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Overlays a current value onto schema-seeded form state so editing starts
 * from the stored value while keeping defaults for keys it omits.
 */
export function mergeFormState(seed: FormState, value: unknown): FormState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return seed;
  const out: FormState = { ...seed };
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const formValue: FormValue | undefined =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null
        ? v
        : Array.isArray(v)
          ? (v as FormValue[])
          : (v as FormState);
    if (formValue === undefined) continue;
    const seeded = out[k];
    if (isFormState(seeded) && isFormState(formValue)) {
      out[k] = mergeFormState(seeded, formValue);
    } else {
      out[k] = formValue;
    }
  }
  return out;
}

/**
 * Strips empty-string and empty-array placeholders and converts numeric
 * fields (kept as strings for the inputs) to numbers, so the request body
 * only carries values the user actually entered. Numeric conversion resolves
 * `$ref` targets, array item schemas, and the auto-selected `oneOf` branch.
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
    const prop = schema?.properties?.[key] ? resolveRef(schema.properties[key], docRef) : undefined;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const items = prop?.items ? resolveRef(prop.items, docRef) : undefined;
      out[key] = value.map((v) =>
        isFormState(v) ? cleanFormState(v, items, docRef) : (toNumber(v, items) ?? v),
      );
      continue;
    }
    if (isFormState(value)) {
      let sub = prop;
      if (sub?.oneOf?.length) sub = defaultOneOfBranch(sub)?.branch;
      out[key] = cleanFormState(value, sub, docRef);
      continue;
    }
    out[key] = toNumber(value, prop) ?? value;
  }
  return out;
}

function toNumber(value: unknown, schema?: JsonSchemaLike): number | undefined {
  const t = typeOf(schema ?? {});
  if (
    (t === "number" || t === "integer") &&
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return undefined;
}

const NUMBER_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const INTEGER_RE = /^-?\d+$/;

/**
 * Wraps a numeric predicate as a zod check for string-backed number fields.
 * The zod/v4/mini check protocol hands the payload with `.value` and expects
 * issues pushed, not a boolean return.
 */
function numericCheck(pred: (value: string) => boolean) {
  return z.check((payload: z.core.ParsePayload<string>) => {
    if (pred(payload.value)) return;
    payload.issues.push({ code: "custom", input: payload.value });
  });
}

/**
 * Builds a zod schema validating form state against the JSON Schema:
 * required checks, enum domains, numeric strings, nested objects, arrays,
 * and the declared string/number/array constraints. Optional fields accept
 * the empty-string placeholder.
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
      let arr = z.array(items);
      if (schema.minItems !== undefined) arr = arr.check(z.minLength(schema.minItems));
      return required ? arr.check(z.minLength(Math.max(1, schema.minItems ?? 1))) : arr;
    }
    case "boolean":
      return z.boolean();
    case "number":
    case "integer": {
      const re = typeOf(schema) === "integer" ? INTEGER_RE : NUMBER_RE;
      let num = z.string().check(z.regex(re));
      const min = schema.minimum;
      if (min !== undefined) num = num.check(numericCheck((value) => Number(value) >= min));
      const max = schema.maximum;
      if (max !== undefined) num = num.check(numericCheck((value) => Number(value) <= max));
      const exclusiveMinimum = schema.exclusiveMinimum;
      if (exclusiveMinimum !== undefined) {
        num = num.check(numericCheck((value) => Number(value) > exclusiveMinimum));
      }
      const exclusiveMaximum = schema.exclusiveMaximum;
      if (exclusiveMaximum !== undefined) {
        num = num.check(numericCheck((value) => Number(value) < exclusiveMaximum));
      }
      return required ? num.check(z.minLength(1)) : num;
    }
    case "string": {
      if (schema.enum?.length && schema.enum.every((v): v is string => typeof v === "string")) {
        const values: [string, ...string[]] = schema.enum as [string, ...string[]];
        return z.enum(values);
      }
      let str = z.string();
      const minLength = schema.minLength;
      if (minLength !== undefined) str = str.check(z.minLength(minLength));
      const maxLength = schema.maxLength;
      if (maxLength !== undefined) str = str.check(z.maxLength(maxLength));
      const pattern = schema.pattern;
      if (pattern !== undefined) str = str.check(z.regex(new RegExp(pattern)));
      return required ? str.check(z.minLength(1)) : str;
    }
    default:
      return z.any();
  }
}

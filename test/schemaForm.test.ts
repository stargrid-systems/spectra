import { describe, expect, it } from "vitest";
import * as z from "zod/v4/mini";
import { oneOfBranchTag, type JsonSchemaLike } from "~/utils/schemaCore";
import {
  buildFormState,
  buildZodSchema,
  cleanFormState,
  defaultOneOfBranch,
  mergeFormState,
  type FormState,
} from "~/utils/schemaForm";

const doc: JsonSchemaLike = {
  $defs: {
    ArtifactKey: { type: "string", description: "Logical artifact key." },
  },
};

const downloadInput: JsonSchemaLike = {
  ...doc,
  type: "object",
  required: ["key", "source"],
  properties: {
    key: { $ref: "#/$defs/ArtifactKey", description: "Logical key." },
    source: {
      oneOf: [
        {
          type: "object",
          required: ["reference", "media_type", "type"],
          properties: {
            reference: { type: "string" },
            media_type: { type: "string" },
            type: { type: "string", enum: ["oci"] },
          },
        },
      ],
    },
    retries: { type: "integer", minimum: 0 },
    verbose: { type: "boolean" },
  },
};

describe("defaultOneOfBranch", () => {
  it("auto-selects a single tagged branch and reports its tag", () => {
    const schema = downloadInput.properties!.source as JsonSchemaLike;
    const result = defaultOneOfBranch(schema)!;
    expect(result.branch).toBe(schema.oneOf![0]);
    expect(result.tag).toEqual(["type", "oci"]);
  });

  it("returns undefined for multiple untagged branches", () => {
    const schema: JsonSchemaLike = {
      oneOf: [{ type: "object" }, { type: "object" }],
    };
    expect(defaultOneOfBranch(schema)).toBeUndefined();
  });
});

describe("oneOfBranchTag", () => {
  it("reads the tag from a kind enum", () => {
    expect(
      oneOfBranchTag({ type: "object", properties: { kind: { type: "string", enum: ["x"] } } }),
    ).toEqual(["kind", "x"]);
  });
});

describe("buildFormState", () => {
  it("seeds defaults, injects the oneOf tag, and empties the rest", () => {
    const state = buildFormState(downloadInput);
    expect(state).toEqual({
      key: "",
      source: { reference: "", media_type: "", type: "oci" },
      retries: "",
      verbose: false,
    });
  });

  it("uses schema defaults when present", () => {
    const state = buildFormState({
      type: "object",
      properties: { retries: { type: "integer", default: 3 } },
    });
    expect(state.retries).toBe(3);
  });

  it("returns an empty state without properties", () => {
    expect(buildFormState({ type: "object" })).toEqual({});
  });

  it("seeds a single-value string enum without a default", () => {
    const state = buildFormState({
      type: "object",
      properties: { kind: { type: "string", enum: ["cron"] } },
    });
    expect(state.kind).toBe("cron");
  });
});

describe("cleanFormState", () => {
  it("strips placeholders, keeps entered values, and converts numbers", () => {
    const state = {
      key: "spectra",
      source: { reference: "ghcr.io/org/img:1", media_type: "", type: "oci" },
      retries: "2",
      verbose: false,
    };
    expect(cleanFormState(state, downloadInput)).toEqual({
      key: "spectra",
      source: { reference: "ghcr.io/org/img:1", type: "oci" },
      retries: 2,
      verbose: false,
    });
  });

  it("keeps booleans as booleans", () => {
    expect(cleanFormState({ verbose: true }, downloadInput)).toEqual({ verbose: true });
  });

  it("converts numeric strings behind a $ref", () => {
    const schema: JsonSchemaLike = {
      $defs: { Secs: { type: "number" } },
      type: "object",
      properties: { timeout: { $ref: "#/$defs/Secs" } },
    };
    expect(cleanFormState({ timeout: "5" }, schema)).toEqual({ timeout: 5 });
  });

  it("converts numeric array items", () => {
    const schema: JsonSchemaLike = {
      type: "object",
      properties: { ids: { type: "array", items: { type: "integer" } } },
    };
    expect(cleanFormState({ ids: ["1", "2"] }, schema)).toEqual({ ids: [1, 2] });
  });

  it("converts numeric leaves inside a single-branch oneOf property", () => {
    const schema: JsonSchemaLike = {
      type: "object",
      properties: {
        job: {
          oneOf: [
            {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["cron"] },
                retries: { type: "integer" },
              },
            },
          ],
        },
      },
    };
    const state = { job: { kind: "cron", retries: "3" } };
    expect(cleanFormState(state, schema)).toEqual({ job: { kind: "cron", retries: 3 } });
  });
});

describe("buildZodSchema", () => {
  const schema = buildZodSchema(downloadInput);

  it("accepts a filled state", () => {
    const state = {
      key: "spectra",
      source: { reference: "r", media_type: "m", type: "oci" },
      retries: "1",
      verbose: false,
    };
    expect(z.parse(schema, state)).toEqual(state);
  });

  it("rejects a missing required field", () => {
    const state = {
      key: "",
      source: { reference: "r", media_type: "m", type: "oci" },
    };
    const result = z.safeParse(schema, state);
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric numbers and non-integer integers", () => {
    const badNum = {
      key: "k",
      source: { reference: "r", media_type: "m", type: "oci" },
      retries: "abc",
    };
    expect(z.safeParse(schema, badNum).success).toBe(false);
    const float = {
      key: "k",
      source: { reference: "r", media_type: "m", type: "oci" },
      retries: "1.5",
    };
    expect(z.safeParse(schema, float).success).toBe(false);
  });

  it("allows optional placeholders and wrong enum values are rejected", () => {
    const okState = { key: "k", source: { reference: "r", media_type: "m", type: "oci" } };
    expect(z.safeParse(schema, okState).success).toBe(true);

    const badTag = { key: "k", source: { reference: "r", media_type: "m", type: "docker" } };
    expect(z.safeParse(schema, badTag).success).toBe(false);
  });

  it("accepts scientific notation for type number", () => {
    const numSchema = buildZodSchema({ type: "number" });
    expect(z.safeParse(numSchema, "1e3").success).toBe(true);
    expect(z.safeParse(numSchema, "1.5E-2").success).toBe(true);
    expect(z.safeParse(numSchema, "-2e+10").success).toBe(true);
    expect(z.safeParse(numSchema, "abc").success).toBe(false);
  });

  it("enforces minimum on numeric strings", () => {
    const minSchema = buildZodSchema({ type: "integer", minimum: 0 });
    expect(z.safeParse(minSchema, "3").success).toBe(true);
    expect(z.safeParse(minSchema, "-5").success).toBe(false);
  });

  it("enforces pattern on strings", () => {
    const patternSchema = buildZodSchema({ type: "string", pattern: "^[a-z]+$" });
    expect(z.safeParse(patternSchema, "abc").success).toBe(true);
    expect(z.safeParse(patternSchema, "ABC").success).toBe(false);
  });

  it("enforces minLength and maxLength on strings", () => {
    const lenSchema = buildZodSchema({ type: "string", minLength: 2, maxLength: 4 });
    expect(z.safeParse(lenSchema, "abc").success).toBe(true);
    expect(z.safeParse(lenSchema, "a").success).toBe(false);
    expect(z.safeParse(lenSchema, "abcdef").success).toBe(false);
  });

  it("enforces minItems on arrays", () => {
    const arrSchema = buildZodSchema({ type: "array", items: { type: "string" }, minItems: 2 });
    expect(z.safeParse(arrSchema, ["a", "b"]).success).toBe(true);
    expect(z.safeParse(arrSchema, ["a"]).success).toBe(false);
  });
});

describe("mergeFormState", () => {
  it("overlays stored values onto schema-seeded defaults", () => {
    const seed = buildFormState(downloadInput);
    const merged = mergeFormState(seed, { key: "firmware" });
    expect(merged.key).toBe("firmware");
    expect(merged.source).toEqual({ reference: "", media_type: "", type: "oci" });
  });

  it("merges nested objects and keeps unknown keys", () => {
    const merged = mergeFormState(
      { source: { reference: "", media_type: "", type: "oci" }, extra: "" },
      { source: { reference: "ghcr.io/org/img:1" }, unknown: 3 },
    );
    expect(merged.source).toEqual({ reference: "ghcr.io/org/img:1", media_type: "", type: "oci" });
    expect(merged.unknown).toBe(3);
  });

  it("returns the seed for non-object values", () => {
    const seed: FormState = { key: "spectra" };
    expect(mergeFormState(seed, null)).toBe(seed);
    expect(mergeFormState(seed, "nope")).toBe(seed);
  });
});

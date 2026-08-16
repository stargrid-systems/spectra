import { describe, expect, it } from "vitest";
import * as z from "zod/v4/mini";
import type { JsonSchemaLike } from "~/utils/schemaDisplay";
import {
  buildFormState,
  buildZodSchema,
  cleanFormState,
  defaultOneOfBranch,
  mergeFormState,
  oneOfBranchTag,
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

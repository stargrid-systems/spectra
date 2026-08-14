import { describe, expect, it } from "vitest";
import {
  pickOneOfBranch,
  resolveRef,
  schemaEntries,
  type JsonSchemaLike,
} from "~/utils/schemaDisplay";

const components: Record<string, JsonSchemaLike> = {
  ArtifactKey: { type: "string", description: "Logical artifact key." },
  DownloadSource: {
    oneOf: [
      {
        type: "object",
        description: "A layer of an OCI image.",
        required: ["reference", "media_type", "type"],
        properties: {
          reference: { type: "string" },
          media_type: { type: "string" },
          type: { type: "string", enum: ["oci"] },
        },
      },
    ],
  },
  DownloadInput: {
    type: "object",
    required: ["key", "source"],
    properties: {
      key: { $ref: "#/components/schemas/ArtifactKey", description: "Logical key." },
      source: { $ref: "#/components/schemas/DownloadSource" },
    },
  },
};

describe("resolveRef", () => {
  it("resolves a $ref to its component", () => {
    const resolved = resolveRef({ $ref: "#/components/schemas/ArtifactKey" }, components);
    expect(resolved?.type).toBe("string");
    expect(resolved?.description).toBe("Logical artifact key.");
  });

  it("lets sibling keywords win over the target", () => {
    const resolved = resolveRef(
      { $ref: "#/components/schemas/ArtifactKey", description: "override" },
      components,
    );
    expect(resolved?.description).toBe("override");
    expect(resolved?.type).toBe("string");
  });

  it("returns the schema untouched without a $ref", () => {
    const schema: JsonSchemaLike = { type: "string" };
    expect(resolveRef(schema, components)).toBe(schema);
  });

  it("returns undefined for unknown refs", () => {
    expect(resolveRef({ $ref: "#/components/schemas/Nope" }, components)).toBeUndefined();
  });
});

describe("pickOneOfBranch", () => {
  const branches = components.DownloadSource!.oneOf!;

  it("picks the branch matching the discriminator tag", () => {
    const value = {
      type: "oci",
      reference: "ghcr.io/org/img:tag",
      media_type: "application/vnd.oci.image.layer.v1.tar",
    };
    expect(pickOneOfBranch(branches, value)).toBe(branches[0]);
  });

  it("falls back to required-property scoring without a tag", () => {
    const noTag: JsonSchemaLike[] = [
      {
        type: "object",
        required: ["a", "b", "c"],
        properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" } },
      },
      {
        type: "object",
        required: ["a", "b"],
        properties: { a: { type: "string" }, b: { type: "string" } },
      },
    ];
    expect(pickOneOfBranch(noTag, { a: "1", b: "2" })).toBe(noTag[1]);
  });

  it("returns undefined for non-object values", () => {
    expect(pickOneOfBranch(branches, "oci")).toBeUndefined();
    expect(pickOneOfBranch(branches, null)).toBeUndefined();
  });

  it("returns undefined when no branch matches", () => {
    expect(pickOneOfBranch(branches, { unrelated: true })).toBeUndefined();
  });
});

describe("schemaEntries", () => {
  it("orders rows by schema properties and resolves refs", () => {
    const value = { source: { type: "oci", reference: "r", media_type: "m" }, key: "spectra" };
    const rows = schemaEntries(components.DownloadInput!, value, components)!;
    expect(rows.map((r) => r.key)).toEqual(["key", "source"]);
    expect(rows[0].description).toBe("Logical key.");
    expect(rows[0].schema?.type).toBe("string");
  });

  it("appends value keys missing from the schema", () => {
    const value = {
      key: "spectra",
      source: { type: "oci", reference: "r", media_type: "m" },
      extra: 1,
    };
    const rows = schemaEntries(components.DownloadInput!, value, components)!;
    expect(rows.at(-1)).toMatchObject({ key: "extra", label: "extra", value: 1 });
    expect(rows.at(-1)?.schema).toBeUndefined();
  });

  it("skips schema properties the value does not carry", () => {
    const rows = schemaEntries(components.DownloadInput!, { key: "spectra" }, components)!;
    expect(rows.map((r) => r.key)).toEqual(["key"]);
  });

  it("returns undefined for non-object values", () => {
    expect(schemaEntries(components.DownloadInput!, "nope", components)).toBeUndefined();
    expect(schemaEntries(components.DownloadInput!, null, components)).toBeUndefined();
  });
});

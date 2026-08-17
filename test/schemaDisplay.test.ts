import { describe, expect, it } from "vitest";
import { pickOneOfBranch, schemaEntries } from "~/utils/schemaDisplay";
import { resolveRef, type JsonSchemaLike } from "~/utils/schemaCore";

// Mirrors the standalone documents the definitions endpoints serve:
// dependencies under $defs, refs as #/$defs/Name.
const doc: JsonSchemaLike = {
  type: "object",
  required: ["key", "source"],
  properties: {
    key: { $ref: "#/$defs/ArtifactKey", description: "Logical key." },
    source: { $ref: "#/$defs/DownloadSource" },
  },
  $defs: {
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
  },
};

describe("resolveRef", () => {
  it("resolves a $defs pointer against the document", () => {
    const resolved = resolveRef(doc.properties!.key!, doc);
    expect(resolved?.type).toBe("string");
    expect(resolved?.description).toBe("Logical key.");
  });

  it("lets sibling keywords win over the target", () => {
    const resolved = resolveRef({ $ref: "#/$defs/ArtifactKey", description: "override" }, doc);
    expect(resolved?.description).toBe("override");
    expect(resolved?.type).toBe("string");
  });

  it("returns the schema untouched without a $ref", () => {
    const schema: JsonSchemaLike = { type: "string" };
    expect(resolveRef(schema, doc)).toBe(schema);
  });

  it("returns undefined for unknown pointers or a missing document", () => {
    expect(resolveRef({ $ref: "#/$defs/Nope" }, doc)).toBeUndefined();
    expect(resolveRef({ $ref: "#/$defs/ArtifactKey" }, undefined)).toBeUndefined();
    expect(resolveRef({ $ref: "#/components/schemas/ArtifactKey" }, doc)).toBeUndefined();
  });
});

describe("pickOneOfBranch", () => {
  const branches = doc.$defs!.DownloadSource!.oneOf!;

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

  it("recognizes a branch tagged via a key property enum", () => {
    const keyed: JsonSchemaLike[] = [
      {
        type: "object",
        required: ["key", "value"],
        properties: {
          key: { type: "string", enum: ["checksum"] },
          value: { type: "string" },
        },
      },
      {
        type: "object",
        required: ["key", "data"],
        properties: {
          key: { type: "string", enum: ["blob"] },
          data: { type: "string" },
        },
      },
    ];
    expect(pickOneOfBranch(keyed, { key: "blob", data: "..." })).toBe(keyed[1]);
    expect(pickOneOfBranch(keyed, { key: "checksum", value: "..." })).toBe(keyed[0]);
  });
});

describe("schemaEntries", () => {
  it("orders rows by schema properties and resolves refs against the doc", () => {
    const value = { source: { type: "oci", reference: "r", media_type: "m" }, key: "spectra" };
    const rows = schemaEntries(doc, value, doc)!;
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
    const rows = schemaEntries(doc, value, doc)!;
    expect(rows.at(-1)).toMatchObject({ key: "extra", label: "extra", value: 1 });
    expect(rows.at(-1)?.schema).toBeUndefined();
  });

  it("skips schema properties the value does not carry", () => {
    const rows = schemaEntries(doc, { key: "spectra" }, doc)!;
    expect(rows.map((r) => r.key)).toEqual(["key"]);
  });

  it("returns undefined for non-object values", () => {
    expect(schemaEntries(doc, "nope", doc)).toBeUndefined();
    expect(schemaEntries(doc, null, doc)).toBeUndefined();
  });
});

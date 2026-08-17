import { describe, expect, it } from "vitest";
import * as z from "zod/v4/mini";
import {
  artifactsParamsFromFilters,
  artifactsSchema,
  versionsParamsFromFilters,
  versionsSchema,
  type ArtifactVersionsFilters,
} from "~/composables/useArtifactsFilters";
import {
  tasksParamsFromFilters,
  tasksSchema,
  type TasksFilters,
} from "~/composables/useTasksFilters";

describe("tasksSchema", () => {
  it("decodes a valid status", () => {
    const actual = z.decode(tasksSchema, { status: ["failed"], key: [], root: [] });
    expect(actual.status).toBe("failed");
    expect(actual.key).toBeUndefined();
    expect(actual.root).toBe(true);
  });

  it("falls back to undefined for an invalid status", () => {
    const actual = z.decode(tasksSchema, { status: ["bogus"], key: [], root: [] });
    expect(actual.status).toBeUndefined();
  });

  it("falls back to undefined for an empty status array", () => {
    const actual = z.decode(tasksSchema, { status: [], key: [], root: [] });
    expect(actual.status).toBeUndefined();
  });

  it("decodes key from a query value", () => {
    const actual = z.decode(tasksSchema, { status: [], key: ["svc.backend"], root: [] });
    expect(actual.key).toBe("svc.backend");
  });

  it("defaults root to true when the param is absent", () => {
    const actual = z.decode(tasksSchema, { status: [], key: [], root: [] });
    expect(actual.root).toBe(true);
  });

  it("decodes root from explicit 1/0 values", () => {
    expect(z.decode(tasksSchema, { status: [], key: [], root: ["1"] }).root).toBe(true);
    expect(z.decode(tasksSchema, { status: [], key: [], root: ["0"] }).root).toBe(false);
  });

  it("encodes root=true as ['1'] and root=false as ['0']", () => {
    expect(z.encode(tasksSchema, { status: "active", key: "", root: true })).toEqual({
      status: ["active"],
      key: [],
      root: ["1"],
    });
    expect(z.encode(tasksSchema, { status: "failed", key: "svc", root: false })).toEqual({
      status: ["failed"],
      key: ["svc"],
      root: ["0"],
    });
  });

  it("encodes unset status and key as empty arrays", () => {
    expect(z.encode(tasksSchema, { status: undefined, key: undefined, root: true })).toEqual({
      status: [],
      key: [],
      root: ["1"],
    });
  });

  it("round trips through decode and encode", () => {
    const filters = z.decode(tasksSchema, {
      status: ["running"],
      key: ["svc.backend"],
      root: ["0"],
    });
    expect(z.encode(tasksSchema, filters)).toEqual({
      status: ["running"],
      key: ["svc.backend"],
      root: ["0"],
    });
  });
});

describe("tasksParamsFromFilters", () => {
  const empty: TasksFilters = { status: undefined, key: undefined, root: true };

  it("propagates status, key, and root=true", () => {
    expect(tasksParamsFromFilters({ ...empty, status: "pending", key: "cfg" })).toEqual({
      status: "pending",
      key: "cfg",
      root: true,
    });
  });

  it("propagates root=false without dropping it", () => {
    expect(tasksParamsFromFilters({ ...empty, root: false })).toEqual({ root: false });
  });

  it("always emits root even when status and key are unset", () => {
    expect(tasksParamsFromFilters(empty)).toEqual({ root: true });
  });
});

describe("artifactsSchema", () => {
  it("decodes q and key from single query values", () => {
    const actual = z.decode(artifactsSchema, { q: ["foo"], key: ["bar"] });
    expect(actual).toEqual({ q: "foo", key: "bar" });
  });

  it("decodes empty arrays to undefined", () => {
    const actual = z.decode(artifactsSchema, { q: [], key: [] });
    expect(actual.q).toBeUndefined();
    expect(actual.key).toBeUndefined();
  });

  it("encodes set values and empty arrays for unset values", () => {
    expect(z.encode(artifactsSchema, { q: "foo", key: undefined })).toEqual({
      q: ["foo"],
      key: [],
    });
    expect(z.encode(artifactsSchema, { q: undefined, key: undefined })).toEqual({
      q: [],
      key: [],
    });
  });
});

describe("versionsSchema", () => {
  it("decodes a valid sort value", () => {
    for (const sort of ["downloaded_at", "size_bytes"]) {
      expect(z.decode(versionsSchema, { media_type: [], version: [], sort: [sort] }).sort).toBe(
        sort,
      );
    }
  });

  it("falls back to undefined for an invalid sort value", () => {
    const actual = z.decode(versionsSchema, { media_type: [], version: [], sort: ["bogus"] });
    expect(actual.sort).toBeUndefined();
  });

  it("falls back to undefined for an empty sort array", () => {
    const actual = z.decode(versionsSchema, { media_type: [], version: [], sort: [] });
    expect(actual.sort).toBeUndefined();
  });

  it("encodes an undefined sort as an empty array", () => {
    const encoded = z.encode(versionsSchema, {
      media_type: undefined,
      version: undefined,
      sort: undefined,
    });
    expect(encoded.sort).toEqual([]);
  });

  it("encodes a valid sort value", () => {
    const encoded = z.encode(versionsSchema, {
      media_type: "application/octet-stream",
      version: "v1",
      sort: "size_bytes",
    });
    expect(encoded.sort).toEqual(["size_bytes"]);
    expect(encoded.media_type).toEqual(["application/octet-stream"]);
  });

  it("decodes media_type and version alongside sort", () => {
    const actual = z.decode(versionsSchema, {
      media_type: ["application/octet-stream"],
      version: ["v1.2"],
      sort: [],
    });
    expect(actual.media_type).toBe("application/octet-stream");
    expect(actual.version).toBe("v1.2");
  });
});

describe("versionsParamsFromFilters", () => {
  it("maps media_type, version, and sort", () => {
    const filters: ArtifactVersionsFilters = {
      media_type: "application/gzip",
      version: "gz-1",
      sort: "size_bytes",
    };
    expect(versionsParamsFromFilters(filters)).toEqual({
      media_type: "application/gzip",
      version: "gz-1",
      sort: "size_bytes",
    });
  });

  it("returns an empty params object when nothing is set", () => {
    expect(
      versionsParamsFromFilters({ media_type: undefined, version: undefined, sort: undefined }),
    ).toEqual({});
  });
});

describe("artifactsParamsFromFilters", () => {
  it("maps q and drops key", () => {
    expect(artifactsParamsFromFilters({ q: "foo", key: "bar" })).toEqual({ q: "foo" });
  });

  it("omits q when unset", () => {
    expect(artifactsParamsFromFilters({ q: undefined, key: undefined })).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import {
  asFields,
  formatFieldsInline,
  formatValue,
  sortedFields,
} from "~/composables/useLogsContext";

describe("asFields", () => {
  it("returns undefined for primitives", () => {
    expect(asFields(null)).toBeUndefined();
    expect(asFields("hello")).toBeUndefined();
    expect(asFields(42)).toBeUndefined();
  });

  it("returns undefined for arrays", () => {
    expect(asFields([1, 2])).toBeUndefined();
  });

  it("returns the object for plain objects", () => {
    expect(asFields({ a: 1 })).toEqual({ a: 1 });
  });
});

describe("formatValue", () => {
  it("renders null as 'null'", () => {
    expect(formatValue(null)).toBe("null");
  });

  it("renders numbers and booleans verbatim", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(true)).toBe("true");
  });

  it("renders arrays as JSON", () => {
    expect(formatValue([1, 2])).toBe("[1,2]");
  });
});

describe("formatFieldsInline", () => {
  it("returns empty for nothing", () => {
    expect(formatFieldsInline(undefined)).toBe("");
    expect(formatFieldsInline({})).toBe("");
  });

  it("includes all fields", () => {
    expect(formatFieldsInline({ message: "m", addr: "1.2.3.4" })).toBe("message=m  addr=1.2.3.4");
  });

  it("joins with double spaces", () => {
    expect(formatFieldsInline({ a: 1, b: "x" })).toBe("a=1  b=x");
  });
});

describe("sortedFields", () => {
  it("returns all fields sorted by key", () => {
    const sorted = sortedFields({ message: "m", addr: "1" });
    expect(sorted).toEqual([
      { key: "addr", value: "1" },
      { key: "message", value: "m" },
    ]);
  });

  it("returns empty for non-object input", () => {
    expect(sortedFields("hello")).toEqual([]);
  });
});

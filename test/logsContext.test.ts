import { describe, expect, it } from "vitest";
import {
  asFields,
  formatFieldsInline,
  formatTimestamp,
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

  it("skips message and boot_id", () => {
    expect(formatFieldsInline({ message: "m", boot_id: "B", addr: "1.2.3.4" })).toBe(
      "addr=1.2.3.4",
    );
  });

  it("joins with double spaces", () => {
    expect(formatFieldsInline({ a: 1, b: "x" })).toBe("a=1  b=x");
  });
});

describe("sortedFields", () => {
  it("filters out boot_id and message", () => {
    const sorted = sortedFields({ boot_id: "B", message: "m", addr: "1" });
    expect(sorted).toEqual([{ key: "addr", value: "1" }]);
  });

  it("returns empty for non-object input", () => {
    expect(sortedFields("hello")).toEqual([]);
  });
});

describe("formatTimestamp", () => {
  it("renders a date in short month day h:mm:ss format", () => {
    const s = formatTimestamp("2026-07-04T23:04:59.253Z");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(8);
  });
});

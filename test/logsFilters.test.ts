import { describe, expect, it } from "vitest";
import {
  encodeExpand,
  encodeFields,
  fieldFiltersJson,
  logsParamsFromFilters,
  parseExpand,
  parseFields,
  type FieldFilter,
  type LogsState,
} from "~/composables/useLogsFilters";

function baseFilters(overrides: Partial<LogsState> = {}): LogsState {
  return {
    level: "info",
    target: [],
    search: undefined,
    timeRange: undefined,
    bootId: undefined,
    fieldFilters: [],
    spanId: undefined,
    expand: { events: [], spans: [] },
    since: undefined,
    until: undefined,
    ...overrides,
  };
}

describe("parseFields", () => {
  it("returns empty for empty input", () => {
    expect(parseFields("")).toEqual([]);
  });

  it("returns empty for malformed JSON", () => {
    expect(parseFields("{not json")).toEqual([]);
  });

  it("parses a flat object into pairs", () => {
    expect(parseFields('{"a":"1","b":"two"}')).toEqual([
      { key: "a", value: "1" },
      { key: "b", value: "two" },
    ]);
  });
});

describe("encodeFields", () => {
  it("returns undefined for empty input", () => {
    expect(encodeFields([])).toBeUndefined();
  });

  it("returns undefined when all pairs have empty values", () => {
    const filters: FieldFilter[] = [
      { key: "", value: "" },
      { key: "k", value: "" },
    ];
    expect(encodeFields(filters)).toBeUndefined();
  });

  it("drops pairs with empty values", () => {
    const filters: FieldFilter[] = [
      { key: "a", value: "1" },
      { key: "k", value: "" },
    ];
    expect(encodeFields(filters)).toBe('{"a":"1"}');
  });

  it("encodes all valid pairs", () => {
    const filters: FieldFilter[] = [
      { key: "a", value: "1" },
      { key: "b", value: "two" },
    ];
    expect(encodeFields(filters)).toBe('{"a":"1","b":"two"}');
  });
});

describe("encodeExpand / parseExpand round trip", () => {
  it("encodes events and spans", () => {
    expect(encodeExpand(["1", "2"], ["3"])).toEqual(["e-1", "e-2", "s-3"]);
  });

  it("parses a single string value", () => {
    expect(parseExpand("e-5")).toEqual({ events: ["5"], spans: [] });
  });

  it("parses an array of values", () => {
    expect(parseExpand(["e-1", "s-2", "e-3"])).toEqual({
      events: ["1", "3"],
      spans: ["2"],
    });
  });

  it("ignores garbage", () => {
    expect(parseExpand(["foo", "e-", 42, null])).toEqual({
      events: [],
      spans: [],
    });
  });

  it("round trips through encode/parse", () => {
    const encoded = encodeExpand(["10", "20"], ["30"]);
    expect(parseExpand(encoded)).toEqual({ events: ["10", "20"], spans: ["30"] });
  });
});

describe("logsParamsFromFilters", () => {
  it("returns undefined when no filters set", () => {
    expect(logsParamsFromFilters(baseFilters({ level: undefined }))).toBeUndefined();
  });

  it("emits level when set", () => {
    expect(logsParamsFromFilters(baseFilters({ level: "trace" }))).toEqual({
      min_level: "trace",
    });
    expect(logsParamsFromFilters(baseFilters({ level: "info" }))).toEqual({
      min_level: "info",
    });
  });

  it("maps search, target, spanId", () => {
    const p = logsParamsFromFilters(
      baseFilters({ search: "abc", target: ["aperture"], spanId: "7" }),
    );
    expect(p).toEqual({ min_level: "info", q: "abc", target: "aperture", span_id: "7" });
  });

  it("serializes multi-target as comma-separated string", () => {
    const p = logsParamsFromFilters(baseFilters({ target: ["aperture", "turso"] }));
    expect(p).toEqual({ min_level: "info", target: "aperture,turso" });
  });

  it("emits boot_id as a separate query param", () => {
    const p = logsParamsFromFilters(
      baseFilters({ bootId: "BOOT", fieldFilters: [{ key: "k", value: "v" }] }),
    );
    expect(p).toEqual({ min_level: "info", boot_id: "BOOT", fields: '{"k":"v"}' });
  });
});

describe("fieldFiltersJson", () => {
  it("returns undefined when no filters", () => {
    expect(fieldFiltersJson(baseFilters())).toBeUndefined();
  });

  it("encodes field filters without boot_id", () => {
    expect(
      fieldFiltersJson(baseFilters({ bootId: "B", fieldFilters: [{ key: "addr", value: "1" }] })),
    ).toBe('{"addr":"1"}');
  });
});

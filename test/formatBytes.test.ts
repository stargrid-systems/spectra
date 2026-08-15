import { describe, expect, it } from "vitest";
import { bytesToUnit } from "~/utils/formatBytes";

describe("bytesToUnit", () => {
  it("keeps small values in bytes", () => {
    expect(bytesToUnit(0)).toEqual({ value: 0, unit: "byte" });
    expect(bytesToUnit(42)).toEqual({ value: 42, unit: "byte" });
    expect(bytesToUnit(999)).toEqual({ value: 999, unit: "byte" });
  });

  it("scales up in steps of 1000", () => {
    expect(bytesToUnit(1000)).toEqual({ value: 1, unit: "kilobyte" });
    expect(bytesToUnit(1500)).toEqual({ value: 1.5, unit: "kilobyte" });
    expect(bytesToUnit(1_000_000)).toEqual({ value: 1, unit: "megabyte" });
    expect(bytesToUnit(2_500_000_000)).toEqual({ value: 2.5, unit: "gigabyte" });
    expect(bytesToUnit(3_000_000_000_000)).toEqual({ value: 3, unit: "terabyte" });
  });

  it("caps at terabyte", () => {
    expect(bytesToUnit(5_000_000_000_000_000)).toEqual({ value: 5000, unit: "terabyte" });
  });
});

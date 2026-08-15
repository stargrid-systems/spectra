import { describe, expect, it } from "vitest";
import {
  durationToUnitCombo,
  unitComboToDuration,
  type IntervalUnitCombo,
} from "~/utils/scheduleInterval";

describe("unitComboToDuration", () => {
  it("builds a duration from value and unit", () => {
    expect(unitComboToDuration({ value: 5, unit: "minute" }).toString()).toBe("PT5M");
    expect(unitComboToDuration({ value: 2, unit: "hour" }).toString()).toBe("PT2H");
    expect(unitComboToDuration({ value: 90, unit: "second" }).toString()).toBe("PT90S");
    expect(unitComboToDuration({ value: 3, unit: "day" }).toString()).toBe("P3D");
  });
});

describe("durationToUnitCombo", () => {
  it("round-trips simple durations", () => {
    const combo: IntervalUnitCombo = { value: 5, unit: "minute" };
    expect(durationToUnitCombo(unitComboToDuration(combo))).toEqual(combo);
  });

  it("picks the largest unit that divides evenly", () => {
    expect(durationToUnitCombo(Temporal.Duration.from("PT1H30M"))).toEqual({
      value: 90,
      unit: "minute",
    });
    expect(durationToUnitCombo(Temporal.Duration.from("P2D"))).toEqual({
      value: 2,
      unit: "day",
    });
    expect(durationToUnitCombo(Temporal.Duration.from("PT48H"))).toEqual({
      value: 2,
      unit: "day",
    });
  });

  it("returns undefined below one second", () => {
    expect(durationToUnitCombo(Temporal.Duration.from("PT0.5S"))).toBeUndefined();
    expect(durationToUnitCombo(Temporal.Duration.from({ milliseconds: 200 }))).toBeUndefined();
  });
});

import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { formatDuration } from "~~/modules/format/runtime/duration";

describe("formatDuration", () => {
  it("formats a sub-millisecond duration instead of collapsing to 0", () => {
    const d = Temporal.Duration.from({ nanoseconds: 500_000 });
    expect(formatDuration(d, "en")).toBe("0.5 ms");
  });

  it("formats a millisecond-scale duration", () => {
    expect(formatDuration(Temporal.Duration.from({ milliseconds: 5 }), "en")).toBe("5 ms");
  });

  it("promotes to the largest unit with magnitude >= 1", () => {
    expect(formatDuration(Temporal.Duration.from({ minutes: 5 }), "en")).toBe("5 min");
    expect(formatDuration(Temporal.Duration.from({ seconds: 90 }), "en")).toBe("1.5 min");
  });

  it("respects fractionDigits", () => {
    const d = Temporal.Duration.from({ milliseconds: 1, microseconds: 250 });
    expect(formatDuration(d, "en", { fractionDigits: 2 })).toBe("1.25 ms");
  });

  it("formats a zero duration using the smallest unit", () => {
    expect(formatDuration(Temporal.Duration.from({ seconds: 0 }), "en")).toBe("0 ms");
  });

  it("respects maxPrecision", () => {
    const d = Temporal.Duration.from({ minutes: 2, seconds: 30 });
    expect(formatDuration(d, "en", { maxPrecision: "minute" })).toBe("2.5 min");
  });
});

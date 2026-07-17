import type { DurationFormatOptions, DurationUnit, SimpleUnit } from "./types";

const ALL_UNITS: ReadonlyArray<[DurationUnit, SimpleUnit]> = [
  ["hour", "hour"],
  ["minute", "minute"],
  ["second", "second"],
  ["millisecond", "millisecond"],
];

export function formatDuration(
  value: Temporal.Duration,
  locale: string,
  options?: DurationFormatOptions,
): string {
  const fractionDigits = options?.fractionDigits ?? 1;
  const unitOpts = { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits };
  const maxPrecision: DurationUnit = options?.maxPrecision ?? "millisecond";
  const cutoff = ALL_UNITS.findIndex(([u]) => u === maxPrecision);
  const units = cutoff >= 0 ? ALL_UNITS.slice(0, cutoff + 1) : ALL_UNITS;
  for (const [i, [totalUnit, displayUnit]] of units.entries()) {
    const total = value.total(totalUnit);
    if (i === units.length - 1 || Math.abs(total) >= 1) {
      return new Intl.NumberFormat(locale, {
        ...unitOpts,
        style: "unit",
        unit: displayUnit,
      }).format(total);
    }
  }
  return "";
}

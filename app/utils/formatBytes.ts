import type { SimpleUnit } from "~~/modules/format/runtime/types";

const UNITS: readonly SimpleUnit[] = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];

/**
 * Picks the byte-multiple unit (base 1000) that shows the value with at
 * least one digit before the decimal point.
 */
export function bytesToUnit(bytes: number): { value: number; unit: SimpleUnit } {
  let value = bytes;
  let unitIndex = 0;
  while (unitIndex < UNITS.length - 1 && Math.abs(value) >= 1000) {
    value /= 1000;
    unitIndex++;
  }
  return { value, unit: UNITS[unitIndex]! };
}

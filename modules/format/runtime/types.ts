import type { PolyfilledUnit } from "./units";

/**
 * All simple unit identifiers sanctioned by ECMA-402 for use with
 * Intl.NumberFormat (style: "unit").
 *
 * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf#supported_unit_identifiers
 */
export type SimpleUnit =
  | "acre"
  | "bit"
  | "byte"
  | "celsius"
  | "centimeter"
  | "day"
  | "degree"
  | "fahrenheit"
  | "fluid-ounce"
  | "foot"
  | "gallon"
  | "gigabit"
  | "gigabyte"
  | "gram"
  | "hectare"
  | "hour"
  | "inch"
  | "kilobit"
  | "kilobyte"
  | "kilogram"
  | "kilometer"
  | "liter"
  | "megabit"
  | "megabyte"
  | "meter"
  | "microsecond"
  | "mile"
  | "mile-scandinavian"
  | "milliliter"
  | "millimeter"
  | "millisecond"
  | "minute"
  | "month"
  | "nanosecond"
  | "ounce"
  | "percent"
  | "petabyte"
  | "pound"
  | "second"
  | "stone"
  | "terabit"
  | "terabyte"
  | "week"
  | "yard"
  | "year";

/**
 * Any valid unit identifier.
 *
 * Includes ECMA-402 sanctioned units, compound unit-per-unit
 * combinations, and polyfilled units not in the ECMA-402 subset.
 */
export type UnitIdentifier = SimpleUnit | `${SimpleUnit}-per-${SimpleUnit}` | PolyfilledUnit;

export type UnitFormatOptions = Omit<Intl.NumberFormatOptions, "style" | "unit">;

export type PercentFormatOptions = Omit<Intl.NumberFormatOptions, "style">;

export type DurationUnit = "hour" | "minute" | "second" | "millisecond";

export interface DurationFormatOptions {
  maxPrecision?: DurationUnit;
  fractionDigits?: number;
}

export type TemporalDate =
  | Temporal.Instant
  | Temporal.ZonedDateTime
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay;

export interface Formatter {
  number(value: number, options?: Intl.NumberFormatOptions): string;
  unit(value: number, unit: UnitIdentifier, options?: UnitFormatOptions): string;
  percent(value: number, options?: PercentFormatOptions): string;
  date(value: TemporalDate, options?: Intl.DateTimeFormatOptions): string;
  dateRange(
    start: Temporal.Instant,
    end: Temporal.Instant,
    options?: Intl.DateTimeFormatOptions,
  ): string;
  duration(value: Temporal.Duration, options?: DurationFormatOptions): string;
  relativeTime(duration: Temporal.Duration, options?: Intl.RelativeTimeFormatOptions): string;
  list(items: Iterable<string>, options?: Intl.ListFormatOptions): string;
  toInputDatetimeLocal(value: Temporal.Instant): string;
  fromInputDatetimeLocal(value: string): Temporal.Instant | undefined;
}

import type {
  DurationFormatOptions,
  Formatter,
  SimpleUnit,
  TemporalDate,
  UnitIdentifier,
} from "../types";
import type { PolyfilledUnit } from "../units";
import { polyfilledUnits } from "../units";
import { useI18n } from "#imports";

export function useFormatter(): Formatter {
  const { locale, t } = useI18n();

  function formatPolyfilled(
    value: number,
    unit: PolyfilledUnit,
    options: Intl.NumberFormatOptions | undefined,
  ): string {
    const display = options?.unitDisplay ?? "short";
    const formatted = new Intl.NumberFormat(locale.value, options).format(value);
    return t(`units.${unit}.${display}`, { n: formatted }, value);
  }

  return {
    number: (value, options) => new Intl.NumberFormat(locale.value, options).format(value),

    unit: (value, unit: UnitIdentifier, options) => {
      if ((polyfilledUnits as readonly string[]).includes(unit)) {
        return formatPolyfilled(value, unit as PolyfilledUnit, options);
      }
      const opts: Intl.NumberFormatOptions = { ...options, style: "unit", unit };
      return new Intl.NumberFormat(locale.value, opts).format(value);
    },

    percent: (value, options) =>
      new Intl.NumberFormat(locale.value, {
        ...options,
        style: "percent",
      }).format(value),

    date: (value: TemporalDate, options) => value.toLocaleString(locale.value, options),

    dateRange: (start: Temporal.Instant, end: Temporal.Instant, options) =>
      new Intl.DateTimeFormat(locale.value, options).formatRange(
        new Date(start.epochMilliseconds),
        new Date(end.epochMilliseconds),
      ),

    duration: (value: Temporal.Duration, options: DurationFormatOptions) => {
      const precision = options?.precision ?? 1;
      const unitOpts = { minimumFractionDigits: 0, maximumFractionDigits: precision };
      const units: Array<["hour" | "minute" | "second" | "millisecond", SimpleUnit]> = [
        ["hour", "hour"],
        ["minute", "minute"],
        ["second", "second"],
        ["millisecond", "millisecond"],
      ];
      for (const [totalUnit, displayUnit] of units) {
        const total = value.total(totalUnit);
        if (Math.abs(total) >= 1) {
          return new Intl.NumberFormat(locale.value, {
            ...unitOpts,
            style: "unit",
            unit: displayUnit,
          }).format(total);
        }
      }
      return new Intl.NumberFormat(locale.value, {
        ...unitOpts,
        style: "unit",
        unit: "millisecond",
      }).format(0);
    },

    relativeTime: (duration: Temporal.Duration, options) => {
      const entries: Array<[number, Intl.RelativeTimeFormatUnit]> = [
        [duration.years, "year"],
        [duration.months, "month"],
        [duration.weeks, "week"],
        [duration.days, "day"],
        [duration.hours, "hour"],
        [duration.minutes, "minute"],
        [duration.seconds, "second"],
      ];
      for (const [value, unit] of entries) {
        if (value !== 0) {
          return new Intl.RelativeTimeFormat(locale.value, options).format(value, unit);
        }
      }
      return new Intl.RelativeTimeFormat(locale.value, options).format(0, "second");
    },

    list: (items, options) => new Intl.ListFormat(locale.value, options).format(items),

    toInputDatetimeLocal: (value: Temporal.Instant) =>
      value
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .toPlainDateTime()
        .toString({ smallestUnit: "minute" }),

    fromInputDatetimeLocal: (value: string) => {
      if (!value) return undefined;
      return Temporal.PlainDateTime.from(value)
        .toZonedDateTime(Temporal.Now.timeZoneId())
        .toInstant();
    },
  };
}

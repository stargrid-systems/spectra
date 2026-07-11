import type { Formatter, TemporalDate, UnitIdentifier } from "../types";
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
  };
}

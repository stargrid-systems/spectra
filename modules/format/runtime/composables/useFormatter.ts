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
    return t(`units.${unit}.${display}` as string, { n: formatted }, value);
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

    relativeTime: (value, unit, options) =>
      new Intl.RelativeTimeFormat(locale.value, options).format(value, unit),

    list: (items, options) => new Intl.ListFormat(locale.value, options).format(items),
  };
}

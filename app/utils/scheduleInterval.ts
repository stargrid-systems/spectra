// "week" is excluded on purpose: Temporal cannot total weeks exactly, and
// aperture stores microseconds.
export const INTERVAL_UNITS = ["second", "minute", "hour", "day"] as const;

export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export interface IntervalUnitCombo {
  value: number;
  unit: IntervalUnit;
}

export function unitComboToDuration(combo: IntervalUnitCombo): Temporal.Duration {
  return Temporal.Duration.from({ [`${combo.unit}s`]: combo.value });
}

/**
 * Expresses a duration as a whole number of the largest unit that divides it
 * evenly (PT1H30M becomes 90 minutes). Returns undefined for durations below
 * one second, which have no clean unit representation in the combo input.
 */
export function durationToUnitCombo(duration: Temporal.Duration): IntervalUnitCombo | undefined {
  for (const unit of [...INTERVAL_UNITS].reverse()) {
    const total = duration.total(unit);
    if (total >= 1 && Number.isInteger(total)) {
      return { value: total, unit };
    }
  }
  return undefined;
}

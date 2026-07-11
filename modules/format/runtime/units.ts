/**
 * Units not sanctioned by ECMA-402 but needed by the application.
 * Patterns for each unit are defined in the i18n catalog under
 * `units.<unit>.<long|short|narrow>` using `{n}` as the number
 * placeholder and pipe syntax for pluralization.
 */
export const polyfilledUnits = ["kilowatt"] as const;

export type PolyfilledUnit = (typeof polyfilledUnits)[number];

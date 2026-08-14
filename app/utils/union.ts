/**
 * Returns `values` unchanged and fails to compile unless the array covers
 * every member of `union`.
 *
 *     const LEVELS = assertUnionCoverage<Level>()(["low", "high"] as const);
 */
export function assertUnionCoverage<Union extends string>() {
  return <Values extends readonly Union[]>(
    values: Values & ([Exclude<Union, Values[number]>] extends [never] ? unknown : never),
  ): Values => values;
}

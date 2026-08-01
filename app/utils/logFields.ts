export function asFields(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return undefined;
  if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;
  return value as Record<string, unknown>;
}

export function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function formatFieldsInline(fields: unknown): string {
  const f = asFields(fields);
  if (!f) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(f)) {
    parts.push(`${key}=${formatValue(value)}`);
  }
  return parts.join("  ");
}

export function sortedFields(fields: unknown): { key: string; value: unknown }[] {
  const f = asFields(fields);
  if (!f) return [];
  return Object.entries(f)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));
}

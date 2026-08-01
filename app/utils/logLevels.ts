export type BadgeColor =
  "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral";

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

export const LEVEL_COLORS: Record<LogLevel, BadgeColor> = {
  trace: "neutral",
  debug: "info",
  info: "primary",
  warn: "warning",
  error: "error",
};

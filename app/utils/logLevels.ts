import type { LevelResponse } from "~~/modules/aperture/runtime/types";
import { assertUnionCoverage } from "~/utils/union";

export type BadgeColor =
  "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral";

export const LOG_LEVELS = assertUnionCoverage<LevelResponse>()([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
] as const);
export type LogLevel = LevelResponse;

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

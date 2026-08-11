import * as z from "zod/v4/mini";
import type { Role } from "~~/modules/aperture/runtime/types";

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 1024;

export interface PasswordRequirement {
  key: string;
  satisfied: boolean;
}

export const PASSWORD_RULES = [
  { key: "minLength", test: (v: string) => v.length >= PASSWORD_MIN },
] as const;

export function passwordRequirements(value: string): PasswordRequirement[] {
  return PASSWORD_RULES.map((rule) => ({ key: rule.key, satisfied: rule.test(value) }));
}

const requiredString = z.string().check(z.minLength(1));
const usernameField = z.string().check(z.minLength(1), z.maxLength(64), z.regex(USERNAME_PATTERN));
const newPasswordField = z.string().check(z.minLength(PASSWORD_MIN), z.maxLength(PASSWORD_MAX));
const roleField = z.optional(z.enum(["admin", "operator", "viewer"]));

export type LoginValues = z.infer<typeof loginSchema>;
export const loginSchema = z.object({
  username: requiredString,
  password: requiredString,
});

export type SetupValues = z.infer<typeof setupSchema>;
export const setupSchema = z.object({
  username: usernameField,
  password: newPasswordField,
  confirmPassword: requiredString,
});

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export const changePasswordSchema = z.object({
  currentPassword: requiredString,
  newPassword: newPasswordField,
  confirmPassword: requiredString,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export const createUserSchema = z.object({
  username: usernameField,
  password: newPasswordField,
  role: roleField,
});

export type CreateApiKeyValues = z.infer<typeof createApiKeySchema>;
export const createApiKeySchema = z.object({
  name: requiredString,
  role: roleField,
});

export function isRole(value: string): value is Role {
  return value === "admin" || value === "operator" || value === "viewer";
}

import * as z from "zod/v4/mini";

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 1024;

const requiredString = z.string().check(z.minLength(1));
const usernameField = z.string().check(z.minLength(1), z.maxLength(64), z.regex(USERNAME_PATTERN));
const newPasswordField = z.string().check(z.minLength(PASSWORD_MIN), z.maxLength(PASSWORD_MAX));

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

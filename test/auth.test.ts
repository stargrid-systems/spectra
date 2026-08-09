import { describe, expect, it } from "vitest";
import * as z from "zod/v4/mini";
import { changePasswordSchema, loginSchema, PASSWORD_MIN, setupSchema } from "~/utils/auth";

function ok(schema: z.core.$ZodType, data: unknown): boolean {
  return z.safeParse(schema, data).success;
}

describe("loginSchema", () => {
  it("accepts non-empty username and password", () => {
    expect(ok(loginSchema, { username: "alice", password: "secret123456" })).toBe(true);
  });

  it("rejects empty fields", () => {
    expect(ok(loginSchema, { username: "", password: "x" })).toBe(false);
    expect(ok(loginSchema, { username: "a", password: "" })).toBe(false);
  });
});

describe("setupSchema", () => {
  const valid = { username: "admin", password: "secure-pass-1", confirmPassword: "secure-pass-1" };

  it("accepts a valid admin with matching passwords", () => {
    expect(ok(setupSchema, valid)).toBe(true);
  });

  it("enforces the password minimum length", () => {
    expect(ok(setupSchema, { ...valid, password: "x".repeat(PASSWORD_MIN - 1) })).toBe(false);
  });

  it("rejects invalid username characters", () => {
    expect(ok(setupSchema, { ...valid, username: "bad name" })).toBe(false);
    expect(ok(setupSchema, { ...valid, username: "ünicode" })).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "old-password-1",
    newPassword: "new-password-1",
    confirmPassword: "new-password-1",
  };

  it("accepts a valid change", () => {
    expect(ok(changePasswordSchema, valid)).toBe(true);
  });

  it("requires all fields", () => {
    expect(ok(changePasswordSchema, { ...valid, currentPassword: "" })).toBe(false);
  });
});

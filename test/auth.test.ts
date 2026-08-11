import { describe, expect, it } from "vitest";
import * as z from "zod/v4/mini";
import {
  changePasswordSchema,
  createApiKeySchema,
  createUserSchema,
  isRole,
  loginSchema,
  PASSWORD_MIN,
  passwordRequirements,
  setupSchema,
} from "~/utils/auth";

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

describe("createUserSchema", () => {
  it("accepts a user with an optional role", () => {
    expect(
      ok(createUserSchema, { username: "bob", password: "secure-pass-1", role: "operator" }),
    ).toBe(true);
    expect(ok(createUserSchema, { username: "bob", password: "secure-pass-1" })).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(
      ok(createUserSchema, { username: "bob", password: "secure-pass-1", role: "superuser" }),
    ).toBe(false);
  });
});

describe("createApiKeySchema", () => {
  it("accepts a name with an optional role", () => {
    expect(ok(createApiKeySchema, { name: "ci" })).toBe(true);
    expect(ok(createApiKeySchema, { name: "ci", role: "viewer" })).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ok(createApiKeySchema, { name: "" })).toBe(false);
  });
});

describe("isRole", () => {
  it("narrows to known roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("operator")).toBe(true);
    expect(isRole("viewer")).toBe(true);
    expect(isRole("superuser")).toBe(false);
  });
});

describe("passwordRequirements", () => {
  it("marks the minimum length unmet below the threshold", () => {
    const result = passwordRequirements("x".repeat(PASSWORD_MIN - 1));
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("minLength");
    expect(result[0].satisfied).toBe(false);
  });

  it("marks the minimum length met at and above the threshold", () => {
    expect(passwordRequirements("x".repeat(PASSWORD_MIN))[0].satisfied).toBe(true);
    expect(passwordRequirements("x".repeat(PASSWORD_MIN + 10))[0].satisfied).toBe(true);
  });

  it("treats the empty password as unmet", () => {
    expect(passwordRequirements("")[0].satisfied).toBe(false);
  });
});

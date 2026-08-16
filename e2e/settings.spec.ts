import { expect, test } from "@playwright/test";

const stubSettings = [
  { key: "aperture.log.level", value: { min_level: "info", format: "json" } },
  { key: "aperture.avatar.style", value: "constellation" },
  { key: "mystery.key", value: { any: ["shape"] } },
];

const stubDefinitions = {
  "aperture.log.level": {
    type: "object",
    required: ["min_level", "format"],
    properties: {
      min_level: { type: "string", enum: ["trace", "debug", "info", "warn", "error"] },
      format: { type: "string", enum: ["json", "text"] },
    },
  },
  "aperture.avatar.style": { type: "string", enum: ["constellation", "identicon", "bottts"] },
};

const definitionSummaries = [{ key: "aperture.log.level" }, { key: "aperture.avatar.style" }];

function stubSettingsApi(
  page: import("@playwright/test").Page,
  captured: { puts: { key: string; body: unknown }[] },
) {
  return page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/v1/auth/setup-status") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ setup_required: false }),
      });
      return;
    }

    if (pathname === "/api/v1/auth/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          actor_id: "2",
          user_id: "1",
          display_name: "admin",
          username: "admin",
          roles: ["admin"],
          must_change_password: false,
        }),
      });
      return;
    }

    if (pathname === "/api/v1/setting-definitions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: definitionSummaries, next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    const defMatch = pathname.match(/^\/api\/v1\/setting-definitions\/(.+)$/);
    if (defMatch) {
      const key = decodeURIComponent(defMatch[1]!);
      const value_schema = stubDefinitions[key as keyof typeof stubDefinitions];
      if (!value_schema) {
        await route.fulfill({ status: 404 });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ key, value_schema }),
      });
      return;
    }

    const putMatch = pathname.match(/^\/api\/v1\/settings\/(.+)$/);
    if (putMatch && request.method() === "PUT") {
      captured.puts.push({ key: decodeURIComponent(putMatch[1]!), body: request.postDataJSON() });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          key: putMatch[1],
          value: request.postDataJSON()?.value ?? null,
        }),
      });
      return;
    }

    if (pathname === "/api/v1/settings") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stubSettings),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test("settings render schema-driven and edit through the form", async ({ page }) => {
  const captured = { puts: [] as { key: string; body: unknown }[] };
  await stubSettingsApi(page, captured);

  await page.goto("/en/settings/system", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("System settings", { exact: true })).toBeVisible();
  await expect(page.getByText("aperture.log.level", { exact: true })).toBeVisible();

  // Schema-driven rendering: enum values become badges, fields get labels.
  await expect(page.getByText("min_level:")).toBeVisible();
  await expect(page.getByText("info").first()).toBeVisible();
  await expect(page.getByText("format:")).toBeVisible();
  await expect(page.getByText("json").first()).toBeVisible();

  // Open the editor for the object setting: a schema-driven form appears.
  await page.getByRole("button", { name: "Edit setting" }).nth(0).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const selects = dialog.getByRole("button", { name: "Show popup" });
  await selects.nth(0).click();
  await page.getByRole("option", { name: "debug" }).click();

  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => captured.puts.length).toBe(1);
  expect(captured.puts[0]).toEqual({
    key: "aperture.log.level",
    body: { value: { min_level: "debug", format: "json" } },
  });
});

test("scalar settings edit through a single field", async ({ page }) => {
  const captured = { puts: [] as { key: string; body: unknown }[] };
  await stubSettingsApi(page, captured);

  await page.goto("/en/settings/system", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Edit setting" }).nth(1).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Show popup" }).click();
  await page.getByRole("option", { name: "identicon" }).click();

  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => captured.puts.length).toBe(1);
  expect(captured.puts[0]).toEqual({
    key: "aperture.avatar.style",
    body: { value: "identicon" },
  });
});

test("keys without a definition fall back to raw JSON editing", async ({ page }) => {
  const captured = { puts: [] as { key: string; body: unknown }[] };
  await stubSettingsApi(page, captured);

  await page.goto("/en/settings/system", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Edit setting" }).nth(2).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/raw JSON/)).toBeVisible();

  // Invalid JSON is caught client-side and never sent.
  const editor = dialog.locator("textarea");
  await editor.fill("{ not json");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("The text is not valid JSON.")).toBeVisible();
  expect(captured.puts).toHaveLength(0);

  await editor.fill('{"any":["shape","more"]}');
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => captured.puts.length).toBe(1);
  expect(captured.puts[0]).toEqual({
    key: "mystery.key",
    body: { value: { any: ["shape", "more"] } },
  });
});

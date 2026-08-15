import { expect, test } from "@playwright/test";

const stubSettings = [
  { key: "aperture.avatar.style", value: "constellation" },
  { key: "aperture.log.level", value: { min_level: "info", format: "json" } },
];

function stubSettingsApi(
  page: import("@playwright/test").Page,
  captured: { puts: { key: string; body: unknown }[] },
) {
  return page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

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

test("system settings list and JSON editor", async ({ page }) => {
  const captured = { puts: [] as { key: string; body: unknown }[] };
  await stubSettingsApi(page, captured);

  await page.goto("/en/settings/system", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("System settings", { exact: true })).toBeVisible();
  await expect(page.getByText("aperture.avatar.style", { exact: true })).toBeVisible();
  await expect(page.getByText('"constellation"')).toBeVisible();

  // Open the editor for the object-valued setting.
  await page
    .locator("div")
    .filter({ hasText: /^aperture\.log\.level/ })
    .getByRole("button", { name: "Edit setting" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Invalid JSON is caught client-side and never sent.
  const editor = dialog.locator("textarea");
  await editor.fill("{ not json");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("The text is not valid JSON.")).toBeVisible();
  expect(captured.puts).toHaveLength(0);

  // A valid edit parses and PUTs the typed JSON.
  await editor.fill('{"min_level":"debug","format":"json"}');
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => captured.puts.length).toBe(1);
  expect(captured.puts[0]).toEqual({
    key: "aperture.log.level",
    body: { value: { min_level: "debug", format: "json" } },
  });
});

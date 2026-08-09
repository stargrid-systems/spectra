import { expect, test } from "@playwright/test";

type AuthMode = "unauthenticated" | "setupRequired" | "mustChangePassword";

function stubApi(mode: AuthMode) {
  return async (route: import("@playwright/test").Route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/v1/auth/setup-status") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ setup_required: mode === "setupRequired" }),
      });
      return;
    }

    if (pathname === "/api/v1/auth/me") {
      if (mode === "mustChangePassword") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            actor_id: "2",
            display_name: "admin",
            username: "admin",
            role: "admin",
            must_change_password: true,
          }),
        });
      } else {
        await route.fulfill({ status: 401 });
      }
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  };
}

test.describe("auth redirects", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.route("**/api/v1/**", stubApi("unauthenticated"));
    await page.goto("/en/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test("redirects to setup when first-run setup is required", async ({ page }) => {
    await page.route("**/api/v1/**", stubApi("setupRequired"));
    await page.goto("/en/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/setup$/);
  });

  test("redirects to change-password when a password change is required", async ({ page }) => {
    await page.route("**/api/v1/**", stubApi("mustChangePassword"));
    await page.goto("/en/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/change-password$/);
  });
});

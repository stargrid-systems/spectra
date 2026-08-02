import { Temporal } from "@js-temporal/polyfill";
import { expect, test } from "@playwright/test";

const listLogsPath = "/api/v1/logs";

function isListLogs(url: string): boolean {
  try {
    return new URL(url).pathname === listLogsPath;
  } catch {
    return false;
  }
}

function stubBody(pathname: string): unknown {
  switch (pathname) {
    case "/api/v1/logs":
      return { items: [], next_cursor: null };
    case "/api/v1/logs/targets":
    case "/api/v1/logs/boots":
      return [];
    default:
      return {};
  }
}

test("refresh advances the relative time window", async ({ page }) => {
  const sinceValues: string[] = [];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === listLogsPath) {
      sinceValues.push(url.searchParams.get("since") ?? "");
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stubBody(url.pathname)),
    });
  });

  const firstLoad = page.waitForResponse((r) => isListLogs(r.url()));
  await page.goto("/en/developer/logs/events?range=5m", { waitUntil: "domcontentloaded" });
  await firstLoad;

  const since1 = sinceValues[sinceValues.length - 1];
  expect(since1).toBeTruthy();

  const secondLoad = page.waitForResponse((r) => isListLogs(r.url()));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await secondLoad;

  const since2 = sinceValues[sinceValues.length - 1];
  expect(since2).toBeTruthy();
  expect(Temporal.Instant.from(since2).epochNanoseconds).toBeGreaterThan(
    Temporal.Instant.from(since1).epochNanoseconds,
  );
});

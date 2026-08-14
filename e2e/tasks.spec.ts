import { Temporal } from "@js-temporal/polyfill";
import { expect, test } from "@playwright/test";

const TASKS_PATH = "/api/v1/tasks";

function iso(msAgo: number): string {
  return new Temporal.Instant(
    BigInt(Temporal.Now.instant().epochMilliseconds - msAgo) * 1_000_000n,
  ).toString();
}

const stubTasks = [
  {
    id: "task-1",
    kind: "download",
    status: "succeeded",
    input: {},
    created_at: iso(60_000),
    started_at: iso(59_000),
    finished_at: iso(30_000),
  },
  {
    id: "task-2",
    kind: "rotate-certificate",
    status: "running",
    input: {},
    created_at: iso(10_000),
    started_at: iso(9_000),
    progress: { done: 4, total: 10, message: null },
  },
];

test("tasks list renders statuses and progress", async ({ page }) => {
  const taskRequests: string[] = [];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
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

    if (pathname === TASKS_PATH) {
      taskRequests.push(url.search);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: stubTasks, next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    if (pathname === "/api/v1/task-definitions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/en/operations/tasks", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("download", { exact: true })).toBeVisible();
  await expect(page.getByText("rotate-certificate", { exact: true })).toBeVisible();
  await expect(page.getByText("Succeeded")).toBeVisible();
  await expect(page.getByText("40%")).toBeVisible();

  // The list asks for top-level tasks only by default.
  expect(taskRequests[0]).toContain("root=true");
});

const stubDetail = {
  ...stubTasks[1],
  output: undefined,
};

test("task detail renders and cancels", async ({ page }) => {
  let cancelCalled = false;

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
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

    if (pathname === "/api/v1/tasks/task-2") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(cancelCalled ? { ...stubDetail, status: "cancelled" } : stubDetail),
      });
      return;
    }

    if (pathname === "/api/v1/tasks/task-2/cancel") {
      cancelCalled = true;
      await route.fulfill({ status: 202 });
      return;
    }

    if (pathname === "/api/v1/tasks") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    if (pathname === "/api/v1/task-definitions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            kind: "rotate-certificate",
            cancellable: true,
            resumable: false,
            input_schema: {},
            output_schema: {},
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/en/operations/tasks/task-2", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "rotate-certificate" })).toBeVisible();
  await expect(page.getByText("40%")).toBeVisible();
  await expect(page.getByText("Child tasks", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cancel task" }).click();
  await expect(page.getByText("Cancelled")).toBeVisible({ timeout: 10_000 });
});

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

const ociInput = {
  key: "spectra",
  source: {
    type: "oci",
    reference: "ghcr.io/stargrid-systems/spectra:1",
    media_type: "application/vnd.oci.image.layer.v1.tar",
  },
};

const downloadDefinition = {
  kind: "rotate-certificate",
  cancellable: true,
  resumable: false,
  input_schema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Logical key to record the artifact under." },
      source: {
        oneOf: [
          {
            type: "object",
            required: ["reference", "media_type", "type"],
            properties: {
              reference: { type: "string", description: "The image reference." },
              media_type: { type: "string" },
              type: { type: "string", enum: ["oci"] },
            },
          },
        ],
      },
    },
  },
  output_schema: {},
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
        body: JSON.stringify(
          cancelCalled
            ? { ...stubDetail, status: "cancelled", input: ociInput }
            : { ...stubDetail, input: ociInput },
        ),
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
        body: JSON.stringify([downloadDefinition]),
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

  // Schema-driven input view shows labeled fields from the definition schema.
  await expect(page.getByTitle("Logical key to record the artifact under.")).toBeVisible();
  await expect(page.getByTitle("The image reference.")).toBeVisible();
  await expect(page.getByText("ghcr.io/stargrid-systems/spectra:1")).toBeVisible();

  // The raw toggle switches to plain JSON.
  await page
    .locator("section, div")
    .filter({ hasText: "Input" })
    .getByRole("button", { name: "Raw JSON" })
    .first()
    .click();
  await expect(page.getByText('"key": "spectra"')).toBeVisible();

  await page.getByRole("button", { name: "Cancel task" }).click();
  await expect(page.getByText("Cancelled")).toBeVisible({ timeout: 10_000 });
});

const createDefinitions = [
  {
    kind: "rotate-certificate",
    cancellable: false,
    resumable: true,
    input_schema: { type: "object" },
    output_schema: { type: "object" },
  },
  {
    kind: "download",
    cancellable: true,
    resumable: false,
    input_schema: downloadDefinition.input_schema,
    output_schema: { type: "object" },
  },
];

test("create task form is driven by the kind schema", async ({ page }) => {
  const created: unknown[] = [];
  await page.route("**/api/v1/**", async (route) => {
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

    if (pathname === "/api/v1/tasks" && request.method() === "POST") {
      created.push(request.postDataJSON());
      await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
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
        body: JSON.stringify(createDefinitions),
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
  await page.getByRole("button", { name: "New task" }).click();

  // Default kind (first definition) takes no parameters.
  await expect(page.getByText("No parameters.")).toBeVisible();

  // Switch to the download kind: schema fields appear.
  await page.getByRole("button", { name: "Show popup" }).click();
  await page.getByRole("option", { name: "download" }).click();

  // The schema-driven inputs replace their DOM nodes once, right after the
  // kind switch; a fill landing on the stale node is lost. Verify and retry.
  const typeStable = async (name: string, value: string) => {
    const box = page.getByRole("textbox", { name });
    await box.click();
    await page.keyboard.type(value, { delay: 20 });
    await expect(box).toHaveValue(value);
  };

  await typeStable("key", "firmware");
  await typeStable("reference", "ghcr.io/stargrid-systems/firmware:1.2.3");
  await typeStable("media_type", "application/vnd.oci.image.layer.v1.tar");

  await page.getByRole("button", { name: "Create" }).click();

  await expect.poll(() => created.length).toBe(1);
  expect(created[0]).toEqual({
    kind: "download",
    input: {
      key: "firmware",
      source: {
        type: "oci",
        reference: "ghcr.io/stargrid-systems/firmware:1.2.3",
        media_type: "application/vnd.oci.image.layer.v1.tar",
      },
    },
  });
});

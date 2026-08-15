import { Temporal } from "@js-temporal/polyfill";
import { expect, test } from "@playwright/test";

function iso(msFromNow: number): string {
  return new Temporal.Instant(
    BigInt(Temporal.Now.instant().epochMilliseconds + msFromNow) * 1_000_000n,
  ).toString();
}

const stubSchedule = {
  id: "sched-1",
  kind: "download",
  input: {
    key: "firmware",
    source: {
      type: "oci",
      reference: "ghcr.io/org/firmware:1",
      media_type: "application/vnd.oci.image.layer.v1.tar",
    },
  },
  interval: "PT5M",
  next_run_at: iso(60_000),
  enabled: true,
  created_at: iso(-3_600_000),
  last_run_at: null,
  last_task_id: null,
};

const downloadDefinition = {
  kind: "download",
  cancellable: true,
  resumable: false,
  input_schema: {
    type: "object",
    required: ["key", "source"],
    properties: {
      key: { type: "string", description: "Logical key to record the artifact under." },
      source: {
        oneOf: [
          {
            type: "object",
            required: ["reference", "media_type", "type"],
            properties: {
              reference: { type: "string" },
              media_type: { type: "string" },
              type: { type: "string", enum: ["oci"] },
            },
          },
        ],
      },
    },
  },
  output_schema: { type: "object" },
};

function stubSchedulesApi(
  page: import("@playwright/test").Page,
  captured: { patches: unknown[]; creates: unknown[] },
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

    if (pathname === "/api/v1/task-definitions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([downloadDefinition]),
      });
      return;
    }

    if (pathname === "/api/v1/task-schedules/sched-1") {
      captured.patches.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stubSchedule),
      });
      return;
    }

    if (pathname === "/api/v1/task-schedules" && request.method() === "POST") {
      captured.creates.push(request.postDataJSON());
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(stubSchedule),
      });
      return;
    }

    if (pathname === "/api/v1/task-schedules") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [stubSchedule], next_cursor: null, prev_cursor: null }),
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

test("schedules list renders and toggling fires a patch", async ({ page }) => {
  const captured = { patches: [] as unknown[], creates: [] as unknown[] };
  await stubSchedulesApi(page, captured);

  await page.goto("/en/operations/schedules", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Schedules" })).toBeVisible();
  await expect(page.getByText("download", { exact: true })).toBeVisible();
  await expect(page.getByText("5 min", { exact: true })).toBeVisible();
  // The input renders through the schema-driven viewer.
  await expect(page.getByTitle("Logical key to record the artifact under.")).toBeVisible();

  await page.getByRole("switch").click();
  await expect.poll(() => captured.patches.length).toBe(1);
  expect(captured.patches[0]).toEqual({ enabled: false });
});

test("create schedule posts kind, schema-driven input, and interval", async ({ page }) => {
  const captured = { patches: [] as unknown[], creates: [] as unknown[] };
  await stubSchedulesApi(page, captured);

  await page.goto("/en/operations/schedules", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "New schedule" }).click();

  const typeStable = async (name: string, value: string) => {
    const box = page.getByRole("textbox", { name });
    await box.click();
    await page.keyboard.type(value, { delay: 20 });
    await expect(box).toHaveValue(value);
  };

  await typeStable("key", "firmware");
  await typeStable("reference", "ghcr.io/org/firmware:2");
  await typeStable("media_type", "application/vnd.oci.image.layer.v1.tar");

  const number = page.getByRole("spinbutton");
  await number.click();
  await page.keyboard.type("10", { delay: 20 });
  await expect(number).toHaveValue("10");

  await page.getByRole("button", { name: "Create" }).click();

  await expect.poll(() => captured.creates.length).toBe(1);
  expect(captured.creates[0]).toEqual({
    kind: "download",
    input: {
      key: "firmware",
      source: {
        type: "oci",
        reference: "ghcr.io/org/firmware:2",
        media_type: "application/vnd.oci.image.layer.v1.tar",
      },
    },
    interval: "PT10M",
  });
});

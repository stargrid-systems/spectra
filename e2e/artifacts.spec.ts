import { Temporal } from "@js-temporal/polyfill";
import { expect, test } from "@playwright/test";

function iso(msAgo: number): string {
  return new Temporal.Instant(
    BigInt(Temporal.Now.instant().epochMilliseconds - msAgo) * 1_000_000n,
  ).toString();
}

const stubArtifacts = [
  {
    key: "spectra",
    version: "2026.8.3",
    version_count: 3,
    digest: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    size_bytes: 2_500_000,
    source: "oci:ghcr.io/stargrid-systems/spectra:2026.8.3",
    downloaded_at: iso(3_600_000),
  },
];

const stubVersions = [
  {
    key: "spectra",
    digest: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    version: "2026.8.3",
    media_type: "application/vnd.oci.image.layer.v1.tar",
    size_bytes: 2_500_000,
    source: "oci:ghcr.io/stargrid-systems/spectra:2026.8.3",
    downloaded_at: iso(3_600_000),
    verified_at: null,
  },
];

test("artifacts list, versions view, download, and evict", async ({ page }) => {
  const captured = { listQueries: [] as string[], deletes: [] as string[] };

  await page.route("**/api/v1/**", async (route) => {
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

    if (pathname === "/api/v1/artifacts" && request.method() === "GET") {
      captured.listQueries.push(url.search);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: stubArtifacts, next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    if (pathname === "/api/v1/artifacts/spectra/versions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: stubVersions, next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    const evictPattern = /^\/api\/v1\/artifacts\/spectra\/versions\/(.+)$/;
    const evictMatch = pathname.match(evictPattern);
    if (evictMatch && request.method() === "DELETE") {
      captured.deletes.push(evictMatch[1]!);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/en/operations/artifacts", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Artifacts" })).toBeVisible();
  await expect(page.getByText("spectra", { exact: true })).toBeVisible();
  await expect(page.getByText("3 versions")).toBeVisible();

  // Open the versions view for the key.
  await page.getByText("spectra", { exact: true }).click();
  await expect(page).toHaveURL(/key=spectra/);
  await expect(
    page.getByText("sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  ).toBeVisible();
  await expect(page.getByText("application/vnd.oci.image.layer.v1.tar")).toBeVisible();

  // Download is a plain link to the blob endpoint.
  const download = page.getByRole("link", { name: "Download" });
  await expect(download).toHaveAttribute(
    "href",
    "/api/v1/artifacts/spectra/versions/sha256%3A0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/blob",
  );

  // Evict fires the DELETE against the digest.
  await page.getByRole("button", { name: "Evict" }).click();
  await expect.poll(() => captured.deletes.length).toBe(1);
  expect(captured.deletes[0]).toMatch(/^sha256/);
});

test("upload posts the file body under the key", async ({ page }) => {
  const captured = { uploads: [] as { key: string; body: string }[] };

  await page.route("**/api/v1/**", async (route) => {
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

    const uploadMatch = pathname.match(/^\/api\/v1\/artifacts\/([^/]+)$/);
    if (uploadMatch && request.method() === "PUT") {
      captured.uploads.push({ key: uploadMatch[1]!, body: request.postData() ?? "" });
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(stubVersions[0]),
      });
      return;
    }

    if (pathname === "/api/v1/artifacts") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], next_cursor: null, prev_cursor: null }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/en/operations/artifacts", { waitUntil: "domcontentloaded" });

  // Wait for the app to finish hydrating before interacting.
  await expect(page.getByText("No artifacts found.")).toBeVisible();
  await page.getByRole("button", { name: "Upload" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Key", exact: true }).fill("firmware");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "fw.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("firmware-bytes"),
  });

  await dialog.getByRole("button", { name: "Upload" }).click();

  await expect.poll(() => captured.uploads.length).toBe(1);
  expect(captured.uploads[0]).toEqual({ key: "firmware", body: "firmware-bytes" });
});

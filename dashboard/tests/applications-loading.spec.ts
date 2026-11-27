import { expect, test } from "@playwright/test";
import { sampleApplications } from "../src/sampleApplications.ts";
import { skippedApplicationRowsHeader } from "../src/skippedApplicationRows.ts";

test("shows loading while waiting for the API and then displays its nine applications", async ({ page }) => {
  // Hold the response until we have checked the loading message.
  let releaseResponse!: () => void;
  const pendingResponse = new Promise<void>((resolve) => { releaseResponse = resolve; });

  await page.route("**/api/applications", async (route) => {
    await pendingResponse;
    await route.continue();
  });

  await page.goto("/");
  try {
    await expect(page.getByRole("status")).toHaveText("Loading applications…");
    await expect(page.getByText("9 of 9 applications")).toHaveCount(0);
  } finally {
    releaseResponse();
  }

  // The dashboard should show the full list once the API responds.
  await expect(page.getByText("9 of 9 applications")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading applications" })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Skipped applications" })).toHaveCount(0);
});

test("shows an HTTP error and loads the applications on Retry", async ({ page }) => {
  // Keep returning an error until the test is ready to click Retry.
  let apiAvailable = false;
  await page.route("**/api/applications", (route) => {
    if (apiAvailable) return route.continue();

    return route.fulfill({ status: 503, json: { error: "Service unavailable" } });
  });

  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load applications");
  await expect(page.getByText("9 of 9 applications")).toHaveCount(0);
  // Let the next request reach the real API.
  apiAvailable = true;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("9 of 9 applications")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("rejects an HTTP 200 response with incomplete application objects", async ({ page }) => {
  await page.route("**/api/applications", (route) => route.fulfill({
    // Return valid JSON with missing fields to check that the dashboard rejects it.
    json: [{ id: 1, company: "Incomplete example" }],
  }));

  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load applications");
  await expect(page.getByText("Incomplete example")).toHaveCount(0);
});


test("shows skipped-row reasons alongside the valid applications", async ({ page }) => {
  await page.route("**/api/applications", (route) => route.fulfill({
    headers: {
      [skippedApplicationRowsHeader]: JSON.stringify({
        total: 2, missingCompany: 1, missingPosition: 0, invalidStatus: 2,
      }),
    },
    json: sampleApplications.slice(0, 1),
  }));

  await page.goto("/");
  const warning = page.getByRole("status", { name: "Skipped applications" });
  await expect(warning).toContainText("2 application rows were skipped.");
  await expect(warning).toContainText("Missing company: 1");
  await expect(warning).toContainText("Missing or invalid status: 2");
  await expect(warning.getByText("Missing position")).toHaveCount(0);
  await expect(page.getByText("1 of 1 applications")).toBeVisible();
});

test("shows the warning and the empty dashboard when all rows are skipped", async ({ page }) => {
  await page.route("**/api/applications", (route) => route.fulfill({
    headers: {
      [skippedApplicationRowsHeader]: JSON.stringify({
        total: 1, missingCompany: 0, missingPosition: 1, invalidStatus: 0,
      }),
    },
    json: [],
  }));

  await page.goto("/");
  const warning = page.getByRole("status", { name: "Skipped applications" });
  await expect(warning).toContainText("1 application row was skipped.");
  await expect(warning).toContainText("Missing position: 1");
  await expect(page.getByText("0 of 0 applications")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No applications found" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
});

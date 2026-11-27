import { expect, test } from "@playwright/test";
import type { Application } from "../src/application";

test.beforeEach(async ({ page }) => {
  // Fix today to March 2 so February 30 would match Today if it rolled over.
  await page.clock.setFixedTime(new Date(2026, 2, 2, 12));
  // Match the sample follow-up offsets to the fixed browser clock.
  const followUps = [
    "2026-03-02", "2026-02-30", "", "2026-03-07", "2026-03-09",
    null, "2026-03-03", "2026-02-26", null,
  ];
  // Change the dates in the API response for this test only.
  await page.route("**/api/applications", async (route) => {
    const response = await route.fetch();
    const applications: Application[] = await response.json();
    await route.fulfill({
      response,
      json: applications.map((application, index) => ({
        ...application,
        followUpDate: followUps[index],
      })),
    });
  });
});

test("invalid and missing follow-ups stay visible only with Follow-up set to All", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const invalid = page.getByRole("row", { name: "View Cedar & Co. application details" });
  const missing = page.getByRole("row", { name: "View Orbit Financial application details" });
  await expect(invalid.getByText("Invalid date")).toBeVisible();
  await expect(missing.getByText("Not scheduled")).toBeVisible();

  const statistic = page.getByLabel("Application statistics").locator(".stat-card", {
    hasText: "Pending Follow-ups",
  });
  await expect(statistic).toHaveText(/Pending Follow-ups\s*4$/);
  const priorities = page.locator(".follow-up-item");
  await expect(priorities).toHaveCount(3);
  await expect(priorities.filter({ hasText: "Northstar Labs" })).toBeVisible();
  await expect(priorities.filter({ hasText: /Cedar & Co\.|Orbit Financial/ })).toHaveCount(0);

  const followUpFilter = page.getByRole("button", { name: "Filter by follow-up date" });
  for (const [option, count] of [["Overdue", 0], ["Today", 1], ["Next 7 Days", 3]] as const) {
    await followUpFilter.click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await expect(page.getByText(`${count} of 9 applications`)).toBeVisible();
    await expect(invalid).toHaveCount(0);
    await expect(missing).toHaveCount(0);
  }

  await followUpFilter.click();
  await page.getByRole("option", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Interview", exact: true }).click();
  await expect(invalid).toHaveCount(0);
  await expect(missing).toHaveCount(0);
  await expect(page.getByRole("row", { name: "View Northstar Labs application details" })).toBeVisible();
});

for (const { filter, today, expectedCount } of [
  { filter: "Overdue", today: 3, expectedCount: 1 },
  { filter: "Next 7 Days", today: 1, expectedCount: 3 },
]) {
  test(`${filter} excludes a date that would roll into its range`, async ({ page }) => {
    // March 2 is in range for both scenarios. Only Northstar has a valid date on that day.
    await page.clock.setFixedTime(new Date(2026, 2, today, 12));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const invalid = page.getByRole("row", { name: "View Cedar & Co. application details" });
    await expect(invalid.getByText("Invalid date")).toBeVisible();

    await page.getByRole("button", { name: "Filter by follow-up date" }).click();
    await page.getByRole("option", { name: filter, exact: true }).click();
    await expect(page.getByText(`${expectedCount} of 9 applications`)).toBeVisible();
    await expect(invalid).toHaveCount(0);
  });
}

test("mobile cards and details distinguish invalid and missing follow-ups", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");

  for (const [company, message] of [["Cedar & Co.", "Invalid date"], ["Orbit Financial", "Not scheduled"]]) {
    const card = page.getByRole("button", { name: `View ${company} application details` });
    await expect(card.getByText(message)).toBeVisible();
    await card.click();
    const details = page.getByRole("complementary", { name: `${company} application details` });
    await expect(details.getByText(message)).toBeVisible();
    await details.getByRole("button", { name: "Close details panel" }).click();
  }
});

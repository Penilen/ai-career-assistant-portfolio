import { expect, test } from "@playwright/test";

test("Status filter and Reset update the application list", async ({ page }) => {
  await page.goto("/");

  const statusFilter = page.getByRole("button", { name: "Filter by status" });
  const reset = page.getByRole("button", { name: "Reset", exact: true });

  await expect(page.getByText("9 of 9 applications")).toBeVisible();
  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Total Applications" })
      .getByText("9", { exact: true })
  ).toBeVisible();

  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Awaiting Response" })
      .getByText("3", { exact: true })
  ).toBeVisible();

  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Pending Follow-ups" })
      .getByText("6", { exact: true })
  ).toBeVisible();

  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Interviews" })
      .getByText("2", { exact: true })
  ).toBeVisible();

  await expect(statusFilter).toHaveText("Status: All");
  await expect(reset).toBeDisabled();

  await statusFilter.click();
  await page.getByRole("option", { name: "Applied" }).click();

  await expect(page.getByText("3 of 9 applications")).toBeVisible();
  await expect(statusFilter).toHaveText("Status: Applied");
  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Awaiting Response" })
      .getByText("3", { exact: true })
  ).toBeVisible();
  await expect(reset).toBeEnabled();

  await reset.click();

  await expect(page.getByText("9 of 9 applications")).toBeVisible();
  await expect(statusFilter).toHaveText("Status: All");
  await expect(reset).toBeDisabled();
});

test("QA-05: Reset restores all filters and search", async ({ page }) => {
  await page.goto("/");
  const reset = page.getByRole("button", { name: "Reset", exact: true });
  await page.getByPlaceholder("Search company or position").fill("Northstar");
  await page.getByRole("button", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Applied" }).click();
  await page.getByRole("button", { name: "Filter by position match" }).click();
  await page.getByRole("option", { name: "Good" }).click();
  await page.getByRole("button", { name: "Filter by follow-up date" }).click();
  await page.getByRole("option", { name: "Overdue" }).click();
  await expect(page.getByRole("button", { name: "Filter by status" })).toHaveText("Status: Applied");
  await expect(page.getByRole("button", { name: "Filter by position match" })).toHaveText("Match: Good");
  await expect(page.getByRole("button", { name: "Filter by follow-up date" })).toHaveText("Follow-up: Overdue");
  await expect(page.getByPlaceholder("Search company or position")).toHaveValue("Northstar");
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(page.getByPlaceholder("Search company or position")).toBeEmpty();
  await expect(page.getByRole("button", { name: "Filter by status" })).toHaveText("Status: All");
  await expect(page.getByRole("button", { name: "Filter by position match" })).toHaveText("Match: All");
  await expect(page.getByRole("button", { name: "Filter by follow-up date" })).toHaveText("Follow-up: All");
  await expect(reset).toBeDisabled();
  await expect(page.getByText("9 of 9 applications")).toBeVisible();
});

test("QA-03: Interview filter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Interview" }).click();
  await expect(page.getByRole("button", { name: "Filter by status" })).toHaveText("Status: Interview");
  await expect(page.getByText("2 of 9 applications")).toBeVisible();
  await expect(
    page.locator(".stat-card")
      .filter({ hasText: "Interviews" })
      .getByText("2", { exact: true })
  ).toBeVisible();

  await expect(
    page.getByRole("table")
      .getByRole("row")
      .filter({ hasText: "Interview" })
  ).toHaveCount(2);
});

test("QA-04: Interview and Good match filters show no applications", async ({ page }) => {
  await page.goto("/");

  const statusFilter = page.getByRole("button", { name: "Filter by status" });
  const matchFilter = page.getByRole("button", { name: "Filter by position match" });

  await statusFilter.click();
  await page.getByRole("option", { name: "Interview" }).click();
  await matchFilter.click();
  await page.getByRole("option", { name: "Good" }).click();

  await expect(statusFilter).toHaveText("Status: Interview");
  await expect(matchFilter).toHaveText("Match: Good");
  await expect(page.getByText("0 of 9 applications")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("QA-09: Mobile status and follow-up filters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const statusFilter = page.getByRole("button", { name: "Filter by status" });
  const followUpFilter = page.getByRole("button", { name: "Filter by follow-up date" });

  await statusFilter.click();
  await page.getByRole("option", { name: "Applied" }).click();
  await expect(statusFilter).toHaveText("Status: Applied");

  await followUpFilter.click();
  await page.getByRole("option", { name: "Overdue" }).click();
  await expect(followUpFilter).toHaveText("Follow-up: Overdue");

  await expect(page.getByText("1 of 9 applications")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View Cedar & Co. application details" })
  ).toBeVisible();
});

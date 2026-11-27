import { expect, test } from "@playwright/test";

test("QA-07: Filter by Follow-up Date", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Filter by follow-up date" }).click();
  await page.getByRole("option", { name: "Overdue" }).click();
  await expect(page.getByRole("button", { name: "Filter by follow-up date" })).toHaveText("Follow-up: Overdue");
  await expect(page.getByText("1 of 9 applications")).toBeVisible();
  await expect(page.getByRole("row", { name: "Cedar & Co" })).toBeVisible();

  await page.getByRole("button", { name: "Filter by follow-up date" }).click();
  await page.getByRole("option", { name: "Today" }).click();
  await expect(page.getByRole("button", { name: "Filter by follow-up date" })).toHaveText("Follow-up: Today");
  await expect(page.getByText("1 of 9 applications")).toBeVisible();
  await expect(page.getByRole("row", { name: "Northstar Labs" })).toBeVisible();

  await page.getByRole("button", { name: "Filter by follow-up date" }).click();
  await page.getByRole("option", { name: "Next 7 Days" }).click();
  await expect(page.getByRole("button", { name: "Filter by follow-up date" })).toHaveText("Follow-up: Next 7 Days");
  await expect(page.getByText("4 of 9 applications")).toBeVisible();
  await expect(page.getByRole("row", { name: "Orbit Financial" })).toBeVisible();
  await expect(page.getByRole("row", { name: "Kindred Health" })).toBeVisible();
  await expect(page.getByRole("row", { name: "Morrow Studio" })).toBeVisible();
  await expect(page.getByRole("row", { name: "Relay Cloud" })).toBeVisible();
});

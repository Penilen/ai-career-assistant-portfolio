import { test, expect } from "@playwright/test";

test("QA-06: Search by company and reset", async ({ page }) => {

  await page.goto("/");
  await page.getByPlaceholder("Search company or position").fill("Northstar");
  await expect(page.getByText("1 of 9 applications")).toBeVisible();
  await expect(page.getByRole("row", { name: "View Northstar Labs application details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeEnabled();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("9 of 9 applications")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();

});

test("QA-08: Search combines with the Next 7 Days filter", async ({ page }) => {
  await page.goto("/");

  const followUpFilter = page.getByRole("button", { name: "Filter by follow-up date" });
  const search = page.getByPlaceholder("Search company or position");

  await followUpFilter.click();
  await page.getByRole("option", { name: "Next 7 Days" }).click();
  await expect(followUpFilter).toHaveText("Follow-up: Next 7 Days");

  await search.fill("RELAY");
  await expect(search).toHaveValue("RELAY");
  await expect(page.getByText("1 of 9 applications")).toBeVisible();
  await expect(page.getByRole("row", { name: "View Relay Cloud application details" })).toBeVisible();
});

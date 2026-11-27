import { expect, test } from "@playwright/test";

test("QA-10: Application details open from the desktop table", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await page.getByRole("row", { name: "View Northstar Labs application details" }).click();

  const details = page.getByRole("complementary", {
    name: "Northstar Labs application details",
  });
  await expect(details).toBeVisible();
  await expect(details.getByRole("heading", { name: "Northstar Labs" })).toBeVisible();
  await expect(details.getByText("Senior Product Designer")).toBeVisible();

  await details.getByRole("button", { name: "Close details panel" }).click();
  await expect(details).not.toBeVisible();
});

test("QA-10: Application details open and scroll on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");

  await page.getByRole("button", { name: "View Northstar Labs application details" }).click();

  const details = page.getByRole("complementary", {
    name: "Northstar Labs application details",
  });
  await expect(details).toBeVisible();
  await expect(details.getByRole("heading", { name: "Northstar Labs" })).toBeVisible();

  const dimensions = await details.evaluate((element) => ({
    visibleHeight: element.clientHeight,
    contentHeight: element.scrollHeight,
  }));
  expect(dimensions.contentHeight).toBeGreaterThan(dimensions.visibleHeight);

  const scrollPosition = await details.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  expect(scrollPosition).toBeGreaterThan(0);
});

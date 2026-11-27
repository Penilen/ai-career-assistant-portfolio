import { expect, test } from "@playwright/test";
import { statuses } from "../src/application";
import { sampleApplications } from "../src/sampleApplications";

const dates = [
  { date: "2026-11-25", short: "Nov 25", long: "November 25, 2026", urgency: "Overdue" },
  { date: "2026-11-26", short: "Nov 26", long: "November 26, 2026", urgency: "Today" },
  { date: "2026-11-27", short: "Nov 27", long: "November 27, 2026", urgency: "Tomorrow" },
  { date: null, short: "Not scheduled", long: "Not scheduled", urgency: null },
];

const cases = statuses.flatMap((status) =>
  dates.map(({ date, short, long, urgency }, index) => ({
    status,
    date,
    short,
    long,
    expectedUrgency: ["Applied", "Interview", "Offer"].includes(status) ? urgency : null,
    company: `Fictional ${status} ${index + 1}`,
  })),
);

for (const { name, width, role } of [
  { name: "desktop", width: 1280, role: "row" },
  { name: "mobile", width: 390, role: "button" },
] as const) {
  test(`follow-up dates and urgency respect application status on ${name}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 26, 12));
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/applications", (route) => route.fulfill({
      json: cases.map(({ status, date, company }, index) => ({
        ...sampleApplications[0],
        id: index + 1,
        status,
        company,
        followUpDate: date,
      })),
    }));
    await page.goto("/");

    for (const { company, short, long, expectedUrgency } of cases) {
      const application = page.getByRole(role, { name: `View ${company} application details` });
      await expect(application.getByText(short, { exact: true })).toBeVisible();
      const urgency = /^(Overdue|Due Today|Today|Upcoming|Tomorrow|In \d+ days)$/;
      await expect(application.getByText(urgency)).toHaveText(expectedUrgency ? [expectedUrgency] : []);

      await application.click();
      const details = page.getByRole("complementary", { name: `${company} application details` });
      const followUp = details.getByText("Follow-up date", { exact: true }).locator("..");
      await expect(followUp).toContainText(long);
      await expect(followUp.getByText(urgency)).toHaveText(expectedUrgency ? [expectedUrgency] : []);
      await details.getByRole("button", { name: "Close details panel" }).click();
    }
  });
}

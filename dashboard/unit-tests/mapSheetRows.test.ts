import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidDate } from "../src/isValidDate.ts";
import { mapSheetRows } from "../src/mapSheetRows.ts";

// These are the column names used by the tests.
// Each cell in an example row starts in the same position as its column name.
const headers = [
  "Company", "Website", "Position", "Job URL", "Company Fit", "Position Match",
  "Status", "Next Action", "Notes", "Date Applied", "Follow-up Date", "Last Updated",
];

test("maps reordered columns, normalizes dates, and prefers explicit hyperlink targets", () => {
  // Give the mapper one row. The spaces around the company and rating should be removed.
  // The link has different display text and an actual address so we can check which one is used.
  // The last three cells are dates: one written as text and two stored as Sheets numbers.
  const row = [
    " Fictional Studio ", "https://example.com/studio", "Designer",
    { value: "https://example.com/display-label", hyperlink: "https://example.com/actual-job" },
    "Strong", " Good ", "Interview", "Prepare portfolio", "Two interviewers",
    "2024-2-9", 45351, 45351.75,
  ];

  // [...headers] and [...row] make copies. reverse() changes the order of those copies.
  // Reversing both keeps each value paired with its column name.
  // The outer brackets around the reversed row give the mapper a list containing one row.
  // deepEqual compares what the mapper returns with the expected object below, field by field.
  assert.deepEqual(mapSheetRows([...headers].reverse(), [[...row].reverse()]), {
    applications: [{
      id: 2,
      company: "Fictional Studio",
      website: "https://example.com/studio",
      position: "Designer",
      jobPosting: "https://example.com/actual-job",
      companyFit: "Strong",
      positionMatch: "Good",
      status: "Interview",
      nextAction: "Prepare portfolio",
      notes: "Two interviewers",
      dateApplied: "2024-02-09",
      followUpDate: "2024-02-29",
      lastUpdated: "2024-02-29",
    }],
    issues: [],
  });
});

test("normalizes localized dates in all three date fields and preserves ISO and serial dates", () => {
  // Use dotted dates in all three fields of the first row, including a valid leap day.
  // The second row checks that ISO text, a Sheets date number, and an empty cell still work.
  const { applications: [localized, existing], issues } = mapSheetRows(headers, [
    ["Fictional Studio", "", "Designer", "", "", "", "Applied", "", "",
      "24.11.2026", "01.02.2026", "29.02.2024"],
    ["Fictional Workshop", "", "Developer", "", "", "", "Interview", "", "",
      "2026-11-24", 45351, ""],
  ]);

  assert.deepEqual(
    [localized.dateApplied, localized.followUpDate, localized.lastUpdated],
    ["2026-11-24", "2026-02-01", "2024-02-29"],
  );
  assert.deepEqual(
    [existing.dateApplied, existing.followUpDate, existing.lastUpdated],
    ["2026-11-24", "2024-02-29", ""],
  );
  assert.deepEqual(issues, []);
});

test("normalizes localized dates with one or two digits for the day and month", () => {
  for (const [date, expected] of [
    ["01.02.2026", "2026-02-01"],
    ["1.02.2026", "2026-02-01"],
    ["01.2.2026", "2026-02-01"],
    ["1.2.2026", "2026-02-01"],
    ["29.2.2024", "2024-02-29"],
  ]) {
    const { applications: [application], issues } = mapSheetRows(headers, [
      ["Fictional Studio", "", "Designer", "", "", "", "Applied", "", "", date, date, date],
    ]);

    assert.deepEqual(
      [application.dateApplied, application.followUpDate, application.lastUpdated],
      [expected, expected, expected],
      date,
    );
    assert.deepEqual(issues, [], date);
  }
});

test("preserves invalid-date handling for impossible or malformed localized dates", () => {
  // Try each bad date in all three fields. Include February 29 in a year that is not a leap year.
  for (const date of [
    "29.02.2025", "31.04.2026", "15.13.2026", "00.11.2026",
    "29.2.2025", "31.4.2026", "0.2.2026", "1.13.2026", "001.02.2026", "1.2.26",
  ]) {
    const { applications: [application], issues } = mapSheetRows(headers, [
      ["Fictional Studio", "", "Designer", "", "", "", "Applied", "", "", date, date, date],
    ]);

    // Keep the bad follow-up text so the dashboard can flag it. Clear the other two dates.
    assert.deepEqual([application.dateApplied, application.followUpDate, application.lastUpdated], ["", date, ""], date);
    assert.deepEqual(issues, [
      { row: 2, field: "Date Applied", reason: "invalid date" },
      { row: 2, field: "Follow-up Date", reason: "invalid date" },
      { row: 2, field: "Last Updated", reason: "invalid date" },
    ], date);
  }
});

test("skips blank and unusable rows while keeping physical row numbers", () => {
  // The braces on the left take applications and issues out of the returned object.
  // The first two rows are blank. The next has an unknown status, and the next has no company.
  // The last row has enough information to become an application.
  const { applications, issues } = mapSheetRows(headers, [
    [],
    ["  ", null],
    ["Fictional Studio", "", "Designer", "", "", "", "Pending"],
    ["", "", "Designer", "", "", "", "Applied"],
    ["Fictional Studio", "", "Designer", "", "", "", "Applied"],
  ]);

  // Only the last row becomes an application. It gets ID 6 because the header is row 1
  // and the four skipped rows still take up space in the sheet.
  // Missing ratings become Not assessed. A missing follow-up date becomes null.
  assert.deepEqual(applications, [{
    id: 6,
    company: "Fictional Studio",
    website: "",
    position: "Designer",
    jobPosting: "",
    companyFit: "Not assessed",
    positionMatch: "Not assessed",
    status: "Applied",
    nextAction: "",
    notes: "",
    dateApplied: "",
    followUpDate: null,
    lastUpdated: "",
  }]);
  // Check which rows and columns the mapper reports as problems.
  assert.deepEqual(issues, [
    { row: 4, field: "Status", reason: "unknown value" },
    { row: 5, field: "Company", reason: "required" },
  ]);
});

test("reports invalid values and preserves the distinction between invalid and blank follow-ups", () => {
  // Read the first returned application with applications: [application].
  // The valid company, position, and status let the row become an application.
  // Its other cells include an unknown rating, bad dates, and unusable links.
  const { applications: [application], issues } = mapSheetRows(headers, [[
    "Fictional Studio", "Visit website", "Designer",
    { value: "https://example.com/label", hyperlink: "javascript:alert(1)" },
    "Excellent", "Potential", "Offer", "", "", "29/02/2024", "2026-02-29", Infinity,
  ]]);

  // equal checks one value at a time. The unknown rating gets a default, and the valid one stays.
  // Unusable links and ordinary dates become empty strings. The bad follow-up text is kept
  // so the dashboard can tell an invalid date from a missing one.
  assert.equal(application.companyFit, "Not assessed");
  assert.equal(application.positionMatch, "Potential");
  assert.equal(application.website, "");
  assert.equal(application.jobPosting, "");
  assert.equal(application.dateApplied, "");
  assert.equal(application.lastUpdated, "");
  assert.equal(application.followUpDate, "2026-02-29");
  // Confirm that the saved follow-up text still fails date validation.
  // The ! tells TypeScript to treat it as text here. The previous check confirms its value.
  assert.equal(isValidDate(application.followUpDate!), false);
  // Check which rows and columns the mapper reports as problems.
  assert.deepEqual(issues, [
    { row: 2, field: "Company Fit", reason: "unknown value" },
    { row: 2, field: "Date Applied", reason: "invalid date" },
    { row: 2, field: "Follow-up Date", reason: "invalid date" },
    { row: 2, field: "Last Updated", reason: "invalid date" },
    { row: 2, field: "Website", reason: "invalid URL" },
    { row: 2, field: "Job URL", reason: "invalid URL" },
  ]);
});

test("requires exact, unambiguous headers", () => {
  // throws runs the function and expects it to report an error.
  // slice(1) copies the headers after Company. We put lowercase company in its place.
  // The pattern /"Company"/ checks that the error message names the missing header.
  assert.throws(() => mapSheetRows(["company", ...headers.slice(1)], []), /"Company"/);
  // Copy every header and add a second Job URL. The error should name the duplicate.
  // Both checks use [] for the rows because the mapper validates the headers first.
  assert.throws(() => mapSheetRows([...headers, "Job URL"], []), /"Job URL"/);
});

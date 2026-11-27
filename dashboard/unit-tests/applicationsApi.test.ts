import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import { createApplicationsServer } from "../server/applicationsApi.ts";
import { loadSheetApplications } from "../server/googleSheets.ts";
import { skippedApplicationRowsHeader } from "../src/skippedApplicationRows.ts";

// Match the column names expected by the row mapper.
const headers = [
  "Company", "Website", "Position", "Job URL", "Company Fit", "Position Match",
  "Status", "Next Action", "Notes", "Date Applied", "Follow-up Date", "Last Updated",
];

// Give each test its own local server and stop it when the test ends.
async function startServer(t: TestContext, load: Parameters<typeof createApplicationsServer>[0]) {
  const server = createApplicationsServer(load);
  t.after(async () => {
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  // Port 0 lets the operating system choose a free port.
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

test("GET reads the tracker range and returns mapped applications", async (t) => {
  // Check the URL and return example rows in place of a Google response.
  const baseURL = await startServer(t, () => loadSheetApplications("fictional-sheet", async (url) => {
    assert.equal(url.origin, "https://sheets.googleapis.com");
    assert.equal(decodeURIComponent(url.pathname), "/v4/spreadsheets/fictional-sheet/values/'Job Tracker'!A1:L");
    assert.equal(url.searchParams.get("majorDimension"), "ROWS");
    assert.equal(url.searchParams.get("valueRenderOption"), "UNFORMATTED_VALUE");
    assert.equal(url.searchParams.get("dateTimeRenderOption"), "SERIAL_NUMBER");
    return { values: [headers, [], [
      "Fictional Studio", "https://example.com", "Designer", "", "Strong", "Good",
      "Interview", "Prepare portfolio", "Fictional note", 45351, "", "2024-3-1",
    ]] };
  }));

  const response = await fetch(`${baseURL}/api/applications`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(JSON.parse(response.headers.get(skippedApplicationRowsHeader) ?? ""), {
    total: 0, missingCompany: 0, missingPosition: 0, invalidStatus: 0,
  });
  // The blank row still counts toward the ID, and the dates become YYYY-MM-DD.
  assert.deepEqual(await response.json(), [{
    id: 3,
    company: "Fictional Studio",
    website: "https://example.com",
    position: "Designer",
    jobPosting: "",
    companyFit: "Strong",
    positionMatch: "Good",
    status: "Interview",
    nextAction: "Prepare portfolio",
    notes: "Fictional note",
    dateApplied: "2024-02-29",
    followUpDate: null,
    lastUpdated: "2024-03-01",
  }]);
});

test("reports skipped rows once and excludes blank rows and optional issues", async (t) => {
  const baseURL = await startServer(t, () => loadSheetApplications("fictional-sheet", async () => ({
    values: [
      headers,
      [],
      ["", "", "", "", "", "", "Unknown fictional status"],
      ["Fictional rejected row", "", "", "", "", "", "Applied"],
      ["Fictional usable row", "Invalid fictional URL", "Designer", "", "Unknown fit", "", "Applied",
        "", "", "", "2026-02-30"],
    ],
  })));

  const response = await fetch(`${baseURL}/api/applications`);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.headers.get(skippedApplicationRowsHeader) ?? ""), {
    total: 2, missingCompany: 1, missingPosition: 2, invalidStatus: 1,
  });
  const applications = await response.json();
  assert.equal(applications.length, 1);
  assert.equal(applications[0].company, "Fictional usable row");
  assert.equal(applications[0].companyFit, "Not assessed");
  assert.equal(applications[0].website, "");
  assert.equal(applications[0].followUpDate, "2026-02-30");
});

test("returns an empty list with diagnostics when every application row is skipped", async (t) => {
  const baseURL = await startServer(t, () => loadSheetApplications("fictional-sheet", async () => ({
    values: [headers, ["Fictional Studio", "", "Designer"]],
  })));

  const response = await fetch(`${baseURL}/api/applications`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.deepEqual(JSON.parse(response.headers.get(skippedApplicationRowsHeader) ?? ""), {
    total: 1, missingCompany: 0, missingPosition: 0, invalidStatus: 1,
  });
});

test("missing configuration returns 503 without requesting Google", async (t) => {
  // Count calls to the fake request to make sure missing settings stop it early.
  const request = t.mock.fn(async () => undefined);
  const baseURL = await startServer(t, () => loadSheetApplications(undefined, request));
  const response = await fetch(`${baseURL}/api/applications`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Applications source is not configured" });
  assert.equal(request.mock.callCount(), 0);
});

test("upstream failure returns 502 without disclosing details and a new request can recover", async (t) => {
  // Simulate a Google error and check that only a general message is returned.
  let available = false;
  const baseURL = await startServer(t, () => loadSheetApplications("fictional-sheet", async () => {
    if (!available) throw new Error("Private upstream diagnostics");
    return { values: [headers] };
  }));

  const response = await fetch(`${baseURL}/api/applications`);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Could not load applications" });

  // Send a new request after the source recovers.
  available = true;
  const retry = await fetch(`${baseURL}/api/applications`);
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), []);
});

test("malformed Sheets payloads and incorrect headers return 502", async (t) => {
  // Try a missing values list, a bad cell, and missing column names.
  for (const data of [{}, { values: [headers, ["Studio", {}]] }, { values: [["Company"]] }]) {
    const baseURL = await startServer(t, () => loadSheetApplications("fictional-sheet", async () => data));
    const response = await fetch(`${baseURL}/api/applications`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Could not load applications" });
  }
});

// An unknown path should return before loading any applications.
test("an unknown route returns 404 without loading applications", async (t) => {
  const load = t.mock.fn(async () => ({ applications: [] }));
  const baseURL = await startServer(t, load);
  const response = await fetch(`${baseURL}/api/unknown`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not found" });
  assert.equal(load.mock.callCount(), 0);
});

// The applications route should accept GET and reject POST.
test("POST to the applications route returns 405 and advertises GET", async (t) => {
  const load = t.mock.fn(async () => ({ applications: [] }));
  const baseURL = await startServer(t, load);
  const response = await fetch(`${baseURL}/api/applications`, { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.deepEqual(await response.json(), { error: "Method not allowed" });
  assert.equal(load.mock.callCount(), 0);
});

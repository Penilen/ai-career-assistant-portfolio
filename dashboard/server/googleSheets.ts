import { GoogleAuth } from "google-auth-library";
import { mapSheetRows } from "../src/mapSheetRows.ts";
import type { SkippedApplicationRows } from "../src/skippedApplicationRows.ts";

// Use local Google credentials to request read-only access to Sheets.
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const range = "'Job Tracker'!A1:L";

// Give the API a way to identify missing or invalid settings.
export class SheetsConfigurationError extends Error {}

// Let GoogleAuth attach the access token to the request.
async function requestSheet(url: URL): Promise<unknown> {
  const { data } = await auth.request<unknown>({
    url: url.href,
    method: "GET",
    timeout: 10_000,
    retry: false,
  });
  return data;
}

type CellValue = string | number | boolean;

// A row must be a list of text, numbers, or true/false values.
function isRow(value: unknown): value is CellValue[] {
  return Array.isArray(value) && value.every((cell: unknown) =>
    typeof cell === "string" || typeof cell === "boolean" ||
    (typeof cell === "number" && Number.isFinite(cell)),
  );
}

// Tests can supply a fake request in place of the real Google call.
export async function loadSheetApplications(
  spreadsheetId: string | undefined,
  request = requestSheet,
) {
  // Check the spreadsheet ID before sending a request.
  const id = spreadsheetId?.trim();
  if (!id || !/^[\w-]+$/.test(id)) {
    throw new SheetsConfigurationError("Set GOOGLE_SHEETS_SPREADSHEET_ID to the test spreadsheet ID");
  }

  // Read the twelve tracker columns and ask Sheets for numeric date values.
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`,
  );
  url.search = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  }).toString();

  // Make sure Google returned at least the header row.
  const data = await request(url);
  const values = data && typeof data === "object" && "values" in data ? data.values : undefined;
  if (!Array.isArray(values) || values.length === 0 || !values.every(isRow)) {
    throw new Error("Invalid Google Sheets values response");
  }

  // Use the first row as column names and map the rest into applications.
  const [headers, ...rows] = values;
  const { applications, issues } = mapSheetRows(headers, rows);

  // Count each rejected row once, even when it has more than one reason.
  const skippedRows: SkippedApplicationRows = {
    total: 0, missingCompany: 0, missingPosition: 0, invalidStatus: 0,
  };
  const rejectedRows = new Set<number>();
  for (const issue of issues) {
    if (issue.field === "Company" && issue.reason === "required") skippedRows.missingCompany++;
    else if (issue.field === "Position" && issue.reason === "required") skippedRows.missingPosition++;
    else if (issue.field === "Status") skippedRows.invalidStatus++;
    else continue;

    rejectedRows.add(issue.row);
  }
  skippedRows.total = rejectedRows.size;

  return { applications, skippedRows };
}

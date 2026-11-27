import { matches, statuses, type Application, type Match } from "./application.ts";
import { isValidDate } from "./isValidDate.ts";

// A link cell can have both display text and a web address.
type SheetCell = string | number | boolean | null | undefined | {
  value?: string | number | boolean | null;
  hyperlink: string;
};

// These are the column names we expect in the sheet.
const headers = [
  "Company", "Website", "Position", "Job URL", "Company Fit", "Position Match",
  "Status", "Next Action", "Notes", "Date Applied", "Follow-up Date", "Last Updated",
] as const;
type Header = (typeof headers)[number];
type RowIssue = {
  row: number;
  field: Header;
  reason: "required" | "unknown value" | "invalid date" | "invalid URL";
};

const sheetsEpoch = Date.UTC(1899, 11, 30);
const millisecondsPerDay = 86_400_000;

// Read the value shown in a cell.
function cellValue(cell: SheetCell) {
  return cell !== null && typeof cell === "object" ? cell.value : cell;
}

// Turn a cell into text and trim spaces at the edges.
function cellText(cell: SheetCell): string {
  return String(cellValue(cell) ?? "").trim();
}

// Put dates in year-month-day order and check that they exist.
function normalizeDate(cell: SheetCell): string | null {
  const value = cellValue(cell);
  let date = cellText(cell);
  if (typeof value === "number") {
    const serialDate = new Date(sheetsEpoch + Math.floor(value) * millisecondsPerDay);
    date = Number.isFinite(serialDate.getTime()) ? serialDate.toISOString().split("T")[0] : "";
  } else {
    const parts = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
    if (parts) {
      date = `${parts[1]}-${parts[2].padStart(2, "0")}-${parts[3].padStart(2, "0")}`;
    } else {
      // Read the parts as day, month, year. Put the year first before checking the date.
      const localizedParts = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date);
      if (localizedParts) {
        const [, day, month, year] = localizedParts;
        date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
  }
  return isValidDate(date) ? date : null;
}

// Use the saved address when a cell has a separate link.
function linkTarget(cell: SheetCell): string {
  return cell !== null && typeof cell === "object" ? cell.hyperlink.trim() : cellText(cell);
}

// Keep blank rows in the input so the row numbers still match the sheet.
export function mapSheetRows(
  headerRow: readonly SheetCell[],
  rows: readonly (readonly SheetCell[])[],
): { applications: Application[]; issues: RowIssue[] } {
  // Find each column by name so the order can change.
  const columns = new Map<Header, number>();
  for (const header of headers) {
    const index = headerRow.indexOf(header);
    if (index === -1 || index !== headerRow.lastIndexOf(header)) {
      throw new Error(`Expected exactly one "${header}" header`);
    }
    columns.set(header, index);
  }

  const applications: Application[] = [];
  const issues: RowIssue[] = [];

  rows.forEach((row, index) => {
    // The first application is on row 2, below the column names.
    const id = index + 2;
    const read = (header: Header) => row[columns.get(header)!];
    // Skip rows where all expected cells are empty.
    if (headers.every((header) => !linkTarget(read(header)))) return;

    // Record what went wrong and where to find it.
    const report = (field: Header, reason: RowIssue["reason"]) => {
      issues.push({ row: id, field, reason });
    };

    // An application needs a company, a position, and a recognized status.
    const company = cellText(read("Company"));
    const position = cellText(read("Position"));
    const statusText = cellText(read("Status"));
    const status = statuses.find((value) => value === statusText);
    if (!company) report("Company", "required");
    if (!position) report("Position", "required");
    if (!status) report("Status", statusText ? "unknown value" : "required");
    if (!company || !position || !status) return;

    // Use Not assessed when the rating is missing or unknown.
    function match(header: "Company Fit" | "Position Match"): Match {
      const text = cellText(read(header));
      const value = matches.find((option) => option === text);
      if (text && !value) report(header, "unknown value");
      return value ?? "Not assessed";
    }

    function date(header: "Date Applied" | "Follow-up Date" | "Last Updated"): string | null {
      const cell = read(header);
      const text = cellText(cell);
      if (!text) return null;
      const normalized = normalizeDate(cell);
      if (normalized) return normalized;
      report(header, "invalid date");
      // Keep a bad follow-up entry so the dashboard can flag it.
      return header === "Follow-up Date" ? text : null;
    }

    // Keep only valid HTTP or HTTPS addresses.
    function link(header: "Website" | "Job URL"): string {
      const target = linkTarget(read(header));
      if (!target) return "";
      if (/^https?:\/\//i.test(target) && URL.canParse(target)) return target;
      report(header, "invalid URL");
      return "";
    }

    // Build one application in the shape the dashboard expects.
    applications.push({
      id,
      company,
      position,
      status,
      companyFit: match("Company Fit"),
      positionMatch: match("Position Match"),
      dateApplied: date("Date Applied") ?? "",
      followUpDate: date("Follow-up Date"),
      lastUpdated: date("Last Updated") ?? "",
      nextAction: cellText(read("Next Action")),
      notes: cellText(read("Notes")),
      website: link("Website"),
      jobPosting: link("Job URL"),
    });
  });

  return { applications, issues };
}

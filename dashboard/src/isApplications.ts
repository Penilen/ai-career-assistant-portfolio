import { matches, statuses, type Application } from "./application";
import { isValidDate } from "./isValidDate";

// A date field can be empty or contain a valid calendar date.
function isOptionalDate(value: unknown): boolean {
  return typeof value === "string" && (value === "" || isValidDate(value));
}

// A link can be empty or contain a valid HTTP or HTTPS address.
function isOptionalLink(value: unknown): boolean {
  return typeof value === "string" && (
    value === "" || (/^https?:\/\//i.test(value) && URL.canParse(value))
  );
}

// Check the required fields and allowed values for one application.
function isApplication(value: unknown): value is Application {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const application = value as Record<string, unknown>;

  return (
    typeof application.id === "number" && Number.isSafeInteger(application.id) &&
    typeof application.company === "string" && typeof application.position === "string" &&
    statuses.some((status) => status === application.status) &&
    matches.some((match) => match === application.companyFit) &&
    matches.some((match) => match === application.positionMatch) &&
    isOptionalDate(application.dateApplied) && isOptionalDate(application.lastUpdated) &&
    // Keep invalid follow-up text so the dashboard can display its existing warning.
    (application.followUpDate === null || typeof application.followUpDate === "string") &&
    typeof application.nextAction === "string" && typeof application.notes === "string" &&
    isOptionalLink(application.website) && isOptionalLink(application.jobPosting)
  );
}

// Check every item in the list and make sure each ID is unique.
export function isApplications(value: unknown): value is Application[] {
  return Array.isArray(value) && value.every(isApplication) &&
    new Set(value.map((application) => application.id)).size === value.length;
}

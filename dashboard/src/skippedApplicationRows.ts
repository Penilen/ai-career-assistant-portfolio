export const skippedApplicationRowsHeader = "X-Skipped-Application-Rows";

export type SkippedApplicationRows = {
  total: number;
  missingCompany: number;
  missingPosition: number;
  invalidStatus: number;
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function readSkippedApplicationRows(header: string | null): SkippedApplicationRows | null {
  if (header === null) return null;

  try {
    const data: unknown = JSON.parse(header);
    if (typeof data !== "object" || data === null) return null;
    const { total, missingCompany, missingPosition, invalidStatus } = data as Record<string, unknown>;
    if (
      !isCount(total) || !isCount(missingCompany) || !isCount(missingPosition) || !isCount(invalidStatus) ||
      Math.max(missingCompany, missingPosition, invalidStatus) > total ||
      missingCompany + missingPosition + invalidStatus < total
    ) return null;

    return { total, missingCompany, missingPosition, invalidStatus };
  } catch {
    return null;
  }
}

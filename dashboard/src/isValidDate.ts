// Validate a calendar date before using it for follow-up scheduling or display.
export function isValidDate(value: string): boolean {
  // Require the exact stored format so whitespace and partial dates are rejected.
  if (value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  // The MVP excludes these years, which Date.UTC would interpret as 1900–1999.
  if (year < 100) {
    return false;
  }

  // Use UTC so local time zone rules cannot affect calendar validation.
  const date = new Date(Date.UTC(year, month - 1, day));
  // JavaScript normalizes overflow, so compare against the original components.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

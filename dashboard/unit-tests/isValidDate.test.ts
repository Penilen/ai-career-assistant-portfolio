import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidDate } from "../src/isValidDate.ts";

test("accepts valid calendar dates", () => {
  // Check each date in the list. A real date in YYYY-MM-DD should return true.
  for (const value of ["2026-01-01", "2026-04-30", "2026-12-31"]) {
    assert.equal(isValidDate(value), true, value);
  }
});

test("rejects out-of-range months and impossible days", () => {
  // These dates have the right format, but the month or day does not exist.
  for (const value of [
    "2026-00-15",
    "2026-13-15",
    "2026-01-00",
    "2026-01-32",
    "2026-04-31",
    "2024-02-30",
  ]) {
    assert.equal(isValidDate(value), false, value);
  }
});

test("applies Gregorian leap-year rules", () => {
  // February 29 is valid only in a leap year. These examples include century years.
  // Century years need to be divisible by 400 to have a leap day.
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2000-02-29"), true);
  assert.equal(isValidDate("2026-02-29"), false);
  assert.equal(isValidDate("1900-02-29"), false);
});

test("requires exactly YYYY-MM-DD", () => {
  // Reject extra spaces, missing zeroes, and anything else outside YYYY-MM-DD.
  for (const value of [
    "",
    " 2026-04-30",
    "2026-04-30\n",
    "2026-4-30",
    "2026-04-3",
    "2026/04/30",
    "2026-04-30T00:00:00Z",
    "+2026-04-30",
    "abcd-04-30",
  ]) {
    // Show the exact input on failure, including any spaces or line breaks.
    assert.equal(isValidDate(value), false, JSON.stringify(value));
  }
});

test("accepts only four-digit years from 0100 through 9999", () => {
  // Check the first and last supported years and examples outside that range.
  assert.equal(isValidDate("0000-01-01"), false);
  assert.equal(isValidDate("0001-01-01"), false);
  assert.equal(isValidDate("0099-12-31"), false);
  assert.equal(isValidDate("0100-01-01"), true);
  assert.equal(isValidDate("9999-12-31"), true);
  assert.equal(isValidDate("10000-01-01"), false);
});

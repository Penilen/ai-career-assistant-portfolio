# Dashboard quality assurance

## Phase 1 acceptance

Phase 1 was approved on November 27, 2026, for the local, read-only dashboard. The original project used separate identities for the private tracker and a fictional Test spreadsheet. The credential-free fixture stayed independent when the backend switched between data sources. Read-only metadata checks confirmed that each Sheets identity could access its assigned file and was denied cross-access. Public testing in this snapshot uses repository fixtures and mocked requests.

| User-confirmed manual case | Observed result |
|---|---|
| Statistics and priorities | Counts, ordering, and urgency labels matched expectations. |
| Search, filters, and reset | Case-insensitive search and combined filters worked. Global statistics stayed unchanged. |
| Application details | Fields and links displayed correctly, and opening, closing, and switching records worked. |
| Follow-up dates and closed statuses | Available past, current, invalid, and empty cases behaved as expected. Closed records retained saved dates without urgency labels. |
| Desktop and mobile | Both layouts worked in Chrome, including details at 400 px. |
| Loading, empty results, and retry | Throttling showed loading, empty search could be reset, and Retry recovered after request blocking ended. |
| Mode isolation | The two fictional sources were distinct, and the fixture stayed independent when the private mode was selected. |

All seven cases passed within the scenarios available to test. An empty API response, a rejected application with a saved follow-up, and an offer with a valid follow-up were covered by automation. Broader browser, calendar and time zone boundary, keyboard, and screen-reader coverage remains limited.

## Resolved issues

- **Closed-status urgency.** The original QA review found misleading urgency labels on closed applications. A shared display check now suppresses those labels while preserving saved dates. Regression tests cover all six statuses across desktop rows, mobile cards, and details.
- **Missing application date.** The user verified that an empty source cell explained the missing date and that the correct date appeared after refresh.
- **Chrome form diagnostic.** A stable search input ID resolved a DevTools warning. Focused desktop and mobile Chrome checks confirmed that the warning cleared and search, filtering, and reset still worked.

## Automated checks

The signed-off version passed TypeScript, 20 Node.js unit tests, 21 Chromium Playwright tests, and the production build. The original post-merge Dashboard QA workflow passed. The public workflow configuration independently checks TypeScript, unit tests, and Chromium E2E on dashboard changes. Its Sheets tests use a simulated upstream response.

From `dashboard/` after installing dependencies, stop any running development servers before Playwright starts its fixture API and Vite:

```bash
pnpm exec tsc --noEmit -p tsconfig.json
node --test unit-tests/*.test.ts
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

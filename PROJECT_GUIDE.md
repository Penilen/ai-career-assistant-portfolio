# AI Career Assistant — technical walkthrough and presentation guide

**Scope:** The local React dashboard, Node.js API, and automated tests for the read-only Phase 1 MVP. The public preview uses the credential-free fixture. Phase 1 acceptance was approved on November 27, 2026. [Acceptance results](docs/QA.md#phase-1-acceptance)

## The project in one minute

The dashboard gives job seekers a searchable view of applications, global statistics, and follow-up priorities. It shows a table on desktop and cards on mobile. Both views open the same read-only application details.

The portfolio includes a reference Sheets backend and an independent fixture API. The fixture API serves nine fictional records without Google credentials and gives reviewers the same dashboard experience. The original integration was verified read-only with separate access for personal and fictional integration data. [QA evidence](docs/QA.md)

## Where to find the main pieces

| Path | What it does |
|---|---|
| [README.md](README.md) | Portfolio overview and credential-free quick start. |
| [dashboard/package.json](dashboard/package.json) | Dependencies and scripts such as `dev` and `build`. |
| [dashboard/index.html](dashboard/index.html) and [main.tsx](dashboard/src/main.tsx) | HTML entry point and React mount. |
| [dashboard/src/App.tsx](dashboard/src/App.tsx) | API loading states, statistics, filters, and dashboard views. |
| [dashboard/src/application.ts](dashboard/src/application.ts) | Shared application type and allowed statuses and ratings. |
| [dashboard/src/mapSheetRows.ts](dashboard/src/mapSheetRows.ts) | Converts Sheets rows to application records and reports validation issues. |
| [dashboard/src/sampleApplications.ts](dashboard/src/sampleApplications.ts) | Nine fictional records for fixture mode and browser tests. |
| [dashboard/server/](dashboard/server/) | Local Node.js API and read-only Sheets integration. |
| [dashboard/src/index.css](dashboard/src/index.css) | Global fonts, colors, badges, animations, and responsive styles. |
| [dashboard/tsconfig.json](dashboard/tsconfig.json) and [vite.config.ts](dashboard/vite.config.ts) | TypeScript checks and Vite development and build behavior. |

Use Node.js 22 and pnpm 10.34.3. Start with the [fixture quick start](README.md#quick-start) for a portfolio walkthrough. If the pnpm command is unavailable, the pinned version can be invoked through `npx --yes pnpm@10.34.3`. On Windows, `pnpm.cmd` may help when PowerShell blocks the script launcher.

## From startup to the screen

```text
pnpm dev → Vite → index.html → main.tsx → App.tsx → Dashboard
```

Vite serves the HTML entry point. React mounts into `<div id="root"></div>` from `main.tsx`. On load, `App.tsx` requests `/api/applications`, which Vite proxies to the local Node.js server. The frontend validates the response and shows either the dashboard or a load error. **Retry** sends a new request.

## What an application contains

The TypeScript `Application` type defines fields such as company, position, status, match ratings, dates, notes, and next action. A `string | null` follow-up date allows the date to be missing. The mapper checks required fields, handles supported date formats, and reports unusable rows.

The fixture records follow the same shape as the Sheets-backed records. Their dates are relative to the time the fixture server starts. Selected browser tests fix the clock and substitute dates to exercise edge cases.

## How the dashboard tracks selections

React state holds the search text, the Status, Match, and Follow-up selections, and the currently selected application. Search starts empty, each filter starts at `All`, and the details panel starts closed. Changing a selection updates the visible list or panel.

## Statistics and follow-up priorities

The four statistics use the full loaded dataset and keep their values when the list is filtered.

| Statistic | Rule |
|---|---|
| Total Applications | All loaded application records. |
| Awaiting Response | Records with status `Applied`. |
| Pending Follow-ups | Active records with a valid follow-up date, including past, current, and future dates. |
| Interviews | Records with status `Interview`. |

Active statuses are `Applied`, `Interview`, and `Offer`. The dashboard sorts eligible follow-ups by date and shows the earliest three. On wider screens, **Today’s focus** counts the items among those three that are due today or overdue. Empty or invalid follow-up dates are excluded from these calculations.

## Search and filters

Search trims outer whitespace and matches part of a company or position name without regard to case. The search and applicable filters combine with AND logic:

```tsx
return matchesSearch && matchesStatus && matchesMatch && matchesFollowUp;
```

Each `All` option disables that filter's restriction. The date-specific options are `Overdue`, `Today`, and `Next 7 Days`. Those require an active status and a valid date. `Next 7 Days` covers tomorrow through day seven. **Reset** clears search and returns all three filters to `All`.

## Desktop, mobile, and details

Desktop rows and mobile cards both render the filtered list. The shared `FilterSelect` component handles menu positioning, selection, and keyboard navigation. Clicking a row, card, or priority opens the details panel:

```tsx
{selected && <DetailsPanel application={selected} onClose={() => setSelected(null)} />}
```

The panel displays the saved data and available links. All three application views show **Invalid date** for a non-empty malformed follow-up and **Not scheduled** for an empty follow-up. Closed applications retain valid saved dates without urgency labels. Global CSS and Tailwind utilities define spacing, colors, and responsive behavior.

## Testing and build

The project uses Node.js unit tests, TypeScript checks, and Playwright with Chromium. The browser suite starts its own fixture API, so no Google credentials are needed. The [QA summary](docs/QA.md) records automated and manual results separately and lists the test commands.

`pnpm-lock.yaml` records resolved dependency versions. `node_modules/` is created on install, and `dist/` is generated by `pnpm build`.

## Short presentation walkthrough

> AI Career Assistant is a read-only dashboard for following up on job applications. React and TypeScript render the desktop and mobile views. A local Node.js API reads and validates Google Sheets rows. I can demonstrate the same workflow with fictional records and no Google credentials. I defined the rules and user experience, reviewed AI-assisted implementation proposals, and validated the results through manual checks and automated tests.

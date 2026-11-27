import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { isValidDate } from "./isValidDate";
import { isApplications } from "./isApplications";
import { sampleApplications } from "./sampleApplications";
import {
  readSkippedApplicationRows, skippedApplicationRowsHeader, type SkippedApplicationRows,
} from "./skippedApplicationRows";

import type { Application, Match, Status } from "./application";

// One day in milliseconds, used when comparing calendar dates below.
const MS_PER_DAY = 86_400_000;
// Only these statuses can have active follow-up reminders.
const ACTIVE_STATUSES: Status[] = ["Applied", "Interview", "Offer"];

// Converts a Date to local YYYY-MM-DD text, such as "2026-11-12".
function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Turns YYYY-MM-DD text into a Date for display and sorting.
function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

// Turns a date into a whole-day number so time of day does not affect comparisons.
function calendarDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

// Returns the number of calendar days until a date; negative means it has passed.
function daysFromToday(date: string) {
  return calendarDay(date) - calendarDay(toLocalDate(new Date()));
}

// Checks whether an application still has an active follow-up workflow.
function hasActiveStatus(application: Application) {
  return ACTIVE_STATUSES.includes(application.status);
}

function isValidFollowUpDate(date: string | null): date is string {
  return date !== null && isValidDate(date);
}

// Formats a date for the UI; short uses an abbreviated month and omits the year.
function formatDate(date: string, short = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: short ? "short" : "long",
    day: "numeric",
    year: short ? undefined : "numeric",
  }).format(parseDate(date));
}

// Chooses the follow-up text and color category based on its distance from today.
function followUpLabel(date: string) {
  const days = daysFromToday(date);
  if (days < 0) return { text: "Overdue", tone: "danger" };
  if (days === 0) return { text: "Today", tone: "today" };
  return { text: days === 1 ? "Tomorrow" : `In ${days} days`, tone: "upcoming" };
}

function FollowUpUrgency({
  application,
  as: Tag,
  className,
}: {
  application: Application;
  as: "p" | "span" | "small";
  className: string;
}) {
  if (!hasActiveStatus(application) || !isValidFollowUpDate(application.followUpDate)) {
    return null;
  }

  const { text, tone } = followUpLabel(application.followUpDate);
  return <Tag className={`${className} follow-text-${tone}`}>{text}</Tag>;
}

// Small reusable SVG wrapper used to build all dashboard icons consistently.
function Icon({
  children,
  size = 18,
  strokeWidth = 1.8,
}: {
  children: ReactNode;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
}

// Named SVG drawings that the dashboard can reuse in different sections.
const icons = {
  briefcase: (
    <Icon>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </Icon>
  ),
  clock: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </Icon>
  ),
  users: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  user: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
    </Icon>
  ),
  search: (
    <Icon size={17}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icon>
  ),
  chevron: (
    <Icon size={16}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  close: (
    <Icon size={20}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  ),
  external: (
    <Icon size={15}>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Icon>
  ),
  sparkle: (
    <Icon size={18}>
      <path d="m12 3-1 3.2A7 7 0 0 1 6.2 11L3 12l3.2 1a7 7 0 0 1 4.8 4.8l1 3.2 1-3.2a7 7 0 0 1 4.8-4.8l3.2-1-3.2-1A7 7 0 0 1 13 6.2L12 3Z" />
    </Icon>
  ),
};

// Maps each application status to the CSS class that gives its badge a color.
const statusStyles: Record<Status, string> = {
  Applied: "status-blue",
  Interview: "status-purple",
  Offer: "status-green",
  Rejected: "status-red",
  "No response": "status-amber",
  Withdrawn: "status-gray",
};

// Uses the same idea for match ratings, with their own CSS colors.
const matchStyles: Record<Match, string> = {
  Strong: "match-strong",
  Good: "match-good",
  Potential: "match-potential",
  Low: "match-low",
  "Not assessed": "match-not-assessed",
};

// Shows a status label and its matching color wherever a status appears.
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge ${statusStyles[status]}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

// Shows a match rating with its matching color.
function MatchBadge({ match }: { match: Match }) {
  return <span className={`match-badge ${matchStyles[match]}`}>{match}</span>;
}

// The page can be loading, show an error, or show the applications.
type LoadState =
  | { status: "loading" | "error" }
  | { status: "success"; applications: Application[]; skippedRows: SkippedApplicationRows | null };

export default function App() {
  if (import.meta.env.MODE === "portfolio") {
    return <Dashboard applications={sampleApplications} skippedRows={null} />;
  }

  return <ApiDashboard />;
}

function ApiDashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Changing this number starts a new request.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Let React cancel this request when it is no longer needed.
    const controller = new AbortController();

    async function loadApplications() {
      try {
        // Ask the local API for applications and check whether the request succeeded.
        const response = await fetch("/api/applications", { signal: controller.signal });
        if (!response.ok) throw new Error("Applications request failed");

        // Read the JSON and check the data before giving it to the dashboard.
        const data: unknown = await response.json();
        if (!isApplications(data)) throw new Error("Invalid applications response");

        // Read the skipped-row counts separately from the applications.
        const skippedRows = readSkippedApplicationRows(response.headers.get(skippedApplicationRowsHeader));
        if (!controller.signal.aborted) setState({ status: "success", applications: data, skippedRows });
      } catch {
        // Show the error screen if the active request fails.
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }

    void loadApplications();
    return () => controller.abort();
  }, [attempt]);

  // Give the dashboard the loaded list so its controls can work with it.
  if (state.status === "success") {
    return <Dashboard applications={state.applications} skippedRows={state.skippedRows} />;
  }

  // Show the loading message again and start a fresh request.
  function retry() {
    setState({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }

  return (
    <main className="min-h-screen bg-[#f5f8f5] p-6 text-[#263b30]">
      <div className="mx-auto max-w-xl rounded-xl border border-[#dce8df] bg-white p-6">
        {state.status === "loading" ? (
          <p role="status">Loading applications…</p>
        ) : (
          <>
            <p role="alert">Could not load applications. Check that the local API is running.</p>
            <button
              className="mt-4 rounded-lg bg-[#263b30] px-4 py-2 font-semibold text-white"
              type="button"
              onClick={retry}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </main>
  );
}

// Keep the existing dashboard controls together once the applications are available.
function Dashboard({ applications, skippedRows }: {
  applications: Application[];
  skippedRows: SkippedApplicationRows | null;
}) {
  // State stores values that can change as the user searches, filters, or opens details.
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [match, setMatch] = useState("All");
  const [followUp, setFollowUp] = useState("All");
  const [selected, setSelected] = useState<Application | null>(null);

  // Require a valid date so invalid entries cannot count or become priorities.
  const activeFollowUps = useMemo(
    () =>
      applications
        .filter((item) => hasActiveStatus(item) && isValidFollowUpDate(item.followUpDate))
        .sort(
          (a, b) => parseDate(a.followUpDate!).getTime() - parseDate(b.followUpDate!).getTime(),
        ),
    [applications],
  );

  // Show the first three follow-ups as the next priorities.
  const priorityFollowUps = activeFollowUps.slice(0, 3);
  // Each card has a label, a count, an icon, and a color. Counts use all applications.
  const stats = [
    {
      label: "Total Applications",
      value: applications.length,
      icon: icons.briefcase,
      tone: "sage",
    },
    {
      label: "Awaiting Response",
      value: applications.filter((item) => item.status === "Applied").length,
      icon: icons.clock,
      tone: "amber",
    },
    {
      label: "Pending Follow-ups",
      value: activeFollowUps.length,
      icon: icons.calendar,
      tone: "blue",
    },
    {
      label: "Interviews",
      value: applications.filter((item) => item.status === "Interview").length,
      icon: icons.users,
      tone: "purple",
    },
  ];

  // Choose the welcome message from the global interview and awaiting-response counts.
  const message =
    stats[3].value > 0
      ? `${stats[3].value} interviews in motion — your preparation is turning applications into conversations.`
      : stats[1].value > 2
        ? "A few applications are in their “refresh the inbox” era. A thoughtful follow-up may help."
        : "Your search is organized and moving forward. Small, consistent steps are doing the work.";

  // Build the visible list from the loaded applications and current search/filter choices.
  const filteredApplications = useMemo(() => {
    // Ignore spaces at the edges and letter case (for example, " NORTHSTAR " → "northstar").
    const normalizedSearch = search.trim().toLowerCase();

    // Check each application separately; filter keeps only those that pass below.
    return applications.filter((item) => {
      // Empty search matches everything; otherwise check Company or Position for partial text.
      const matchesSearch =
        !normalizedSearch ||
        item.company.toLowerCase().includes(normalizedSearch) ||
        item.position.toLowerCase().includes(normalizedSearch);
      // "All" removes only that filter's restriction.
      const matchesStatus = status === "All" || item.status === status;
      const matchesMatch = match === "All" || item.positionMatch === match;
      // Validate before comparing days so overflow cannot match a date filter.
      const days = isValidFollowUpDate(item.followUpDate) ? daysFromToday(item.followUpDate) : null;
      // Date filters require an active status: past, today, or tomorrow through day 7.
      const matchesFollowUp =
        followUp === "All" ||
        (hasActiveStatus(item) &&
          ((followUp === "Overdue" && days !== null && days < 0) ||
            (followUp === "Today" && days === 0) ||
            (followUp === "Next 7 Days" && days !== null && days >= 1 && days <= 7)));

      // AND: an application appears only if it passes every active condition.
      return matchesSearch && matchesStatus && matchesMatch && matchesFollowUp;
    });
  // Recalculate the list whenever the search text or any filter changes.
  }, [applications, search, status, match, followUp]);

  // Used to tell whether there is anything for the Reset control to clear.
  const hasFilters = Boolean(search || status !== "All" || match !== "All" || followUp !== "All");

  // Restore the initial view: empty search and all three filters set to "All".
  function resetFilters() {
    setSearch("");
    setStatus("All");
    setMatch("All");
    setFollowUp("All");
  }

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-[#263b30]">
      {/* Top bar: app name on the left, fictional prototype profile on the right. */}
      <header className="border-b border-[#dfe8e1] bg-white">
        <div className="dashboard-header-inner mx-auto flex h-[72px] max-w-[1380px] items-center justify-between px-4 md:px-8">
          {/* App icon and title are fixed text, not loaded from application data. */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#648c72] text-white">
              {icons.sparkle}
            </div>
            <div className="min-w-0">
              <div className="font-heading text-[15px] font-semibold tracking-[-0.01em] min-[360px]:text-[17px]">
                AI Career Assistant
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f6f66]">
                {import.meta.env.MODE === "portfolio" ? "Portfolio demo · Fictional data" : "Career dashboard"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">My Workspace</div>
              <div className="text-xs text-[#5f6f66]">Career Dashboard</div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5f0e8] text-[#4d755c]">
              {icons.user}
            </div>
          </div>
        </div>
      </header>

      {/* The main area contains the dashboard sections below the top bar. */}
      <main className="mx-auto max-w-[1380px] px-4 py-5 md:px-8 md:py-7">
        {/* Welcome card: fixed greeting plus a message chosen from the global statistics. */}
        <section className="welcome-card mb-4 flex items-center justify-between gap-8 overflow-hidden rounded-2xl border border-[#dce8df] bg-white px-5 py-5 md:mb-5 md:px-7">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4f725c]">
              Your job search, at a glance
            </p>
            <h1 className="font-heading text-[23px] font-semibold leading-tight tracking-[-0.035em] text-[#263b30] md:text-[27px]">
              Welcome back! <span aria-label="waving hand">👋</span>
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-[#5f6f66]">{message}</p>
          </div>
          {/* On large screens, show how many of the top three follow-ups are due or overdue. */}
          <div className="hidden min-w-[250px] items-center gap-3 rounded-xl bg-[#f1f6f2] px-4 py-3 lg:flex">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#648c72] shadow-[0_1px_3px_rgba(38,59,48,0.08)]">
              {icons.sparkle}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5f6f66]">
                Today’s focus
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#3c5646]">
                {priorityFollowUps.filter((item) => daysFromToday(item.followUpDate!) <= 0).length}{" "}
                follow-ups need attention
              </p>
            </div>
          </div>
        </section>

        {skippedRows && skippedRows.total > 0 && (
          <aside
            role="status"
            aria-label="Skipped applications"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:mb-5"
          >
            <p className="font-semibold">
              {skippedRows.total === 1
                ? "1 application row was skipped."
                : `${skippedRows.total} application rows were skipped.`}
            </p>
            <p className="mt-1">The dashboard counts only loaded applications. Check these fields in your tracker.</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {skippedRows.missingCompany > 0 && <li>Missing company: {skippedRows.missingCompany}</li>}
              {skippedRows.missingPosition > 0 && <li>Missing position: {skippedRows.missingPosition}</li>}
              {skippedRows.invalidStatus > 0 && <li>Missing or invalid status: {skippedRows.invalidStatus}</li>}
            </ul>
          </aside>
        )}

        {/* The four counts describe all applications, even when the list below is filtered. */}
        <section
          aria-label="Application statistics"
          className="mb-4 grid grid-cols-2 gap-3 md:mb-5 md:grid-cols-4 md:gap-4"
        >
          {/* Repeat one card per stat; its label is React's unique key for that card. */}
          {stats.map((stat) => (
            <div
              className="stat-card min-w-0 rounded-2xl border border-[#e0e8e2] bg-white p-3 md:p-4"
              key={stat.label}
            >
              {/* Each entry supplies its icon, color tone, title, and calculated count. */}
              <div className={`stat-icon stat-${stat.tone}`}>{stat.icon}</div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-4 text-[#5f6f66] md:text-[12px]">
                  {stat.label}
                </p>
                <p className="font-heading mt-0.5 text-[26px] font-semibold leading-none tracking-[-0.03em]">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Show up to three follow-ups, starting with the earliest date. */}
        <section className="mb-4 rounded-2xl border border-[#e0e8e2] bg-white px-4 py-4 md:mb-5 md:px-5">
          {/* The title stays the same; the number shows how many follow-ups are listed. */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-heading text-[17px] font-semibold tracking-[-0.02em]">
                Follow-up priorities
              </h2>
              <p className="mt-0.5 text-xs text-[#5f6f66]">Your next priorities, sorted by date</p>
            </div>
            <span className="rounded-full bg-[#edf4ef] px-2.5 py-1 text-xs font-semibold text-[#567663]">
              {priorityFollowUps.length} activities
            </span>
          </div>

          {/* Show follow-up cards if there are any. Otherwise, show a message. */}
          {priorityFollowUps.length ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3">
              {/* Make one card for each follow-up. */}
              {priorityFollowUps.map((item) => {
                // Choose date text and color, such as Overdue or Today.
                const label = followUpLabel(item.followUpDate!);
                // Clicking the card opens this application's details.
                return (
                  <button
                    className="follow-up-item group flex min-w-0 items-center gap-3 rounded-xl border border-[#e3e9e4] px-3.5 py-3 text-left"
                    key={item.id}
                    onClick={() => setSelected(item)}
                    type="button"
                  >
                    {/* Show the month and day in the small date box. */}
                    <div className={`date-tile date-${label.tone}`}>
                      <span>
                        {new Intl.DateTimeFormat("en-US", { month: "short" }).format(
                          parseDate(item.followUpDate!),
                        )}
                      </span>
                      <strong>{parseDate(item.followUpDate!).getDate()}</strong>
                    </div>
                    {/* Show the date, label, company, and position. */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`follow-label follow-${label.tone}`}>{label.text}</span>
                        <span className="truncate text-[11px] text-[#5f6f66]">
                          {formatDate(item.followUpDate!, true)}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm font-semibold text-[#30483a] md:truncate">
                        {item.company}
                      </p>
                      <p className="break-words text-xs text-[#5f6f66] md:truncate">
                        {item.position}
                      </p>
                    </div>
                    <span className="text-[#9aaba0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#648c72]">
                      {icons.chevron}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-[#f5f8f5] py-6 text-center text-sm text-[#5b6c62]">
              {/* Show this message when there are no follow-ups. */}
              Your follow-up list is clear. Enjoy the rare sight of an empty queue.
            </div>
          )}
        </section>

        {/* Search, filters, and responsive desktop/mobile application lists. */}
        <section className="relative rounded-2xl border border-[#dfe7e1] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e4eae5] px-4 py-4 md:flex-row md:items-end md:justify-between md:gap-6 md:px-5">
            {/* Show the section title and how many applications are visible out of the total. */}
            <div className="shrink-0">
              <h2 className="font-heading text-[18px] font-semibold tracking-[-0.02em]">
                Applications
              </h2>
              <p className="mt-0.5 text-xs text-[#5f6f66]">
                {filteredApplications.length} of {applications.length} applications
              </p>
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 md:flex md:flex-1 md:flex-wrap md:items-end md:justify-end">
              {/* Typing here updates search, which changes the visible application list. */}
              <label className="search-field relative block w-full md:max-w-[260px]">
                {/* Screen readers can read this label even though it is not visible. */}
                <span className="sr-only">Search applications</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#65756c]">
                  {icons.search}
                </span>
                {/* The input displays search; onChange saves each new value as the user types. */}
                <input
                  className="h-10 w-full rounded-lg border border-[#dbe3dd] bg-[#fbfcfb] pl-9 pr-3 text-sm outline-none transition placeholder:text-[#5f6f66] focus:border-[#648c72] focus:ring-2 focus:ring-[#648c72]/15"
                  id="application-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company or position"
                  type="search"
                  value={search}
                />
              </label>
              {/* Status filter: shows the current choice and saves a new one. */}
              <FilterSelect
                ariaLabel="Filter by status"
                onChange={setStatus}
                options={[
                  "All",
                  "Applied",
                  "Interview",
                  "Offer",
                  "Rejected",
                  "No response",
                  "Withdrawn",
                ]}
                prefix="Status"
                value={status}
              />
              {/* Match filter: uses the position match rating from each application. */}
              <FilterSelect
                ariaLabel="Filter by position match"
                onChange={setMatch}
                options={["All", "Strong", "Good", "Potential", "Low", "Not assessed"]}
                prefix="Match"
                value={match}
              />
              {/* Follow-up filter: lets the user choose a date range. */}
              <FilterSelect
                ariaLabel="Filter by follow-up date"
                onChange={setFollowUp}
                options={["All", "Overdue", "Today", "Next 7 Days"]}
                prefix="Follow-up"
                value={followUp}
              />
              {/* Reset is available only when search or a filter has changed. */}
              <button
                className="h-10 w-full rounded-lg px-2 text-xs font-semibold text-[#587161] transition hover:bg-[#f0f5f1] disabled:cursor-default disabled:text-[#a4ada7] disabled:hover:bg-transparent md:w-auto md:shrink-0"
                disabled={!hasFilters}
                onClick={resetFilters}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="min-h-[355px]">
            {/* Show the list when at least one application matches the search and filters. */}
            {filteredApplications.length ? (
              <>
                {/* On desktop, show matching applications in a table. */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left">
                    {/* These are the table's column names. */}
                    <thead>
                      <tr className="bg-[#f8faf8] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f6f66]">
                        <th className="w-[40%] px-5 py-3">Company &amp; position</th>
                        <th className="w-[20%] px-4 py-3">Status</th>
                        <th className="w-[17%] px-4 py-3">Position match</th>
                        <th className="w-[18%] px-4 py-3">Follow-up</th>
                        <th className="w-[5%] px-4 py-3">
                          <span className="sr-only">Open details</span>
                        </th>
                      </tr>
                    </thead>
                    {/* Make one table row for each visible application. */}
                    <tbody className="divide-y divide-[#e8ede9]">
                      {filteredApplications.map((item) => (
                        /* Each row is one application and can open its details. */
                        <tr
                          aria-label={`View ${item.company} application details`}
                          className="application-row cursor-pointer transition-colors hover:bg-[#f6f9f6] focus:bg-[#f6f9f6] focus:outline-none"
                          key={item.id}
                          onClick={() => setSelected(item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelected(item);
                            }
                          }}
                          tabIndex={0}
                        >
                          {/* Company and position. */}
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-[#30483a]">{item.company}</p>
                            <p className="mt-0.5 text-xs text-[#5f6f66]">{item.position}</p>
                          </td>
                          {/* Status shown with its matching color. */}
                          <td className="px-4 py-3.5">
                            <StatusBadge status={item.status} />
                          </td>
                          {/* Position match shown with its matching color. */}
                          <td className="px-4 py-3.5">
                            <MatchBadge match={item.positionMatch} />
                          </td>
                          {/* Distinguish a bad date from an unscheduled follow-up. */}
                          <td className="px-4 py-3.5">
                            {isValidFollowUpDate(item.followUpDate) ? (
                              <div>
                                <p className="text-sm font-medium text-[#42564a]">
                                  {formatDate(item.followUpDate, true)}
                                </p>
                                <FollowUpUrgency
                                  application={item}
                                  as="p"
                                  className="mt-0.5 text-[11px] font-semibold"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-[#5f6f66]">
                                {item.followUpDate ? "Invalid date" : "Not scheduled"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-[#91a097]">{icons.chevron}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* On small screens, show the same applications as cards instead of a table. */}
                <div className="divide-y divide-[#e8ede9] md:hidden">
                  {/* Make one button for each visible application; clicking opens its details. */}
                  {filteredApplications.map((item) => (
                    <button
                      aria-label={`View ${item.company} application details`}
                      className="mobile-application-card block w-full px-4 py-4 text-left transition-colors hover:bg-[#f6f9f6] focus:bg-[#f6f9f6] focus:outline-none"
                      key={item.id}
                      onClick={() => setSelected(item)}
                      type="button"
                    >
                      {/* Company and position appear at the top of the card. */}
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-[#30483a]">
                            {item.company}
                          </p>
                          <p className="mt-0.5 break-words text-xs leading-5 text-[#5f6f66]">
                            {item.position}
                          </p>
                        </div>
                        <span className="mt-0.5 shrink-0 text-[#91a097]">{icons.chevron}</span>
                      </div>
                      {/* Show status, match, and a follow-up date if one exists. */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        <MatchBadge match={item.positionMatch} />
                        {isValidFollowUpDate(item.followUpDate) ? (
                          <span className="ml-auto text-right text-[11px] text-[#5f6f66]">
                            <span className="block font-medium text-[#42564a]">
                              {formatDate(item.followUpDate, true)}
                            </span>
                            <FollowUpUrgency
                              application={item}
                              as="span"
                              className="font-semibold"
                            />
                          </span>
                        ) : (
                          <span className="ml-auto text-[11px] text-[#5f6f66]">
                            {item.followUpDate ? "Invalid date" : "Not scheduled"}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              // No applications match the current search and filters.
              <div className="flex min-h-[355px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ef] text-[#648c72]">
                  {icons.search}
                </div>
                <h3 className="font-heading font-semibold">No applications found</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-[#5f6f66]">
                  Try adjusting your search or filters. Your perfect match may just be hiding behind
                  a dropdown.
                </p>
                {/* Clear search and filters to show all applications again. */}
                <button
                  className="mt-3 text-sm font-semibold text-[#567663] hover:underline"
                  onClick={resetFilters}
                  type="button"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Show details for the clicked application; closing clears the choice and hides them. */}
      {selected && <DetailsPanel application={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// This dropdown lets the user choose one value for Status, Match, or Follow-up.
// It shows the choices, saves the clicked choice, and closes the menu.
// The extra code below keeps the menu visible and usable with a keyboard.
function FilterSelect({
  ariaLabel,
  onChange,
  options,
  prefix,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: string[];
  prefix: string;
  value: string;
}) {
  // Remember whether the menu is open, which choice is active, and its allowed height.
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [maxMenuHeight, setMaxMenuHeight] = useState(260);
  // Keep links to the menu, its button, and its choices so we can focus or position them.
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Give the choices list an ID so the button can point to it for accessibility.
  const listboxId = useId();

  // Close the menu when the user clicks outside it or resizes the window.
  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnResize() {
      setIsOpen(false);
    }

    // Start listening for those two actions.
    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("resize", closeOnResize);

    // Stop listening when this dropdown is removed from the page.
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("resize", closeOnResize);
    };
  }, []);

  // Run these steps when the menu opens or its choices change.
  useEffect(() => {
    // A closed menu needs no positioning or keyboard focus.
    if (!isOpen) return;

    // Find where the saved choice appears in options (0 = first, 1 = second).
    // If it is not found, start at the first choice instead.
    const selectedIndex = Math.max(0, options.indexOf(value));
    // Mark that choice as active for keyboard navigation.
    setActiveIndex(selectedIndex);

    // Make room on the screen for the open dropdown menu.
    const positionMenu = () => {
      // Find the dropdown button; stop if it is not on the page yet.
      const button = buttonRef.current;
      if (!button) return;

      // Compare the menu's preferred height with the space below the button.
      const desiredHeight = Math.min(options.length * 40 + 8, 260);
      const availableBelow = window.innerHeight - button.getBoundingClientRect().bottom - 12;

      // If there is too little room, scroll the button closer to the screen's center.
      if (availableBelow < Math.min(desiredHeight, 160)) {
        button.scrollIntoView({ behavior: "auto", block: "center" });
      }

      // After any scroll, measure again and keep the menu within the screen.
      requestAnimationFrame(() => {
        const updatedBottom = button.getBoundingClientRect().bottom;
        setMaxMenuHeight(Math.max(96, window.innerHeight - updatedBottom - 12));
        // Put keyboard focus on the choice that is already selected.
        optionRefs.current[selectedIndex]?.focus();
      });
    };

    // Run the positioning steps whenever this effect runs for an open menu.
    positionMenu();
  }, [isOpen, options, value]);

  // Open the menu with the current choice active.
  function openMenu(index = Math.max(0, options.indexOf(value))) {
    setActiveIndex(index);
    setIsOpen(true);
  }

  // Save a new choice, close the menu, and return keyboard focus to its button.
  function selectOption(option: string) {
    onChange(option);
    setIsOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  // Move through menu choices when the user presses keys on the keyboard.
  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = activeIndex;

    // Arrows move one choice; Home and End jump to the first or last choice.
    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % options.length;
    else if (event.key === "ArrowUp")
      nextIndex = (activeIndex - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    // Escape closes the menu and returns to its button.
    else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    // Tab closes the menu and lets the user move on to the next page control.
    } else if (event.key === "Tab") {
      setIsOpen(false);
      return;
    } else {
      return;
    }

    // Stop the browser's usual response to this key so it does not scroll the page.
    event.preventDefault();
    // Remember the choice reached with the arrow, Home, or End key.
    setActiveIndex(nextIndex);
    // Move keyboard focus to that choice so the next key starts from there.
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    // Keep the button and its menu together so clicks outside can be detected.
    <div className="relative w-full min-w-0 md:w-[170px] md:shrink-0" ref={rootRef}>
      {/* This button shows the current choice and controls the menu below it. */}
      {/* The aria values tell screen readers what the button does and whether it is open. */}
      <button
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-[#fbfcfb] px-3 text-left text-xs font-medium text-[#465a4e] outline-none transition focus:ring-2 focus:ring-[#648c72]/15 ${
          isOpen ? "border-[#648c72] ring-2 ring-[#648c72]/15" : "border-[#dbe3dd]"
        }`}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={(event) => {
          // Down opens the menu at the next choice; stop at the last choice.
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu(Math.min(options.length - 1, Math.max(0, options.indexOf(value)) + 1));
          // Up opens the menu at the previous choice; stop at the first choice.
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(Math.max(0, options.indexOf(value) - 1));
          }
        }}
        ref={buttonRef}
        type="button"
      >
        {/* For example: "Status: All" or "Match: Strong". */}
        <span className="truncate">
          {prefix}: {value}
        </span>
        <svg
          aria-hidden="true"
          className={`shrink-0 text-[#65756c] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          height="14"
          viewBox="0 0 24 24"
          width="14"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {/* Show the choices only when the dropdown is open. */}
      {isOpen && (
        // Keep the menu short enough to fit in the available screen space.
        <div
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-[60] mt-1.5 w-full overflow-y-auto overscroll-contain rounded-xl border border-[#d8e3db] bg-white p-1.5 shadow-[0_12px_30px_rgba(38,59,48,0.14)]"
          id={listboxId}
          role="listbox"
          style={{ maxHeight: maxMenuHeight }}
        >
          {/* Create one button for each choice in options. */}
          {options.map((option, index) => {
            // The current choice gets a different color and a check mark.
            const isSelected = option === value;
            // Clicking a choice saves it and closes the dropdown.
            return (
              <button
                aria-selected={isSelected}
                className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs outline-none transition-colors ${
                  isSelected
                    ? "bg-[#e5f0e8] font-semibold text-[#3f654d]"
                    : "font-medium text-[#465a4e] hover:bg-[#f1f6f2] focus:bg-[#f1f6f2]"
                }`}
                key={option}
                onClick={() => selectOption(option)}
                onKeyDown={handleOptionKeyDown}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                tabIndex={activeIndex === index ? 0 : -1}
                type="button"
              >
                <span>{option}</span>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    className="shrink-0 text-[#4f725c]"
                    fill="none"
                    height="15"
                    viewBox="0 0 24 24"
                    width="15"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Show the clicked application's details; onClose hides this panel.
// The panel sits on the right on desktop and fills the screen on mobile.
function DetailsPanel({ application, onClose }: { application: Application; onClose: () => void }) {
  return (
    <aside
      aria-label={`${application.company} application details`}
      className="details-panel fixed inset-0 z-30 w-full overflow-y-auto bg-white md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:border-l md:border-[#dce5de] md:shadow-[-16px_0_40px_rgba(38,59,48,0.12)]"
    >
      {/* Top of the panel: company and position, plus a Close button. */}
      <div className="details-header sticky top-0 z-10 flex items-start justify-between border-b border-[#e3e9e4] bg-white/95 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="min-w-0 pr-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4f725c]">
            Application details
          </p>
          <h2 className="font-heading break-words text-[22px] font-semibold tracking-[-0.03em] md:truncate">
            {application.company}
          </h2>
          <p className="mt-0.5 text-sm text-[#5f6f66]">{application.position}</p>
        </div>
        {/* Clicking Close calls onClose and returns to the application list. */}
        <button
          aria-label="Close details panel"
          autoFocus
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe6e1] text-[#65756c] transition hover:bg-[#f2f6f3] hover:text-[#263b30] focus:outline-none focus:ring-2 focus:ring-[#648c72]/30"
          onClick={onClose}
          type="button"
        >
          {icons.close}
        </button>
      </div>

      <div className="px-4 py-5 md:px-6">
        {/* Show the application's status and position match at a glance. */}
        <div className="mb-6 flex flex-wrap gap-2">
          <StatusBadge status={application.status} />
          <MatchBadge match={application.positionMatch} />
        </div>

        {/* Show the saved ratings and dates for this application. */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 border-b border-[#e8ede9] pb-6 sm:grid-cols-2">
          <Detail label="Company fit">
            <MatchBadge match={application.companyFit} />
          </Detail>
          <Detail label="Position match">
            <MatchBadge match={application.positionMatch} />
          </Detail>
          <Detail label="Date applied">
            {application.dateApplied ? formatDate(application.dateApplied) : "Unavailable"}
          </Detail>
          {/* Show the follow-up date and timing label, or explain why there is no date to show. */}
          <Detail label="Follow-up date">
            {isValidFollowUpDate(application.followUpDate) ? (
              <span>
                {formatDate(application.followUpDate)}
                <FollowUpUrgency
                  application={application}
                  as="small"
                  className="mt-1 block font-semibold"
                />
              </span>
            ) : (
              application.followUpDate ? "Invalid date" : "Not scheduled"
            )}
          </Detail>
          <Detail label="Last updated">
            {application.lastUpdated ? formatDate(application.lastUpdated) : "Unavailable"}
          </Detail>
          <Detail label="Status">
            <span className="font-semibold">{application.status}</span>
          </Detail>
        </div>

        {/* Show the next planned step saved for this application. */}
        <div className="border-b border-[#e8ede9] py-6">
          <p className="detail-label">Next action</p>
          <div className="mt-2 rounded-xl border border-[#dce8df] bg-[#f1f6f2] p-4 text-sm font-medium leading-6 text-[#3c5646]">
            {application.nextAction}
          </div>
        </div>

        {/* Show any extra information saved in Notes. */}
        <div className="border-b border-[#e8ede9] py-6">
          <p className="detail-label">Notes</p>
          <p className="mt-2 text-sm leading-6 text-[#52635a]">{application.notes}</p>
        </div>

        {/* Open the company site or job posting in a new browser tab. */}
        <div className="py-6">
          <p className="detail-label">Links</p>
          <div className="mt-3 grid gap-2">
            {application.website && (
              <a
                className="external-link"
                href={application.website}
                rel="noreferrer"
                target="_blank"
              >
                <span>Company website</span>
                {icons.external}
              </a>
            )}
            {application.jobPosting && (
              <a
                className="external-link"
                href={application.jobPosting}
                rel="noreferrer"
                target="_blank"
              >
                <span>View job posting</span>
                {icons.external}
              </a>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// Show one detail in the panel: its name (label) above its value (children).
// Reusing this keeps fields like Date applied and Status looking the same.
function Detail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <p className="detail-label">{label}</p>
      <div className="mt-1.5 text-sm text-[#405448]">{children}</div>
    </div>
  );
}

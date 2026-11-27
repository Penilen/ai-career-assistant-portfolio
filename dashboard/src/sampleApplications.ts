import type { Application } from "./application.ts";

// Converts a Date to local YYYY-MM-DD text, such as "2026-11-12".
function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Makes a sample date relative to today: negative days are in the past.
// Using noon helps avoid date shifts when the local clock changes.
function relativeDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

// Fictional records shared by the dashboard and local API.
// Dates use offsets from today so the sample follow-ups stay useful over time.
export const sampleApplications: Application[] = [
  {
    id: 1,
    company: "Northstar Labs",
    position: "Senior Product Designer",
    status: "Interview",
    companyFit: "Strong",
    positionMatch: "Strong",
    dateApplied: relativeDate(-18),
    followUpDate: relativeDate(0),
    lastUpdated: relativeDate(-1),
    nextAction: "Prepare portfolio walkthrough for the design panel.",
    notes:
      "Strong mission alignment. The team is especially interested in systems thinking and B2B product experience.",
    website: "https://example.com/northstar",
    jobPosting: "https://example.com/jobs/northstar-product-designer",
  },
  {
    id: 2,
    company: "Cedar & Co.",
    position: "UX Researcher",
    status: "Applied",
    companyFit: "Strong",
    positionMatch: "Good",
    dateApplied: relativeDate(-12),
    followUpDate: relativeDate(-2),
    lastUpdated: relativeDate(-7),
    nextAction: "Send a concise follow-up to the hiring manager.",
    notes:
      "Application referred by a former colleague. Role includes a mix of discovery and evaluative research.",
    website: "https://example.com/cedar",
    jobPosting: "https://example.com/jobs/cedar-ux-researcher",
  },
  {
    id: 3,
    company: "Orbit Financial",
    position: "Product Designer",
    status: "Applied",
    companyFit: "Good",
    positionMatch: "Strong",
    dateApplied: relativeDate(-6),
    followUpDate: relativeDate(2),
    lastUpdated: relativeDate(-6),
    nextAction: "Check for an update and connect with the design lead.",
    notes: "The product is compelling; team structure and design maturity are still unclear.",
    website: "https://example.com/orbit",
    jobPosting: "https://example.com/jobs/orbit-product-designer",
  },
  {
    id: 4,
    company: "Kindred Health",
    position: "Lead Experience Designer",
    status: "Interview",
    companyFit: "Strong",
    positionMatch: "Strong",
    dateApplied: relativeDate(-24),
    followUpDate: relativeDate(5),
    lastUpdated: relativeDate(-2),
    nextAction: "Complete the take-home exercise and send it by Friday.",
    notes:
      "Excellent conversation with the recruiter. The role has meaningful ownership and direct access to customers.",
    website: "https://example.com/kindred",
    jobPosting: "https://example.com/jobs/kindred-lead-designer",
  },
  {
    id: 5,
    company: "Morrow Studio",
    position: "Design Systems Manager",
    status: "Applied",
    companyFit: "Good",
    positionMatch: "Potential",
    dateApplied: relativeDate(-9),
    followUpDate: relativeDate(7),
    lastUpdated: relativeDate(-5),
    nextAction: "Follow up with the talent partner.",
    notes:
      "Small but established product team. The role would own the next phase of their multi-brand design system.",
    website: "https://example.com/morrow",
    jobPosting: "https://example.com/jobs/morrow-design-systems",
  },
  {
    id: 6,
    company: "Wildflower Market",
    position: "Staff Product Designer",
    status: "Withdrawn",
    companyFit: "Strong",
    positionMatch: "Not assessed",
    dateApplied: relativeDate(-3),
    followUpDate: null,
    lastUpdated: relativeDate(-3),
    nextAction: "Archive the application after withdrawing from the process.",
    notes:
      "The role was promising, but the expected travel schedule was not a fit for the current search.",
    website: "https://example.com/wildflower",
    jobPosting: "https://example.com/jobs/wildflower-staff-designer",
  },
  {
    id: 7,
    company: "Relay Cloud",
    position: "Principal UX Designer",
    status: "Offer",
    companyFit: "Good",
    positionMatch: "Strong",
    dateApplied: relativeDate(-31),
    followUpDate: relativeDate(1),
    lastUpdated: relativeDate(0),
    nextAction: "Review offer details and prepare questions for the team.",
    notes:
      "Offer received. Benefits are strong; clarify remote-work expectations and growth path before deciding.",
    website: "https://example.com/relay",
    jobPosting: "https://example.com/jobs/relay-principal-ux",
  },
  {
    id: 8,
    company: "Paperplane AI",
    position: "Product Design Lead",
    status: "Rejected",
    companyFit: "Good",
    positionMatch: "Good",
    dateApplied: relativeDate(-28),
    followUpDate: relativeDate(-4),
    lastUpdated: relativeDate(-3),
    nextAction: "Archive the application and keep the connection warm.",
    notes:
      "The team chose a candidate with deeper developer-tools experience. Positive feedback on craft and communication.",
    website: "https://example.com/paperplane",
    jobPosting: "https://example.com/jobs/paperplane-design-lead",
  },
  {
    id: 9,
    company: "Juniper Works",
    position: "Service Designer",
    status: "No response",
    companyFit: "Low",
    positionMatch: "Low",
    dateApplied: relativeDate(-14),
    followUpDate: null,
    lastUpdated: relativeDate(-8),
    nextAction: "Archive after deciding to stop actively tracking the application.",
    notes:
      "No reply after the application and follow-up. Manually marked as no response and closed.",
    website: "https://example.com/juniper",
    jobPosting: "https://example.com/jobs/juniper-service-designer",
  },
];

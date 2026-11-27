// Domain types describe the allowed values and shape of one job application.
export const statuses = ["Applied", "Interview", "Offer", "Rejected", "No response", "Withdrawn"] as const;
export type Status = (typeof statuses)[number];
export const matches = ["Strong", "Good", "Potential", "Low", "Not assessed"] as const;
export type Match = (typeof matches)[number];

export type Application = {
  id: number;
  company: string;
  position: string;
  status: Status;
  companyFit: Match;
  positionMatch: Match;
  dateApplied: string;
  followUpDate: string | null;
  lastUpdated: string;
  nextAction: string;
  notes: string;
  website: string;
  jobPosting: string;
};

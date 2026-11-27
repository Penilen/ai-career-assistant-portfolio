import { createApplicationsServer } from "../../server/applicationsApi.ts";
import { sampleApplications } from "../../src/sampleApplications.ts";

// Pass the sample list to the same HTTP server the app uses.
createApplicationsServer(async () => ({
  applications: sampleApplications,
  skippedRows: { total: 0, missingCompany: 0, missingPosition: 0, invalidStatus: 0 },
})).listen(3001, "127.0.0.1");

import { createApplicationsServer } from "./applicationsApi.ts";
import { loadSheetApplications } from "./googleSheets.ts";

// This address keeps the API accessible only from this computer.
const host = "127.0.0.1";
const port = 3001;

// Read the spreadsheet ID from the server environment when a request arrives.
const server = createApplicationsServer(() =>
  loadSheetApplications(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
);
// Start listening and print the API address when the server is ready.
server.listen(port, host, () => {
  console.log(`Applications API listening at http://${host}:${port}/api/applications`);
});

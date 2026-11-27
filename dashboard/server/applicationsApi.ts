import { createServer } from "node:http";
import type { Application } from "../src/application.ts";
import { skippedApplicationRowsHeader, type SkippedApplicationRows } from "../src/skippedApplicationRows.ts";
import { SheetsConfigurationError } from "./googleSheets.ts";

// Build the server. The caller chooses when and where it starts listening.
// The caller provides the function that loads the applications.
export function createApplicationsServer(
  loadApplications: () => Promise<{ applications: Application[]; skippedRows?: SkippedApplicationRows }>,
) {
  return createServer(async (request, response) => {
    // Read the path without the query string.
    const path = request.url?.split("?", 1)[0];

    // Tell the client that the response body is JSON.
    response.setHeader("Content-Type", "application/json; charset=utf-8");

    // Return 404 when the requested path has no endpoint.
    if (path !== "/api/applications") {
      response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
      return;
    }

    // Return 405 for other methods and tell the client that GET is allowed.
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Ask the browser and intermediaries to avoid caching spreadsheet data.
    response.setHeader("Cache-Control", "no-store");
    try {
      // Wait for the applications before sending the JSON response.
      const { applications, skippedRows } = await loadApplications();
      // Keep the JSON body compatible and send only aggregate counts in the header.
      if (skippedRows) response.setHeader(skippedApplicationRowsHeader, JSON.stringify(skippedRows));
      response.writeHead(200).end(JSON.stringify(applications));
    } catch (error) {
      // Keep Google errors and request details out of the response and logs.
      // Use 503 for a setup problem and 502 when loading from Sheets fails.
      const missingConfiguration = error instanceof SheetsConfigurationError;
      response.writeHead(missingConfiguration ? 503 : 502).end(JSON.stringify({
        error: missingConfiguration ? "Applications source is not configured" : "Could not load applications",
      }));
    }
  });
}

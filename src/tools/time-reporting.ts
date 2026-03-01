import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const timeReportingTools: WintTool[] = [
  {
    name: "time_report_list",
    description: "List time reports with optional filtering by date range, person, or project.",
    schema: {
      StartDate: z.string().optional().describe("Start date (ISO 8601, e.g. 2025-12-01)"),
      EndDate: z.string().optional().describe("End date (ISO 8601, e.g. 2026-02-28)"),
      EmployeeId: z.number().optional().describe("Filter by employee ID (integer)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/TimeReport/Filter", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "time_report_create",
    description: "Create/merge time report entries. Provide timeReport object with ProjectId, Date, Hours, Description, PersonId.",
    schema: {
      timeReport: z.record(z.string(), z.any()).describe("Time report object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/TimeReport/MergeTimeReport", args.timeReport);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "time_project_list",
    description: "List time reporting projects. Returns project name, manager, status, and budget info.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/TimeReportingProject/Report");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "time_project_get",
    description: "Get full details of a specific time reporting project by ID.",
    schema: {
      id: z.string().describe("Project ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/TimeReportingProject/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

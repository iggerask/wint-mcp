import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function timeReportingTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_time_reporting",
    summary: "Time reports and projects: report_list, report_create, project_list, project_get.",
    modes: [
      {
        name: "report_list",
        description:
          "List time reports. Optional filters → {StartDate, EndDate (ISO 8601), EmployeeId (integer)}.",
        handler: async (args) => wintClient.get("/api/TimeReport/Filter", args.filters ?? {}),
      },
      {
        name: "report_create",
        description:
          "Create/merge time report entries. Required: data → {EmployeeId, Projects: [...], Weeks: [...]}. Complex nested structure — fetch an existing time report first via mode=report_list to see the expected format.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/TimeReport/MergeTimeReport", args.data),
      },
      {
        name: "project_list",
        description: "List time reporting projects. No params. Returns name, manager, status, budget.",
        handler: async () => wintClient.get("/api/TimeReportingProject/Report"),
      },
      {
        name: "project_get",
        description: "Get a single time reporting project. Required: id (GUID).",
        required: ["id"],
        handler: async (args) =>
          wintClient.get(`/api/TimeReportingProject/${sanitizePathParam(args.id)}`),
      },
    ],
    includePagination: false,
  });
  return tool ? [tool] : [];
}

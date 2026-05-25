import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function companyTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_company",
    summary:
      "Companies, employees, and global search: get, list, select, global_search, employee_list, employee_get, search_persons.",
    modes: [
      {
        name: "get",
        description: "Get company details by id (integer). Required: id.",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Company/${sanitizePathParam(args.id)}`),
      },
      {
        name: "list",
        description: "List all companies accessible to the authenticated user. No params.",
        handler: async () => wintClient.get("/api/Company"),
      },
      {
        name: "select",
        description:
          "Switch to a specific company; all subsequent API calls operate in that company's context. Required: companyId (integer).",
        required: ["companyId"],
        handler: async (args) => wintClient.post("/api/Company/Selected", { CompanyId: args.companyId }),
      },
      {
        name: "global_search",
        description:
          "Search across all Wint modules (invoices, incoming invoices, receipts, customers, suppliers, persons, articles). Required: SearchStr (string).",
        required: ["SearchStr"],
        handler: async (args) => wintClient.get("/api/Search", { SearchStr: args.SearchStr }),
      },
      {
        name: "employee_list",
        description: "List employees in the current company. Pagination supported.",
        handler: async (args) => wintClient.get("/api/Employees", mergeListParams(args)),
      },
      {
        name: "employee_get",
        description: "Get employee details by id. Required: id (integer).",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Employees/${sanitizePathParam(args.id)}`),
      },
      {
        name: "search_persons",
        description: "Search persons (employees/contacts) within the current company. Optional: SearchStr.",
        handler: async (args) =>
          wintClient.get("/api/Company/SearchPersons", args.SearchStr ? { SearchStr: args.SearchStr } : {}),
      },
    ],
    extraSchema: {
      companyId: z.number().optional().describe("For mode=select: company ID to switch to."),
      SearchStr: z.string().optional().describe("For mode=global_search or search_persons: search string."),
    },
  });
  return tool ? [tool] : [];
}

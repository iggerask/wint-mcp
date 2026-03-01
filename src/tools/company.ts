import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const companyTools: WintTool[] = [
  {
    name: "company_get",
    description: "Get details of a specific company by ID, including org number, address, and settings.",
    schema: {
      id: z.string().describe("Company ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Company/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "company_list",
    description: "List all companies accessible to the authenticated user.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/Company");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "company_select",
    description: "Select/switch to a specific company. All subsequent API calls will be in the context of this company.",
    schema: {
      companyId: z.string().describe("Company ID (GUID) to switch to"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Company/Selected", { CompanyId: args.companyId });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "company_search_persons",
    description: "Search for persons (employees/contacts) within the current company.",
    schema: {
      searchText: z.string().optional().describe("Search term (name, email, etc.)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Company/SearchPersons", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function customerTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_customer",
    summary: "Manage customers (invoicing counterparties): list, get, create, update, search.",
    modes: [
      {
        name: "list",
        description: "List customers with pagination. Returns name, org number, contact info, status.",
        handler: async (args) => wintClient.get("/api/Customer", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single customer by id (integer).",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Customer/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create a customer. Required: data → {Name, Type ('Company'|'Private'), BillingAddress: {Street1, ZipCode, City, CountryCode}}. Optional: OrgNumber, EmailAddress, PhoneNumber, PaymentTerms, Language.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Customer", args.data),
      },
      {
        name: "update",
        description: "Update a customer. Required: id, data (full customer object).",
        required: ["id", "data"],
        handler: async (args) => wintClient.put(`/api/Customer/${sanitizePathParam(args.id)}`, args.data),
      },
      {
        name: "search",
        description:
          "Search customers. Required: query (string). Optional: searchType ('name'|'orgNr'|'general', default 'general').",
        required: ["query"],
        handler: async (args) => {
          const searchType = args.searchType ?? "general";
          if (searchType === "name") {
            return wintClient.get("/api/Customer/SearchByName", { searchString: args.query });
          }
          if (searchType === "orgNr") {
            return wintClient.get("/api/Customer/SearchByOrgNr", { searchString: args.query });
          }
          return wintClient.get("/api/Customer/Search", { SearchName: args.query });
        },
      },
    ],
    extraSchema: {
      query: z.string().optional().describe("For mode=search: search term."),
      searchType: z
        .enum(["name", "orgNr", "general"])
        .optional()
        .describe("For mode=search: search type (default 'general')."),
    },
  });
  return tool ? [tool] : [];
}

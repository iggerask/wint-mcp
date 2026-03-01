import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const customerTools: WintTool[] = [
  {
    name: "customer_list",
    description: "List all customers with pagination. Returns customer name, org number, contact info, and status.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Customer", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "customer_get",
    description: "Get full details of a specific customer by ID.",
    schema: {
      id: z.number().describe("Customer ID"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Customer/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "customer_create",
    description: "Create a new customer. Provide a customer object with Name, OrgNo, Email, Phone, Address, PostalCode, City, Country, PaymentTerms, DefaultDeliveryMethod.",
    schema: {
      customer: z.record(z.string(), z.any()).describe("Customer object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Customer", args.customer);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "customer_update",
    description: "Update an existing customer. Provide the full customer object with all fields.",
    schema: {
      id: z.number().describe("Customer ID"),
      customer: z.record(z.string(), z.any()).describe("Updated customer object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(`/api/Customer/${sanitizePathParam(args.id)}`, args.customer);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "customer_search",
    description: "Search for customers by name, org number, or general search term.",
    schema: {
      query: z.string().describe("Search term (name, org nr, etc.)"),
      searchType: z.enum(["name", "orgNr", "general"]).optional().describe("Search type (default: general)"),
    },
    handler: async (args) => {
      try {
        const searchType = args.searchType ?? "general";
        let result;
        if (searchType === "name") {
          result = await wintClient.get("/api/Customer/SearchByName", { name: args.query });
        } else if (searchType === "orgNr") {
          result = await wintClient.get("/api/Customer/SearchByOrgNr", { orgNr: args.query });
        } else {
          result = await wintClient.get("/api/Customer/Search", { searchText: args.query });
        }
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

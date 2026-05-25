import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { ENDPOINT_INDEX } from "../generated/endpoint-index.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { validateApiPath } from "../security.js";

// Extract the bracketed group names from the endpoint index, e.g. [Account], [Invoice], etc.
const GROUP_NAMES = Array.from(ENDPOINT_INDEX.matchAll(/\[([A-Za-z0-9_]+)\]/g)).map((m) => m[1]);

export const fallbackTool: WintTool = {
  name: "wint_api_call",
  description: `Generic escape hatch — call any Wint/Superkoll API endpoint directly. Use this only when no curated domain tool (wint_invoice, wint_receipt, wint_salary, etc.) covers your need.

Required: method (GET|POST|PUT|DELETE|PATCH), path (must start with /api/, e.g. /api/Invoice/List). Optional: params (query), body (JSON for POST/PUT/PATCH).

Available endpoint groups: ${GROUP_NAMES.join(", ")}.

To see specific endpoints in a group, call wint_endpoint_lookup with that group name first.`,
  schema: {
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).describe("HTTP method"),
    path: z.string().describe("API path, e.g. /api/Invoice/List"),
    params: z.record(z.string(), z.any()).optional().describe("Query parameters (key-value pairs)"),
    body: z.record(z.string(), z.any()).optional().describe("JSON request body (for POST/PUT/PATCH)"),
  },
  handler: async (args) => {
    try {
      const safePath = validateApiPath(args.path);
      const result = await wintClient.request(args.method, safePath, {
        params: args.params,
        data: args.body,
      });
      return formatResult(result);
    } catch (error) {
      return formatError(error);
    }
  },
};

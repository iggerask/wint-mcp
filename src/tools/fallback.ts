import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { ENDPOINT_INDEX } from "../generated/endpoint-index.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { validateApiPath } from "../security.js";

export const fallbackTool: WintTool = {
  name: "wint_api_call",
  description: `Call any Wint/Superkoll API endpoint directly. Use this for any endpoint not covered by the curated tools.

Provide the HTTP method, path (e.g. /api/Invoice/List), and optionally query params and/or JSON body.

FULL ENDPOINT INDEX:
${ENDPOINT_INDEX}`,
  schema: {
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).describe("HTTP method"),
    path: z.string().describe("API path, e.g. /api/Invoice/List"),
    params: z.record(z.string(), z.any()).optional().describe("Query parameters (key-value pairs)"),
    body: z.record(z.string(), z.any()).optional().describe("JSON request body (for POST/PUT/PATCH)"),
  },
  handler: async (args) => {
    try {
      const safePath = validateApiPath(args.path);
      const result = await wintClient.request(
        args.method,
        safePath,
        {
          params: args.params,
          data: args.body,
        }
      );
      return formatResult(result);
    } catch (error) {
      return formatError(error);
    }
  },
};

import { z } from "zod";
import { sanitizeErrorForOutput } from "../security.js";

export type ZodShape = Record<string, z.ZodTypeAny>;

export interface WintTool {
  name: string;
  description: string;
  schema: ZodShape;
  handler: (args: Record<string, any>) => Promise<any>;
}

// Shared pagination params used by most list endpoints
export const paginationSchema = {
  Page: z.number().optional().describe("Page number (1-based)"),
  NumPerPage: z.number().optional().describe("Results per page"),
  OrderByProperty: z.string().optional().describe("Property name to sort by"),
  OrderByDescending: z.boolean().optional().describe("Sort descending"),
} satisfies ZodShape;

export function formatError(error: any): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const sanitized = sanitizeErrorForOutput(error);
  return {
    content: [{ type: "text", text: JSON.stringify(sanitized, null, 2) }],
    isError: true,
  };
}

export function formatResult(data: any): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

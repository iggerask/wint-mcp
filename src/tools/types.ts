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

/**
 * Merge the top-level pagination fields with the user-supplied `filters` object.
 * Pagination wins on conflict (since it's the documented top-level surface).
 * Used by list-mode handlers to assemble GET query params.
 */
export function mergeListParams(args: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...(args.filters ?? {}) };
  if (args.Page !== undefined) out.Page = args.Page;
  if (args.NumPerPage !== undefined) out.NumPerPage = args.NumPerPage;
  if (args.OrderByProperty !== undefined) out.OrderByProperty = args.OrderByProperty;
  if (args.OrderByDescending !== undefined) out.OrderByDescending = args.OrderByDescending;
  return out;
}

// --- Domain tool factory ---

export type ModeDef = {
  /** Mode value (the string the agent supplies as `mode`) */
  name: string;
  /** One-line description shown in the parent tool description. List required/optional keys here. */
  description: string;
  /** Top-level keys the handler requires; if any is missing the call errors before any HTTP call. */
  required?: string[];
  /** Receives the full args object. Return raw data; the framework wraps it via formatResult. */
  handler: (args: any) => Promise<any>;
};

export interface DomainToolConfig {
  name: string;
  /** 1-line headline shown at the top of the tool description. */
  summary: string;
  modes: ModeDef[];
  /** Additional top-level schema keys (e.g. version, account, yearMonth). Use sparingly. */
  extraSchema?: ZodShape;
  /** Include the standard pagination keys (Page, NumPerPage, ...). Default: true. */
  includePagination?: boolean;
}

function readToolModes(toolName: string): string[] | null {
  const raw = process.env.WINT_TOOL_MODES;
  if (!raw) return null;
  // Format: "wint_invoice:list,get,pdf;wint_voucher:list,get"
  const entries = raw.split(";").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx < 0) continue;
    const name = entry.slice(0, colonIdx).trim();
    const modeList = entry.slice(colonIdx + 1).trim();
    if (name === toolName) {
      return modeList.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return null;
}

/**
 * Build a single mode-dispatched WintTool from a list of mode definitions.
 *
 * Returns null if WINT_TOOL_MODES filters out every mode for this tool — registry drops nulls.
 *
 * Standard schema: { mode, id?, filters?, data?, options? } + pagination + per-tool extras.
 * Handler validates each mode's required keys, dispatches, and wraps the result via formatResult.
 */
export function defineDomainTool(cfg: DomainToolConfig): WintTool | null {
  const allowedFromEnv = readToolModes(cfg.name);
  const modes = allowedFromEnv
    ? cfg.modes.filter((m) => allowedFromEnv.includes(m.name))
    : cfg.modes;

  if (modes.length === 0) return null;

  const modeNames = modes.map((m) => m.name) as [string, ...string[]];
  const modeIndex = new Map(modes.map((m) => [m.name, m]));

  const modeDocs = modes.map((m) => `- ${m.name}: ${m.description}`).join("\n");

  const description = `${cfg.summary}

Modes:
${modeDocs}

If your operation isn't listed, call wint_endpoint_lookup for the endpoint schema and then wint_api_call to invoke it.`;

  const schema: ZodShape = {
    mode: z.enum(modeNames).describe(`Operation to perform. One of: ${modeNames.join(", ")}.`),
    id: z
      .union([z.number(), z.string()])
      .optional()
      .describe("Resource ID. Required for modes that target a single resource (get, update, delete, action modes)."),
    filters: z
      .record(z.string(), z.any())
      .optional()
      .describe("Filter/query object for list-like modes. See mode-specific docs in the description for keys."),
    data: z
      .record(z.string(), z.any())
      .optional()
      .describe("Body object for create/update modes. See mode-specific docs in the description."),
    options: z
      .record(z.string(), z.any())
      .optional()
      .describe("Options object for action modes (send, sign, send_reminder, etc.). Mode-specific."),
    ...(cfg.includePagination !== false ? paginationSchema : {}),
    ...(cfg.extraSchema ?? {}),
  };

  return {
    name: cfg.name,
    description,
    schema,
    handler: async (args) => {
      try {
        const def = modeIndex.get(args.mode);
        if (!def) {
          return formatError(
            new Error(`Unknown mode '${args.mode}' for ${cfg.name}. Allowed: ${modeNames.join(", ")}.`),
          );
        }
        for (const key of def.required ?? []) {
          const value = args[key];
          if (value === undefined || value === null) {
            return formatError(new Error(`mode='${args.mode}' requires parameter '${key}'`));
          }
        }
        const result = await def.handler(args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  };
}

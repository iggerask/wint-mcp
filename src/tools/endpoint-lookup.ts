import { z } from "zod";
import { ENDPOINT_INDEX } from "../generated/endpoint-index.js";
import { WintTool, formatResult, formatError } from "./types.js";

const ALL_GROUPS = Array.from(ENDPOINT_INDEX.matchAll(/\[([A-Za-z0-9_]+)\]/g)).map((m) => m[1]);

/**
 * Slice the endpoint index by group name. Returns the lines from `[group]` up to the next `[`.
 */
function getGroupSection(group: string): string | null {
  const startMarker = `[${group}]`;
  const startIdx = ENDPOINT_INDEX.indexOf(startMarker);
  if (startIdx === -1) return null;
  const nextBracketIdx = ENDPOINT_INDEX.indexOf("\n[", startIdx + startMarker.length);
  const end = nextBracketIdx === -1 ? ENDPOINT_INDEX.length : nextBracketIdx;
  return ENDPOINT_INDEX.slice(startIdx, end).trim();
}

export const endpointLookupTool: WintTool = {
  name: "wint_endpoint_lookup",
  description:
    "Look up Wint API endpoints by resource group. Returns the list of paths and descriptions under that group. Use this before wint_api_call when you need to find a specific endpoint that isn't covered by a curated domain tool.",
  schema: {
    group: z
      .string()
      .describe(
        `Resource group name (case-sensitive). One of: ${ALL_GROUPS.slice(0, 50).join(", ")}${ALL_GROUPS.length > 50 ? ", ..." : ""}.`,
      ),
  },
  handler: async (args) => {
    try {
      const section = getGroupSection(args.group);
      if (section === null) {
        return formatError(
          new Error(
            `Unknown endpoint group '${args.group}'. Available groups: ${ALL_GROUPS.join(", ")}`,
          ),
        );
      }
      return formatResult({ group: args.group, endpoints: section });
    } catch (error) {
      return formatError(error);
    }
  },
};

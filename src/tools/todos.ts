import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const todoTools: WintTool[] = [
  {
    name: "todo_summary",
    description:
      "Get a count-based summary of all pending todos by type. Best starting point for 'what needs attention' — shows counts for invoices, receipts, incoming invoices, salary, etc. without listing individual items.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/Todo/TodoSummary");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "todo_list",
    description: "List all pending todos/tasks across all modules (invoices, receipts, incoming invoices, etc.). Shows what needs attention.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/Todo");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "todo_snooze",
    description: "Snooze a todo item to hide it temporarily.",
    schema: {
      id: z.string().describe("Todo ID (integer or GUID depending on todo type)"),
    },
    handler: async (args) => {
      try {
        const safeId = sanitizePathParam(args.id);
        const path = `/api/Todo/Snooze/${safeId}`;
        const result = await wintClient.post(path);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

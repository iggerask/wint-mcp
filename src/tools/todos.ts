import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function todoTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_todo",
    summary:
      "Todos/tasks across all modules (invoices, receipts, incoming invoices, salary, etc.). Best starting point for 'what needs attention'.",
    modes: [
      {
        name: "summary",
        description: "Count-based summary of pending todos by type. No params.",
        handler: async () => wintClient.get("/api/Todo/TodoSummary"),
      },
      {
        name: "list",
        description: "List all pending todos across modules. No params.",
        handler: async () => wintClient.get("/api/Todo"),
      },
      {
        name: "snooze",
        description: "Snooze a todo item to hide it temporarily. Required: id (integer or GUID).",
        required: ["id"],
        handler: async (args) => wintClient.post(`/api/Todo/Snooze/${sanitizePathParam(args.id)}`),
      },
    ],
    includePagination: false,
  });
  return tool ? [tool] : [];
}

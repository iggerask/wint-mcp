import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function invoicingTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_invoice",
    summary:
      "Manage customer invoices: list, get, create, update, delete, send, send_reminder, pdf. Pick an operation via the mode parameter.",
    modes: [
      {
        name: "list",
        description:
          "List/filter invoices. filters → {Statuses?: number[] (0=NotSent, 1=Unpaid, 2=OverdueReminderSent, 3=OverdueReminderNotSent, 4=Paid, 5=Cancelled, 6=DebtCollection), CustomerIds?: number[], InvoiceDateFrom?, InvoiceDateTo?, DueDateFrom?, DueDateTo? (ISO 8601), MinTotalAmount?, MaxTotalAmount?, SerialNumberSearchText?}. Pagination supported (top-level Page/NumPerPage/OrderByProperty/OrderByDescending).",
        handler: async (args) => wintClient.get("/api/Invoice/List", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single invoice. Required: id (integer).",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Invoice/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create an invoice (draft). Required: data → {CustomerId, DueDate (ISO 8601), Currency (e.g. 'SEK'), Language ('SV'|'EN'), Rows: [{ArticleId?, Description, Quantity, UnitPrice, Vat}, ...]}. Optional in data: ContactPerson, CustomerReference {ReferenceId, ReferenceName}, Notes, DeliveryDate.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Invoice", args.data),
      },
      {
        name: "update",
        description: "Update a draft invoice. Required: id, data (full invoice object with all fields).",
        required: ["id", "data"],
        handler: async (args) => wintClient.put(`/api/Invoice/${sanitizePathParam(args.id)}`, args.data),
      },
      {
        name: "delete",
        description: "Delete a draft invoice. Required: id.",
        required: ["id"],
        handler: async (args) => wintClient.delete(`/api/Invoice/${sanitizePathParam(args.id)}`),
      },
      {
        name: "send",
        description:
          "Send/finalize an invoice (Draft → Sent; assigns a serial number). Required: id, options → {InvoiceSendMethod: 'Email'|'Print'|'MarkAsSent', MailOptions?: {...}}.",
        required: ["id", "options"],
        handler: async (args) =>
          wintClient.post(`/api/Invoice/Send/${sanitizePathParam(args.id)}`, args.options),
      },
      {
        name: "send_reminder",
        description:
          "Send a payment reminder for an overdue invoice. Required: id, options → {ReminderDueDate (ISO 8601), ReminderCost?: number, ReminderMessage?: string}.",
        required: ["id", "options"],
        handler: async (args) =>
          wintClient.post(`/api/Invoice/SendPaymentReminder/${sanitizePathParam(args.id)}`, args.options),
      },
      {
        name: "pdf",
        description:
          "Get invoice PDF data (returns {FileName, Data, ContentType}). Required: id. Optional: version (0=latest, default; 1=original).",
        required: ["id"],
        handler: async (args) => {
          const version = args.version ?? 0;
          return wintClient.get(
            `/api/Invoice/${sanitizePathParam(args.id)}/pdf/${sanitizePathParam(version)}`,
          );
        },
      },
    ],
    extraSchema: {
      version: z.number().optional().describe("For mode=pdf: PDF version (0=latest, 1=original). Default 0."),
    },
  });
  return tool ? [tool] : [];
}

import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const incomingInvoiceTools: WintTool[] = [
  {
    name: "incoming_invoice_list",
    description: "List incoming (supplier) invoices with filtering and pagination. Returns invoices pending approval, certified, paid, etc.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/IncomingInvoice", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_get",
    description: "Get full details of a specific incoming invoice by ID, including line items, supplier info, approval status, and attachments.",
    schema: {
      id: z.string().describe("Incoming invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/IncomingInvoice/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_update",
    description: "Update an incoming invoice (e.g. change account coding, amounts, descriptions).",
    schema: {
      id: z.string().describe("Incoming invoice ID (GUID)"),
      invoice: z.record(z.string(), z.any()).describe("Updated incoming invoice object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(`/api/IncomingInvoice/${sanitizePathParam(args.id)}`, args.invoice);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_sign",
    description: "Sign/approve an incoming invoice (first approval step). The invoice must be in a state that allows signing.",
    schema: {
      id: z.string().describe("Incoming invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/IncomingInvoice/Sign/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_certify",
    description: "Certify an incoming invoice (final approval step). Moves the invoice to payment queue.",
    schema: {
      id: z.string().describe("Incoming invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/IncomingInvoice/Certify/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_cancel",
    description: "Cancel an incoming invoice. Removes it from the approval flow.",
    schema: {
      id: z.string().describe("Incoming invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/IncomingInvoice/Cancel/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

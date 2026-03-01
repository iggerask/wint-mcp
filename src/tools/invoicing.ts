import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const invoicingTools: WintTool[] = [
  {
    name: "invoice_list",
    description: "List customer invoices with filtering and pagination. Returns invoices with status, amounts, dates, and customer info.",
    schema: {
      Statuses: z.array(z.string()).optional().describe("Filter by statuses: Draft, Sent, Paid, PartiallyPaid, Overdue, CreditInvoice, Cancelled"),
      CustomerId: z.number().optional().describe("Filter by customer ID"),
      InvoiceDateFrom: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      InvoiceDateTo: z.string().optional().describe("End date (YYYY-MM-DD)"),
      DueDateFrom: z.string().optional().describe("Due date from (YYYY-MM-DD)"),
      DueDateTo: z.string().optional().describe("Due date to (YYYY-MM-DD)"),
      MinTotalAmount: z.number().optional().describe("Minimum total amount"),
      MaxTotalAmount: z.number().optional().describe("Maximum total amount"),
      SerialNumberSearchText: z.string().optional().describe("Search by serial number text"),
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Invoice/List", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_get",
    description: "Get full details of a specific customer invoice by ID, including line items, customer info, and payment status.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Invoice/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_create",
    description: "Create a new customer invoice. Provide the invoice object with CustomerId, InvoiceDate, DueDate, Rows (array of {ArticleId, Description, Quantity, UnitPrice, Vat}), OurReference, YourReference, Currency. Returns the created invoice as a draft.",
    schema: {
      invoice: z.record(z.string(), z.any()).describe("Full invoice object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Invoice", args.invoice);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_update",
    description: "Update an existing draft invoice. Provide the full invoice object with all fields.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
      invoice: z.record(z.string(), z.any()).describe("Updated invoice object with all fields"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(`/api/Invoice/${sanitizePathParam(args.id)}`, args.invoice);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_delete",
    description: "Delete a draft invoice by ID.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.delete(`/api/Invoice/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_send",
    description: "Send/finalize an invoice (transitions from Draft to Sent). This assigns a serial number and makes the invoice official.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/Invoice/Send/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_send_reminder",
    description: "Send a payment reminder for an overdue invoice.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/Invoice/SendPaymentReminder/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "invoice_pdf",
    description: "Get the PDF download URL for an invoice. Version 0 = latest, 1 = original.",
    schema: {
      id: z.string().describe("Invoice ID (GUID)"),
      version: z.number().optional().describe("PDF version: 0 = latest, 1 = original (default 0)"),
    },
    handler: async (args) => {
      try {
        const version = args.version ?? 0;
        const result = await wintClient.get(`/api/Invoice/${sanitizePathParam(args.id)}/pdf/${sanitizePathParam(version)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

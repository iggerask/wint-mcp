import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const incomingInvoiceTools: WintTool[] = [
  {
    name: "incoming_invoice_list",
    description:
      "List incoming (supplier) invoices with filtering, date ranges, and pagination. Returns invoices pending approval, certified, paid, etc.",
    schema: {
      ...paginationSchema,
      InvoiceDateFrom: z.string().optional().describe("Include invoices dated on or after this date (ISO 8601, e.g. 2025-12-01)"),
      InvoiceDateTo: z.string().optional().describe("Include invoices dated on or before this date (ISO 8601, e.g. 2026-02-28)"),
      DueDateFrom: z.string().optional().describe("Include invoices due on or after this date"),
      DueDateTo: z.string().optional().describe("Include invoices due on or before this date"),
      PaymentDateFrom: z.string().optional().describe("Include invoices with payment date on or after this date"),
      PaymentDateTo: z.string().optional().describe("Include invoices with payment date on or before this date"),
      States: z.array(z.number()).optional().describe("Filter by states (array of state numbers). Empty = all states"),
      SupplierId: z.number().optional().describe("Filter by supplier ID"),
      OnlyMine: z.boolean().optional().describe("Only return invoices owned by the current user"),
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
    name: "incoming_invoice_create",
    description:
      "Create a new incoming (supplier) invoice manually. Provide invoice data including TotalAmount, Tax, supplier payment details (BGNumber, PGNumber, or IBAN), OrgNr, and optionally Attachments.",
    schema: {
      invoice: z.record(z.string(), z.any()).describe("Incoming invoice object with TotalAmount, Tax, BGNumber/PGNumber/IBAN, OrgNr, etc."),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/IncomingInvoice", args.invoice);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_send_to_person",
    description:
      "Route an incoming invoice to a specific person for review or approval. Used to delegate invoice handling.",
    schema: {
      id: z.number().describe("Incoming invoice ID (integer)"),
      action: z.record(z.string(), z.any()).describe("Send-to-person action object (e.g. {PersonId: 123})"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(
          `/api/IncomingInvoice/SendToPerson/${sanitizePathParam(args.id)}`,
          args.action,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_supplier_list",
    description:
      "List known suppliers for incoming invoices. Returns supplier name, invoice count, amounts, and whether they have automation rules. Supports filtering and pagination.",
    schema: {
      ...paginationSchema,
      Name: z.string().optional().describe("Filter by supplier name"),
      HasRules: z.boolean().optional().describe("Filter suppliers that have automation rules"),
      HasUnpaidInvoices: z.boolean().optional().describe("Filter suppliers with unpaid invoices"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/IncomingInvoice/Suppliers", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_supplier_get",
    description: "Get details of a specific incoming invoice supplier by ID.",
    schema: {
      supplierId: z.number().describe("Supplier ID (integer)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(
          `/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.supplierId)}`,
        );
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

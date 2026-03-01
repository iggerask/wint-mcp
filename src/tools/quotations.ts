import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const quotationTools: WintTool[] = [
  {
    name: "quotation_list",
    description: "List quotations/quotes with pagination. Returns quotation status, customer, amounts, and dates.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Quotation", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "quotation_get",
    description: "Get full details of a specific quotation by ID, including line items and customer info.",
    schema: {
      id: z.number().describe("Quotation ID (integer)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Quotation/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "quotation_create",
    description: "Create a new quotation. Provide quotation object with CustomerId, Rows (array of {ArticleId, Description, Quantity, UnitPrice, Vat}), ValidUntilDate, OurReference, YourReference.",
    schema: {
      quotation: z.record(z.string(), z.any()).describe("Quotation object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Quotation", args.quotation);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "quotation_update",
    description: "Update an existing quotation.",
    schema: {
      id: z.number().describe("Quotation serial number (integer)"),
      quotation: z.record(z.string(), z.any()).describe("Updated quotation object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(`/api/Quotation/edit/${sanitizePathParam(args.id)}`, args.quotation);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "quotation_send",
    description: "Send a quotation to the customer via email. Provide mailOptions with QuotationId, To, Cc, Bcc, Subject, Body, AttachPdf.",
    schema: {
      mailOptions: z.record(z.string(), z.any()).describe("Mail options object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Quotation/mail", args.mailOptions);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

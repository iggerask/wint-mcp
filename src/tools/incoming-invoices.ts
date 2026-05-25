import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function incomingInvoiceTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_incoming_invoice",
    summary:
      "Incoming (supplier) invoices and suppliers: list, get, create, update, sign, certify, cancel, send_to_person, supplier_list, supplier_get.",
    modes: [
      {
        name: "list",
        description:
          "List incoming invoices. filters → {InvoiceDateFrom?, InvoiceDateTo?, DueDateFrom?, DueDateTo?, PaymentDateFrom?, PaymentDateTo? (ISO 8601), States?: number[], SupplierId?, OnlyMine?}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/IncomingInvoice", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single incoming invoice. Required: id.",
        required: ["id"],
        handler: async (args) =>
          wintClient.get(`/api/IncomingInvoice/${sanitizePathParam(args.id)}`),
      },
      {
        name: "update",
        description: "Update an incoming invoice (e.g. account coding, amounts). Required: id, data.",
        required: ["id", "data"],
        handler: async (args) =>
          wintClient.put(`/api/IncomingInvoice/${sanitizePathParam(args.id)}`, args.data),
      },
      {
        name: "create",
        description:
          "Create an incoming invoice manually. Required: data → {TotalAmount, Tax, BGNumber|PGNumber|IBAN, OrgNr, ...}. Optional: Attachments.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/IncomingInvoice", args.data),
      },
      {
        name: "sign",
        description: "Sign/approve an incoming invoice (first approval step). Required: id.",
        required: ["id"],
        handler: async (args) =>
          wintClient.post(`/api/IncomingInvoice/Sign/${sanitizePathParam(args.id)}`),
      },
      {
        name: "certify",
        description:
          "Certify an incoming invoice (final approval step; moves to payment queue). Required: id.",
        required: ["id"],
        handler: async (args) =>
          wintClient.post(`/api/IncomingInvoice/Certify/${sanitizePathParam(args.id)}`),
      },
      {
        name: "cancel",
        description: "Cancel an incoming invoice. Required: id.",
        required: ["id"],
        handler: async (args) =>
          wintClient.post(`/api/IncomingInvoice/Cancel/${sanitizePathParam(args.id)}`),
      },
      {
        name: "send_to_person",
        description:
          "Route an incoming invoice to a specific person for review or approval. Required: id, options → {PersonId: number, ...}.",
        required: ["id", "options"],
        handler: async (args) =>
          wintClient.post(
            `/api/IncomingInvoice/SendToPerson/${sanitizePathParam(args.id)}`,
            args.options,
          ),
      },
      {
        name: "supplier_list",
        description:
          "List incoming invoice suppliers. filters → {Name?, HasRules?, HasUnpaidInvoices?}. Pagination supported.",
        handler: async (args) =>
          wintClient.get("/api/IncomingInvoice/Suppliers", mergeListParams(args)),
      },
      {
        name: "supplier_get",
        description: "Get an incoming invoice supplier by id. Required: id (supplier ID).",
        required: ["id"],
        handler: async (args) =>
          wintClient.get(`/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.id)}`),
      },
    ],
  });
  return tool ? [tool] : [];
}

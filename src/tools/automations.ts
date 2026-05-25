import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function automationTools(): WintTool[] {
  const customerRuleTool = defineDomainTool({
    name: "wint_customer_automation_rule",
    summary: "Company-level customer automation rules (e.g. auto-routing incoming invoices to a person).",
    modes: [
      {
        name: "list",
        description: "List customer automation rules. No params.",
        handler: async () => wintClient.get("/api/AutomationRule"),
      },
    ],
    includePagination: false,
  });

  const supplierRuleTool = defineDomainTool({
    name: "wint_supplier_rule",
    summary:
      "Automatic approval rules for incoming invoices, per supplier. Modes: list, get, create, update.",
    modes: [
      {
        name: "list",
        description: "List supplier auto-approval rules. Required: supplierId (integer).",
        required: ["supplierId"],
        handler: async (args) =>
          wintClient.get(
            `/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.supplierId)}/Rule`,
          ),
      },
      {
        name: "get",
        description: "Get a specific supplier auto-approval rule. Required: supplierId, id (rule ID).",
        required: ["supplierId", "id"],
        handler: async (args) =>
          wintClient.get(
            `/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.supplierId)}/Rule/${sanitizePathParam(args.id)}`,
          ),
      },
      {
        name: "create",
        description:
          "Create an auto-approval rule. Required: data → rule object with supplier and approval criteria (e.g. max amount, account number).",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/IncomingInvoice/Suppliers/Rule", args.data),
      },
      {
        name: "update",
        description: "Update an auto-approval rule. Required: id (rule ID), data (updated rule object).",
        required: ["id", "data"],
        handler: async (args) =>
          wintClient.put(
            `/api/IncomingInvoice/Suppliers/Rule/${sanitizePathParam(args.id)}`,
            args.data,
          ),
      },
    ],
    includePagination: false,
    extraSchema: {
      supplierId: z.number().optional().describe("Supplier ID (required for list and get)."),
    },
  });

  const wintcardRuleTool = defineDomainTool({
    name: "wint_wintcard_rule",
    summary:
      "WintCard automation rules — auto-classify card receipts (account, supplier name, description). Modes: get, create, update, delete, activate, deactivate.",
    modes: [
      {
        name: "get",
        description: "Get a WintCard rule by id (GUID). Required: id.",
        required: ["id"],
        handler: async (args) =>
          wintClient.get(`/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create a WintCard rule. Required: data → rule object with merchant matching and classification (account, VAT, description).",
        required: ["data"],
        handler: async (args) =>
          wintClient.post("/api/ReceiptAutomationRule/WintCardRule", args.data),
      },
      {
        name: "update",
        description: "Update a WintCard rule. Required: id (GUID), data.",
        required: ["id", "data"],
        handler: async (args) =>
          wintClient.put(
            `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`,
            args.data,
          ),
      },
      {
        name: "delete",
        description: "Delete a WintCard rule. Required: id (GUID).",
        required: ["id"],
        handler: async (args) =>
          wintClient.delete(
            `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`,
          ),
      },
      {
        name: "activate",
        description: "Activate a WintCard rule. Required: id (GUID).",
        required: ["id"],
        handler: async (args) =>
          wintClient.put(
            `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}/Activate`,
          ),
      },
      {
        name: "deactivate",
        description: "Deactivate a WintCard rule (keeps it but stops it from matching). Required: id (GUID).",
        required: ["id"],
        handler: async (args) =>
          wintClient.put(
            `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}/Deactivate`,
          ),
      },
    ],
    includePagination: false,
  });

  return [customerRuleTool, supplierRuleTool, wintcardRuleTool].filter(
    (t): t is WintTool => t !== null,
  );
}

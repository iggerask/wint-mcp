import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const automationTools: WintTool[] = [
  // --- Customer automation rules ---
  {
    name: "automation_rule_list",
    description:
      "List customer automation rules. These are company-level rules that automate document handling (e.g. auto-routing incoming invoices to a person).",
    schema: {},
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/AutomationRule", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },

  // --- Incoming invoice supplier auto-approval rules ---
  {
    name: "incoming_invoice_supplier_rule_list",
    description:
      "List automatic approval rules for a specific incoming invoice supplier. These rules auto-approve invoices matching certain criteria (amount, account, etc.).",
    schema: {
      supplierId: z.string().describe("Supplier ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(
          `/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.supplierId)}/Rule`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_supplier_rule_get",
    description: "Get a specific automatic approval rule for an incoming invoice supplier.",
    schema: {
      supplierId: z.string().describe("Supplier ID (GUID)"),
      ruleId: z.string().describe("Rule ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(
          `/api/IncomingInvoice/Suppliers/${sanitizePathParam(args.supplierId)}/Rule/${sanitizePathParam(args.ruleId)}`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_supplier_rule_create",
    description:
      "Create an automatic approval rule for incoming invoices from a supplier. The rule defines criteria (e.g. max amount, account number) under which invoices are auto-approved.",
    schema: {
      rule: z
        .record(z.string(), z.any())
        .describe("Rule object with supplier and approval criteria"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/IncomingInvoice/Suppliers/Rule", args.rule);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "incoming_invoice_supplier_rule_update",
    description: "Update an existing automatic approval rule for incoming invoices.",
    schema: {
      ruleId: z.string().describe("Rule ID (GUID)"),
      rule: z.record(z.string(), z.any()).describe("Updated rule object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(
          `/api/IncomingInvoice/Suppliers/Rule/${sanitizePathParam(args.ruleId)}`,
          args.rule,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },

  // --- WintCard receipt automation rules ---
  {
    name: "wintcard_rule_get",
    description:
      "Get a WintCard automation rule by ID. WintCard rules auto-classify card receipts (set account, supplier name, description, etc.).",
    schema: {
      id: z.string().describe("WintCard rule ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(
          `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "wintcard_rule_create",
    description:
      "Create a new WintCard automation rule. Defines how card transactions from a specific merchant are auto-classified (account, VAT, description, etc.).",
    schema: {
      rule: z
        .record(z.string(), z.any())
        .describe("WintCard rule object with merchant matching and classification data"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(
          "/api/ReceiptAutomationRule/WintCardRule",
          args.rule,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "wintcard_rule_update",
    description: "Update an existing WintCard automation rule.",
    schema: {
      id: z.string().describe("WintCard rule ID (GUID)"),
      rule: z.record(z.string(), z.any()).describe("Updated WintCard rule object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(
          `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`,
          args.rule,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "wintcard_rule_delete",
    description: "Delete a WintCard automation rule.",
    schema: {
      id: z.string().describe("WintCard rule ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.delete(
          `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "wintcard_rule_activate",
    description: "Activate a WintCard automation rule.",
    schema: {
      id: z.string().describe("WintCard rule ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(
          `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}/Activate`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "wintcard_rule_deactivate",
    description: "Deactivate a WintCard automation rule (keeps the rule but stops it from matching).",
    schema: {
      id: z.string().describe("WintCard rule ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(
          `/api/ReceiptAutomationRule/WintCardRule/${sanitizePathParam(args.id)}/Deactivate`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

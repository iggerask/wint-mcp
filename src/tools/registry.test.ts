import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAllTools, MODULE_NAMES } from "./registry.js";

vi.mock("../auth/client.js", () => ({
  wintClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

describe("getAllTools", () => {
  const originalModules = process.env.WINT_MODULES;
  const originalToolModes = process.env.WINT_TOOL_MODES;

  afterEach(() => {
    if (originalModules === undefined) delete process.env.WINT_MODULES;
    else process.env.WINT_MODULES = originalModules;
    if (originalToolModes === undefined) delete process.env.WINT_TOOL_MODES;
    else process.env.WINT_TOOL_MODES = originalToolModes;
  });

  describe("without WINT_MODULES (default)", () => {
    beforeEach(() => {
      delete process.env.WINT_MODULES;
      delete process.env.WINT_TOOL_MODES;
    });

    it("returns 18 tools (16 domain + endpoint_lookup + fallback)", () => {
      const tools = getAllTools();
      expect(tools.length).toBe(18);
    });

    it("has no duplicate tool names", () => {
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("all tool names match wint_<name> snake_case", () => {
      const tools = getAllTools();
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });

    it("all tools have a description", () => {
      const tools = getAllTools();
      for (const tool of tools) {
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it("all tools have a handler function", () => {
      const tools = getAllTools();
      for (const tool of tools) {
        expect(typeof tool.handler).toBe("function");
      }
    });

    it("all tools have a schema object", () => {
      const tools = getAllTools();
      for (const tool of tools) {
        expect(typeof tool.schema).toBe("object");
      }
    });

    it("includes wint_api_call", () => {
      const tools = getAllTools();
      const fallback = tools.find((t) => t.name === "wint_api_call");
      expect(fallback).toBeDefined();
    });

    it("includes wint_endpoint_lookup", () => {
      const tools = getAllTools();
      const lookup = tools.find((t) => t.name === "wint_endpoint_lookup");
      expect(lookup).toBeDefined();
    });

    it("includes all expected domain tools", () => {
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      const expected = [
        "wint_invoice",
        "wint_incoming_invoice",
        "wint_customer",
        "wint_receipt",
        "wint_quotation",
        "wint_chart_of_accounts",
        "wint_voucher",
        "wint_financial_report",
        "wint_salary",
        "wint_time_reporting",
        "wint_company",
        "wint_todo",
        "wint_article",
        "wint_customer_automation_rule",
        "wint_supplier_rule",
        "wint_wintcard_rule",
      ];
      for (const name of expected) {
        expect(names).toContain(name);
      }
    });
  });

  describe("with WINT_MODULES set", () => {
    beforeEach(() => {
      delete process.env.WINT_TOOL_MODES;
    });

    it("loads only the specified module plus endpoint_lookup + fallback", () => {
      process.env.WINT_MODULES = "receipts";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_receipt");
      expect(names).toContain("wint_api_call");
      expect(names).toContain("wint_endpoint_lookup");
      expect(names).not.toContain("wint_invoice");
      expect(names).not.toContain("wint_customer");
    });

    it("loads multiple modules", () => {
      process.env.WINT_MODULES = "receipts,invoicing";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_receipt");
      expect(names).toContain("wint_invoice");
      expect(names).toContain("wint_api_call");
    });

    it("silently ignores unknown module names", () => {
      process.env.WINT_MODULES = "receipts,nonexistent";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_receipt");
      expect(names).toContain("wint_api_call");
    });

    it("trims whitespace around module names", () => {
      process.env.WINT_MODULES = " receipts , invoicing ";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_receipt");
      expect(names).toContain("wint_invoice");
    });

    it("loads accounting module = 3 tools (split)", () => {
      process.env.WINT_MODULES = "accounting";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_chart_of_accounts");
      expect(names).toContain("wint_voucher");
      expect(names).toContain("wint_financial_report");
    });

    it("loads automations module = 3 tools (split)", () => {
      process.env.WINT_MODULES = "automations";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_customer_automation_rule");
      expect(names).toContain("wint_supplier_rule");
      expect(names).toContain("wint_wintcard_rule");
    });

    it("always includes endpoint_lookup + fallback even when no modules match", () => {
      process.env.WINT_MODULES = "nonexistent";
      const tools = getAllTools();
      expect(tools.length).toBe(2);
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_endpoint_lookup");
      expect(names).toContain("wint_api_call");
    });
  });

  describe("with WINT_TOOL_MODES set", () => {
    beforeEach(() => {
      delete process.env.WINT_MODULES;
    });

    it("filters modes within a tool (description lists only allowed modes)", () => {
      process.env.WINT_TOOL_MODES = "wint_invoice:list,get";
      const tools = getAllTools();
      const invoice = tools.find((t) => t.name === "wint_invoice");
      expect(invoice).toBeDefined();
      expect(invoice!.description).toContain("- list:");
      expect(invoice!.description).toContain("- get:");
      expect(invoice!.description).not.toContain("- create:");
      expect(invoice!.description).not.toContain("- send:");
    });

    it("rejects calls to filtered-out modes at handler level", async () => {
      process.env.WINT_TOOL_MODES = "wint_invoice:list,get";
      const tools = getAllTools();
      const invoice = tools.find((t) => t.name === "wint_invoice")!;
      const result = await invoice.handler({ mode: "send", id: 1, options: {} });
      // Since 'send' isn't in the filtered enum, the handler either treats it as
      // unknown mode or returns an error.
      expect(result.isError).toBe(true);
    });

    it("drops a tool entirely if no modes remain", () => {
      process.env.WINT_TOOL_MODES = "wint_invoice:nonexistent_mode";
      const tools = getAllTools();
      const invoice = tools.find((t) => t.name === "wint_invoice");
      expect(invoice).toBeUndefined();
    });

    it("filters multiple tools independently", () => {
      process.env.WINT_TOOL_MODES = "wint_invoice:list;wint_voucher:get";
      const tools = getAllTools();
      const invoice = tools.find((t) => t.name === "wint_invoice");
      const voucher = tools.find((t) => t.name === "wint_voucher");
      expect(invoice).toBeDefined();
      expect(voucher).toBeDefined();
      expect(invoice!.description).toContain("- list:");
      expect(invoice!.description).not.toContain("- get:");
      expect(voucher!.description).toContain("- get:");
      expect(voucher!.description).not.toContain("- list:");
    });

    it("trims whitespace around tool names and modes", () => {
      process.env.WINT_TOOL_MODES = " wint_invoice : list , get ; wint_voucher : list ";
      const tools = getAllTools();
      const invoice = tools.find((t) => t.name === "wint_invoice");
      expect(invoice).toBeDefined();
      expect(invoice!.description).toContain("- list:");
      expect(invoice!.description).toContain("- get:");
    });
  });

  describe("MODULE_NAMES", () => {
    it("exports all module keys", () => {
      expect(MODULE_NAMES).toContain("invoicing");
      expect(MODULE_NAMES).toContain("incoming-invoices");
      expect(MODULE_NAMES).toContain("customers");
      expect(MODULE_NAMES).toContain("receipts");
      expect(MODULE_NAMES).toContain("quotations");
      expect(MODULE_NAMES).toContain("accounting");
      expect(MODULE_NAMES).toContain("salary");
      expect(MODULE_NAMES).toContain("time-reporting");
      expect(MODULE_NAMES).toContain("company");
      expect(MODULE_NAMES).toContain("todos");
      expect(MODULE_NAMES).toContain("articles");
      expect(MODULE_NAMES).toContain("automations");
      expect(MODULE_NAMES).toHaveLength(12);
    });
  });
});

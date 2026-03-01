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
  const originalEnv = process.env.WINT_MODULES;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WINT_MODULES;
    } else {
      process.env.WINT_MODULES = originalEnv;
    }
  });

  describe("without WINT_MODULES (default)", () => {
    beforeEach(() => {
      delete process.env.WINT_MODULES;
    });

    const tools = getAllTools();

    it("returns the expected number of tools", () => {
      expect(tools.length).toBeGreaterThanOrEqual(40);
    });

    it("has no duplicate tool names", () => {
      const names = tools.map((t) => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("all tool names are snake_case", () => {
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });

    it("all tools have a description", () => {
      for (const tool of tools) {
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it("all tools have a handler function", () => {
      for (const tool of tools) {
        expect(typeof tool.handler).toBe("function");
      }
    });

    it("all tools have a schema object", () => {
      for (const tool of tools) {
        expect(typeof tool.schema).toBe("object");
      }
    });

    it("includes the fallback tool (wint_api_call)", () => {
      const fallback = tools.find((t) => t.name === "wint_api_call");
      expect(fallback).toBeDefined();
    });
  });

  describe("with WINT_MODULES set", () => {
    it("loads only the specified module plus fallback", () => {
      process.env.WINT_MODULES = "receipts";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names.length).toBeGreaterThan(1);
      expect(names).toContain("wint_api_call");
      // Should not include tools from other modules
      expect(names).not.toContain("invoice_list");
      expect(names).not.toContain("customer_list");
      expect(names).toContain("receipt_list");
    });

    it("loads multiple modules", () => {
      process.env.WINT_MODULES = "receipts,invoicing";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_api_call");
      expect(names.length).toBeGreaterThan(2);
    });

    it("silently ignores unknown module names", () => {
      process.env.WINT_MODULES = "receipts,nonexistent";
      const tools = getAllTools();
      const onlyReceipts = process.env.WINT_MODULES = "receipts";
      process.env.WINT_MODULES = onlyReceipts;
      const expected = getAllTools();
      expect(tools.length).toBe(expected.length);
    });

    it("trims whitespace around module names", () => {
      process.env.WINT_MODULES = " receipts , invoicing ";
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("wint_api_call");
      expect(names.length).toBeGreaterThan(2);
    });

    it("always includes fallback even with empty valid modules", () => {
      process.env.WINT_MODULES = "nonexistent";
      const tools = getAllTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe("wint_api_call");
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

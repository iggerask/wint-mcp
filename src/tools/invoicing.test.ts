import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoicingTools } from "./invoicing.js";

vi.mock("../auth/client.js", () => ({
  wintClient: {
    get: vi.fn().mockResolvedValue({ Id: "abc-123" }),
    post: vi.fn().mockResolvedValue({ Id: "abc-123" }),
    put: vi.fn().mockResolvedValue({ Id: "abc-123" }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

import { wintClient } from "../auth/client.js";

const mockGet = vi.mocked(wintClient.get);
const mockPost = vi.mocked(wintClient.post);
const mockPut = vi.mocked(wintClient.put);
const mockDelete = vi.mocked(wintClient.delete);

function getTool() {
  const tool = invoicingTools().find((t) => t.name === "wint_invoice");
  if (!tool) throw new Error("wint_invoice tool not found");
  return tool;
}

describe("wint_invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mode=list", () => {
    it("calls GET /api/Invoice/List with merged filters + pagination", async () => {
      const tool = getTool();
      await tool.handler({ mode: "list", filters: { Statuses: [1, 2] }, Page: 1, NumPerPage: 50 });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/List", {
        Statuses: [1, 2],
        Page: 1,
        NumPerPage: 50,
      });
    });

    it("omits absent pagination keys", async () => {
      const tool = getTool();
      await tool.handler({ mode: "list", filters: { Statuses: [1] } });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/List", { Statuses: [1] });
    });
  });

  describe("mode=get", () => {
    it("constructs URL with sanitized ID", async () => {
      const tool = getTool();
      await tool.handler({ mode: "get", id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123");
    });

    it("rejects path traversal in id", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "get", id: "../etc/passwd" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("returns error if id missing", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "get" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires parameter 'id'");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("mode=create", () => {
    it("POSTs the data body", async () => {
      const tool = getTool();
      await tool.handler({ mode: "create", data: { CustomerId: 1, Rows: [] } });
      expect(mockPost).toHaveBeenCalledWith("/api/Invoice", { CustomerId: 1, Rows: [] });
    });

    it("returns error if data missing", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "create" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires parameter 'data'");
    });
  });

  describe("mode=update", () => {
    it("PUTs with sanitized id and data body", async () => {
      const tool = getTool();
      await tool.handler({ mode: "update", id: "abc-123", data: { Name: "Test" } });
      expect(mockPut).toHaveBeenCalledWith("/api/Invoice/abc-123", { Name: "Test" });
    });
  });

  describe("mode=delete", () => {
    it("DELETEs with sanitized id", async () => {
      const tool = getTool();
      await tool.handler({ mode: "delete", id: "abc-123" });
      expect(mockDelete).toHaveBeenCalledWith("/api/Invoice/abc-123");
    });
  });

  describe("mode=send", () => {
    it("POSTs send options", async () => {
      const tool = getTool();
      const options = { InvoiceSendMethod: "MarkAsSent" };
      await tool.handler({ mode: "send", id: "abc-123", options });
      expect(mockPost).toHaveBeenCalledWith("/api/Invoice/Send/abc-123", options);
    });

    it("returns error if options missing", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "send", id: "abc-123" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("requires parameter 'options'");
    });
  });

  describe("mode=send_reminder", () => {
    it("POSTs reminder options", async () => {
      const tool = getTool();
      const options = { ReminderDueDate: "2026-04-01" };
      await tool.handler({ mode: "send_reminder", id: "abc-123", options });
      expect(mockPost).toHaveBeenCalledWith("/api/Invoice/SendPaymentReminder/abc-123", options);
    });
  });

  describe("mode=pdf", () => {
    it("includes version in URL", async () => {
      const tool = getTool();
      await tool.handler({ mode: "pdf", id: "abc-123", version: 1 });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123/pdf/1");
    });

    it("defaults version to 0", async () => {
      const tool = getTool();
      await tool.handler({ mode: "pdf", id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123/pdf/0");
    });
  });

  describe("error handling", () => {
    it("returns formatError on API failure", async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404, data: { Message: "Not found" } },
      });
      const tool = getTool();
      const result = await tool.handler({ mode: "get", id: "abc-123" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });

  describe("description", () => {
    it("lists all modes in description", () => {
      const tool = getTool();
      for (const mode of ["list", "get", "create", "update", "delete", "send", "send_reminder", "pdf"]) {
        expect(tool.description).toContain(`- ${mode}:`);
      }
    });
  });
});

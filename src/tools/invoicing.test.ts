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

function findTool(name: string) {
  const tool = invoicingTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("invoicing tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invoice_list", () => {
    it("calls GET /api/Invoice/List with params", async () => {
      const tool = findTool("invoice_list");
      await tool.handler({ Page: 1, Statuses: ["Draft"] });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/List", {
        Page: 1,
        Statuses: ["Draft"],
      });
    });
  });

  describe("invoice_get", () => {
    it("constructs correct URL with sanitized ID", async () => {
      const tool = findTool("invoice_get");
      await tool.handler({ id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123");
    });

    it("rejects path traversal in id", async () => {
      const tool = findTool("invoice_get");
      const result = await tool.handler({ id: "../etc/passwd" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("invoice_update", () => {
    it("calls PUT with sanitized ID", async () => {
      const tool = findTool("invoice_update");
      await tool.handler({ id: "abc-123", invoice: { Name: "Test" } });
      expect(mockPut).toHaveBeenCalledWith("/api/Invoice/abc-123", { Name: "Test" });
    });
  });

  describe("invoice_delete", () => {
    it("calls DELETE with sanitized ID", async () => {
      const tool = findTool("invoice_delete");
      await tool.handler({ id: "abc-123" });
      expect(mockDelete).toHaveBeenCalledWith("/api/Invoice/abc-123");
    });
  });

  describe("invoice_send", () => {
    it("calls POST /api/Invoice/Send/{id}", async () => {
      const tool = findTool("invoice_send");
      await tool.handler({ id: "abc-123" });
      expect(mockPost).toHaveBeenCalledWith("/api/Invoice/Send/abc-123");
    });
  });

  describe("invoice_pdf", () => {
    it("includes version in URL", async () => {
      const tool = findTool("invoice_pdf");
      await tool.handler({ id: "abc-123", version: 1 });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123/pdf/1");
    });

    it("defaults version to 0", async () => {
      const tool = findTool("invoice_pdf");
      await tool.handler({ id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Invoice/abc-123/pdf/0");
    });
  });

  describe("error handling", () => {
    it("returns formatError on API failure", async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404, data: { Message: "Not found" } },
      });
      const tool = findTool("invoice_get");
      const result = await tool.handler({ id: "abc-123" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });
});

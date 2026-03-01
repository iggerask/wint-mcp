import { describe, it, expect, vi, beforeEach } from "vitest";
import { receiptTools } from "./receipts.js";

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

function findTool(name: string) {
  const tool = receiptTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("receipt tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ Id: "abc-123" });
    mockPost.mockResolvedValue({ Id: "abc-123" });
    mockPut.mockResolvedValue({ Id: "abc-123" });
  });

  describe("receipt_list", () => {
    it("calls GET /api/Receipt with params", async () => {
      const tool = findTool("receipt_list");
      await tool.handler({ Page: 1 });
      expect(mockGet).toHaveBeenCalledWith("/api/Receipt", { Page: 1 });
    });

    it("description documents receipt states", () => {
      const tool = findTool("receipt_list");
      expect(tool.description).toContain("0 = Draft");
      expect(tool.description).toContain("10 = ClassifiedWintCard");
    });
  });

  describe("receipt_get", () => {
    it("constructs correct URL with sanitized ID", async () => {
      const tool = findTool("receipt_get");
      await tool.handler({ id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Receipt/abc-123");
    });

    it("rejects path traversal in id", async () => {
      const tool = findTool("receipt_get");
      const result = await tool.handler({ id: "../etc/passwd" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("description documents receipt states", () => {
      const tool = findTool("receipt_get");
      expect(tool.description).toContain("0 = Draft");
    });
  });

  describe("receipt_update", () => {
    it("calls PUT with sanitized ID", async () => {
      const tool = findTool("receipt_update");
      await tool.handler({ id: "abc-123", receipt: { Id: "abc-123", Amount: 100 } });
      expect(mockPut).toHaveBeenCalledWith("/api/Receipt/abc-123", { Id: "abc-123", Amount: 100 });
    });

    it("description documents required fields", () => {
      const tool = findTool("receipt_update");
      expect(tool.description).toContain("full receipt object must be provided");
      expect(tool.description).toContain("Id, DateTime, Amount, Currency, PaymentMethodId");
    });
  });

  describe("receipt_sign", () => {
    it("calls POST /api/Receipt/Sign/{id}", async () => {
      const tool = findTool("receipt_sign");
      await tool.handler({ id: "abc-123" });
      expect(mockPost).toHaveBeenCalledWith("/api/Receipt/Sign/abc-123");
    });
  });

  describe("file_upload", () => {
    it("calls POST /api/File with correct body", async () => {
      const tool = findTool("file_upload");
      await tool.handler({
        data: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(mockPost).toHaveBeenCalledWith("/api/File", {
        Data: "aGVsbG8=",
        ContentType: "image/png",
        FileName: "test.png",
      });
    });

    it("returns formatError on API failure", async () => {
      mockPost.mockRejectedValueOnce({
        response: { status: 400, data: { Message: "Bad file" } },
      });
      const tool = findTool("file_upload");
      const result = await tool.handler({
        data: "bad",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Bad file");
    });
  });

  describe("receipt_upload_image", () => {
    it("uploads file, gets receipt, appends image, and puts receipt back", async () => {
      mockPost.mockResolvedValueOnce({ UploadedFileId: "file-999" });
      mockGet.mockResolvedValueOnce({
        Id: "receipt-123",
        Images: ["file-001"],
        Amount: 100,
      });
      mockPut.mockResolvedValueOnce({ Id: "receipt-123", Images: ["file-001", "file-999"] });

      const tool = findTool("receipt_upload_image");
      const result = await tool.handler({
        receiptId: "receipt-123",
        base64Content: "aGVsbG8=",
        contentType: "image/jpeg",
        fileName: "photo.jpg",
      });

      expect(mockPost).toHaveBeenCalledWith("/api/File", {
        Data: "aGVsbG8=",
        ContentType: "image/jpeg",
        FileName: "photo.jpg",
      });
      expect(mockGet).toHaveBeenCalledWith("/api/Receipt/receipt-123");
      expect(mockPut).toHaveBeenCalledWith("/api/Receipt/receipt-123", {
        Id: "receipt-123",
        Images: ["file-001", "file-999"],
        Amount: 100,
      });
      expect(result.isError).toBeUndefined();
    });

    it("handles receipt with no existing Images array", async () => {
      mockPost.mockResolvedValueOnce({ UploadedFileId: "file-999" });
      mockGet.mockResolvedValueOnce({ Id: "receipt-123", Amount: 50 });
      mockPut.mockResolvedValueOnce({ Id: "receipt-123", Images: ["file-999"] });

      const tool = findTool("receipt_upload_image");
      await tool.handler({
        receiptId: "receipt-123",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "scan.png",
      });

      expect(mockPut).toHaveBeenCalledWith("/api/Receipt/receipt-123", {
        Id: "receipt-123",
        Amount: 50,
        Images: ["file-999"],
      });
    });

    it("rejects path traversal in receiptId", async () => {
      const tool = findTool("receipt_upload_image");
      const result = await tool.handler({
        receiptId: "../etc/passwd",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns error if file upload fails", async () => {
      mockPost.mockRejectedValueOnce({
        response: { status: 500, data: { Message: "Upload failed" } },
      });
      const tool = findTool("receipt_upload_image");
      const result = await tool.handler({
        receiptId: "receipt-123",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Upload failed");
    });
  });

  describe("error handling", () => {
    it("returns formatError on API failure", async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404, data: { Message: "Not found" } },
      });
      const tool = findTool("receipt_get");
      const result = await tool.handler({ id: "abc-123" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });
});

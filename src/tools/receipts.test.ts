import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

function getTool() {
  const tool = receiptTools().find((t) => t.name === "wint_receipt");
  if (!tool) throw new Error("wint_receipt tool not found");
  return tool;
}

describe("wint_receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ Id: "abc-123" });
    mockPost.mockResolvedValue({ Id: "abc-123" });
    mockPut.mockResolvedValue({ Id: "abc-123" });
  });

  describe("mode=list", () => {
    it("calls GET /api/Receipt with merged filters + pagination", async () => {
      const tool = getTool();
      await tool.handler({ mode: "list", filters: { Currency: "SEK" }, Page: 1 });
      expect(mockGet).toHaveBeenCalledWith("/api/Receipt", { Currency: "SEK", Page: 1 });
    });

    it("description documents receipt states", () => {
      const tool = getTool();
      expect(tool.description).toContain("0=Draft");
      expect(tool.description).toContain("10=ClassifiedWintCard");
    });
  });

  describe("mode=get", () => {
    it("constructs URL with sanitized ID", async () => {
      const tool = getTool();
      await tool.handler({ mode: "get", id: "abc-123" });
      expect(mockGet).toHaveBeenCalledWith("/api/Receipt/abc-123");
    });

    it("rejects path traversal in id", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "get", id: "../etc/passwd" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("mode=update", () => {
    it("PUTs with sanitized ID and data", async () => {
      const tool = getTool();
      await tool.handler({
        mode: "update",
        id: "abc-123",
        data: { Id: "abc-123", Amount: 100 },
      });
      expect(mockPut).toHaveBeenCalledWith("/api/Receipt/abc-123", {
        Id: "abc-123",
        Amount: 100,
      });
    });
  });

  describe("mode=sign", () => {
    it("calls POST /api/Receipt/Sign/{id}", async () => {
      const tool = getTool();
      await tool.handler({ mode: "sign", id: "abc-123" });
      expect(mockPost).toHaveBeenCalledWith("/api/Receipt/Sign/abc-123");
    });
  });

  describe("mode=file_upload (base64Content path)", () => {
    it("calls POST /api/File with the supplied body", async () => {
      const tool = getTool();
      await tool.handler({
        mode: "file_upload",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(mockPost).toHaveBeenCalledWith("/api/File", {
        Data: "aGVsbG8=",
        ContentType: "image/png",
        FileName: "test.png",
      });
    });

    it("errors when base64Content is given without contentType", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        base64Content: "aGVsbG8=",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("contentType is required");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("errors when base64Content is given without fileName", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("fileName is required");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("errors when neither filePath nor base64Content is provided", async () => {
      const tool = getTool();
      const result = await tool.handler({ mode: "file_upload" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("File input required");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns formatError on API failure", async () => {
      mockPost.mockRejectedValueOnce({
        response: { status: 400, data: { Message: "Bad file" } },
      });
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        base64Content: "bad",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Bad file");
    });
  });

  describe("mode=file_upload (filePath path)", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "wint-mcp-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("reads file from disk and base64-encodes it", async () => {
      const filePath = join(tmpDir, "receipt.png");
      writeFileSync(filePath, "hello"); // bytes "hello" → "aGVsbG8="
      const tool = getTool();
      await tool.handler({ mode: "file_upload", filePath });
      expect(mockPost).toHaveBeenCalledWith("/api/File", {
        Data: "aGVsbG8=",
        ContentType: "image/png",
        FileName: "receipt.png",
      });
    });

    it("auto-detects contentType from extension (.pdf → application/pdf)", async () => {
      const filePath = join(tmpDir, "doc.pdf");
      writeFileSync(filePath, "PDFDATA");
      const tool = getTool();
      await tool.handler({ mode: "file_upload", filePath });
      const call = mockPost.mock.calls[0][1];
      expect(call.ContentType).toBe("application/pdf");
      expect(call.FileName).toBe("doc.pdf");
    });

    it("auto-detects contentType from extension (.jpg → image/jpeg)", async () => {
      const filePath = join(tmpDir, "photo.jpg");
      writeFileSync(filePath, "JPEGDATA");
      const tool = getTool();
      await tool.handler({ mode: "file_upload", filePath });
      const call = mockPost.mock.calls[0][1];
      expect(call.ContentType).toBe("image/jpeg");
    });

    it("falls back to application/octet-stream for unknown extensions", async () => {
      const filePath = join(tmpDir, "data.bin");
      writeFileSync(filePath, "stuff");
      const tool = getTool();
      await tool.handler({ mode: "file_upload", filePath });
      const call = mockPost.mock.calls[0][1];
      expect(call.ContentType).toBe("application/octet-stream");
    });

    it("allows overriding contentType and fileName when filePath is given", async () => {
      const filePath = join(tmpDir, "raw.bin");
      writeFileSync(filePath, "hello");
      const tool = getTool();
      await tool.handler({
        mode: "file_upload",
        filePath,
        contentType: "image/png",
        fileName: "custom.png",
      });
      expect(mockPost).toHaveBeenCalledWith("/api/File", {
        Data: "aGVsbG8=",
        ContentType: "image/png",
        FileName: "custom.png",
      });
    });

    it("returns formatError when the file does not exist", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        filePath: join(tmpDir, "does-not-exist.png"),
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/ENOENT|no such file/i);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("rejects relative filePath", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        filePath: "relative/path.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("absolute path");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("rejects bare-filename filePath as non-absolute", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "file_upload",
        filePath: "receipt.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("absolute path");
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe("mode=upload_image", () => {
    it("uploads file, gets receipt, appends attachment, and PUTs receipt back", async () => {
      mockPost.mockResolvedValueOnce({ UploadedFileId: "file-999" });
      mockGet.mockResolvedValueOnce({
        Id: "receipt-123",
        Images: ["file-001"],
        Amount: 100,
      });
      mockPut.mockResolvedValueOnce({ Id: "receipt-123", Images: ["file-001", "file-999"] });

      const tool = getTool();
      const result = await tool.handler({
        mode: "upload_image",
        id: "receipt-123",
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
        Images: ["file-001"],
        Attachments: [{ UploadedFileId: "file-999" }],
        Amount: 100,
      });
      expect(result.isError).toBeUndefined();
    });

    it("handles receipt with no existing Attachments array", async () => {
      mockPost.mockResolvedValueOnce({ UploadedFileId: "file-999" });
      mockGet.mockResolvedValueOnce({ Id: "receipt-123", Amount: 50 });
      mockPut.mockResolvedValueOnce({ Id: "receipt-123", Attachments: [{ UploadedFileId: "file-999" }] });

      const tool = getTool();
      await tool.handler({
        mode: "upload_image",
        id: "receipt-123",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "scan.png",
      });

      expect(mockPut).toHaveBeenCalledWith("/api/Receipt/receipt-123", {
        Id: "receipt-123",
        Amount: 50,
        Attachments: [{ UploadedFileId: "file-999" }],
      });
    });

    it("rejects path traversal in id", async () => {
      const tool = getTool();
      const result = await tool.handler({
        mode: "upload_image",
        id: "../etc/passwd",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid path parameter");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("supports filePath (reads from disk, auto-detects contentType + fileName)", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "wint-mcp-test-"));
      try {
        const filePath = join(tmpDir, "scan.png");
        writeFileSync(filePath, "hello");
        mockPost.mockResolvedValueOnce({ UploadedFileId: "file-555" });
        mockGet.mockResolvedValueOnce({ Id: "receipt-9", Amount: 10 });
        mockPut.mockResolvedValueOnce({});

        const tool = getTool();
        await tool.handler({ mode: "upload_image", id: "receipt-9", filePath });

        expect(mockPost).toHaveBeenCalledWith("/api/File", {
          Data: "aGVsbG8=",
          ContentType: "image/png",
          FileName: "scan.png",
        });
        expect(mockGet).toHaveBeenCalledWith("/api/Receipt/receipt-9");
        expect(mockPut).toHaveBeenCalledWith("/api/Receipt/receipt-9", {
          Id: "receipt-9",
          Amount: 10,
          Attachments: [{ UploadedFileId: "file-555" }],
        });
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("returns error if file upload fails", async () => {
      mockPost.mockRejectedValueOnce({
        response: { status: 500, data: { Message: "Upload failed" } },
      });
      const tool = getTool();
      const result = await tool.handler({
        mode: "upload_image",
        id: "receipt-123",
        base64Content: "aGVsbG8=",
        contentType: "image/png",
        fileName: "test.png",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Upload failed");
    });
  });

  describe("mode=categories", () => {
    it("calls GET /api/ReceiptCategory", async () => {
      const tool = getTool();
      await tool.handler({ mode: "categories" });
      expect(mockGet).toHaveBeenCalledWith("/api/ReceiptCategory");
    });
  });

  describe("mode=payment_methods", () => {
    it("calls GET /api/ReceiptPaymentMethod", async () => {
      const tool = getTool();
      await tool.handler({ mode: "payment_methods" });
      expect(mockGet).toHaveBeenCalledWith("/api/ReceiptPaymentMethod");
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
});

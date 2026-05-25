import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

// --- File input helper ---
// Lets callers pass EITHER a local filesystem path (preferred — the server reads
// and base64-encodes, so the model never has to spend tokens on file content),
// OR a pre-encoded base64 string (for synthesized files that don't exist on disk).

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".pdf": "application/pdf",
};

function guessContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

export interface FileInput {
  filePath?: string;
  base64Content?: string;
  contentType?: string;
  fileName?: string;
}

export async function loadFileInput(
  args: FileInput,
): Promise<{ data: string; contentType: string; fileName: string }> {
  if (args.filePath) {
    const buf = await fs.readFile(args.filePath);
    const data = buf.toString("base64");
    const fileName = args.fileName ?? path.basename(args.filePath);
    const contentType = args.contentType ?? guessContentType(fileName);
    return { data, contentType, fileName };
  }
  if (args.base64Content) {
    if (!args.contentType) throw new Error("contentType is required when using base64Content");
    if (!args.fileName) throw new Error("fileName is required when using base64Content");
    return { data: args.base64Content, contentType: args.contentType, fileName: args.fileName };
  }
  throw new Error("File input required: provide filePath (preferred) or base64Content + contentType + fileName");
}

export function receiptTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_receipt",
    summary:
      "Receipts/expense reports: list, get, create, update, sign, file_upload, upload_image, categories, payment_methods. States: 0=Draft, 1=Created, 2=Sent, 3=AwaitingApproval, 5=Approved, 6=Paid, 7=Cancelled, 8=SentBack, 10=ClassifiedWintCard.",
    modes: [
      {
        name: "list",
        description:
          "List receipts. filters → {CreatedFromDate?, CreatedToDate? (ISO 8601), State?, States?: number[], Currency?, AmountFrom?, AmountTo?}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/Receipt", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single receipt by id.",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Receipt/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create a receipt. Required: data → {DateTime, Amount, Currency, PaymentMethodId, ReceiptCategoryId, SupplierName, Comment}. Optional: Attachments [{Data, FileName, ContentType}].",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Receipt", args.data),
      },
      {
        name: "update",
        description:
          "Update a receipt. The full receipt object must be provided — partial updates are not supported. Required: id, data (must include at minimum: Id, DateTime, Amount, Currency, PaymentMethodId). For file attachments, prefer mode=upload_image.",
        required: ["id", "data"],
        handler: async (args) => wintClient.put(`/api/Receipt/${sanitizePathParam(args.id)}`, args.data),
      },
      {
        name: "sign",
        description: "Sign/approve a receipt (moves it through the approval flow). Required: id.",
        required: ["id"],
        handler: async (args) => wintClient.post(`/api/Receipt/Sign/${sanitizePathParam(args.id)}`),
      },
      {
        name: "file_upload",
        description:
          "Upload a file via POST /api/File. Returns {UploadedFileId} usable in receipt Attachments. PREFERRED: pass filePath (absolute local path) — the server reads and base64-encodes the file from disk. Token cost is just the path. Alternatively: pass base64Content + contentType + fileName (only when the file isn't on disk; expensive — every byte costs tokens). When using filePath, contentType and fileName are auto-detected from the extension (override via the optional contentType/fileName).",
        handler: async (args) => {
          const { data, contentType, fileName } = await loadFileInput(args);
          return wintClient.post("/api/File", {
            Data: data,
            ContentType: contentType,
            FileName: fileName,
          });
        },
      },
      {
        name: "upload_image",
        description:
          "Upload an image and attach it to a receipt in one step (composite: POST /api/File → GET receipt → PUT receipt with new Attachment). Required: id (receipt ID). File input: PREFER filePath (local path; server reads from disk, no token cost). Alternative: base64Content + contentType + fileName.",
        required: ["id"],
        handler: async (args) => {
          const safeId = sanitizePathParam(args.id);
          const { data, contentType, fileName } = await loadFileInput(args);
          const fileResult = await wintClient.post("/api/File", {
            Data: data,
            ContentType: contentType,
            FileName: fileName,
          });
          const uploadedFileId = fileResult.UploadedFileId;
          const receipt = await wintClient.get(`/api/Receipt/${safeId}`);
          const attachments = Array.isArray(receipt.Attachments) ? receipt.Attachments : [];
          attachments.push({ UploadedFileId: uploadedFileId });
          receipt.Attachments = attachments;
          return wintClient.put(`/api/Receipt/${safeId}`, receipt);
        },
      },
      {
        name: "categories",
        description: "List available receipt categories (lookup data). No params.",
        handler: async () => wintClient.get("/api/ReceiptCategory"),
      },
      {
        name: "payment_methods",
        description: "List available receipt payment methods (cash, card, WintCard). No params.",
        handler: async () => wintClient.get("/api/ReceiptPaymentMethod"),
      },
    ],
    extraSchema: {
      filePath: z
        .string()
        .optional()
        .describe(
          "For mode=file_upload/upload_image: absolute path to a local file. RECOMMENDED — the server reads and base64-encodes from disk (fast, no token cost for the body). contentType and fileName are auto-detected from the path; pass them to override.",
        ),
      base64Content: z
        .string()
        .optional()
        .describe(
          "For mode=file_upload/upload_image: base64-encoded file content. Only use when the file isn't on disk — expensive in tokens. Requires contentType and fileName.",
        ),
      contentType: z
        .string()
        .optional()
        .describe(
          "For mode=file_upload/upload_image: MIME type (e.g. image/png). Required when using base64Content; optional with filePath (auto-detected from extension).",
        ),
      fileName: z
        .string()
        .optional()
        .describe(
          "For mode=file_upload/upload_image: file name with extension. Required when using base64Content; optional with filePath (defaults to the path's basename).",
        ),
    },
  });
  return tool ? [tool] : [];
}

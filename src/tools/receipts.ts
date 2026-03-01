import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const receiptTools: WintTool[] = [
  {
    name: "receipt_list",
    description: "List receipts (expense reports) with pagination. Returns receipt status, amounts, and supplier info. Receipt states: 0 = Draft, 1 = Created, 2 = Sent, 3 = AwaitingApproval, 5 = Approved, 6 = Paid, 7 = Cancelled, 8 = SentBack, 10 = ClassifiedWintCard. States may vary — use receipt_get to check exact values.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Receipt", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "receipt_get",
    description: "Get full details of a specific receipt by ID, including line items, images, and approval status. Receipt states: 0 = Draft, 1 = Created, 2 = Sent, 3 = AwaitingApproval, 5 = Approved, 6 = Paid, 7 = Cancelled, 8 = SentBack, 10 = ClassifiedWintCard.",
    schema: {
      id: z.string().describe("Receipt ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Receipt/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "receipt_create",
    description: "Create a new receipt/expense report. Provide receipt object with SupplierName, TotalAmount, Vat, Currency, Description, Rows (array of {AccountNumber, Amount, Description}).",
    schema: {
      receipt: z.record(z.string(), z.any()).describe("Receipt object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Receipt", args.receipt);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "receipt_update",
    description: "Update an existing receipt. The full receipt object must be provided — partial updates are not supported. The body must include at minimum: Id, DateTime, Amount, Currency, PaymentMethodId. To attach files, include UploadedFileId values in the Images array (upload files first via file_upload or receipt_upload_image).",
    schema: {
      id: z.string().describe("Receipt ID (GUID)"),
      receipt: z.record(z.string(), z.any()).describe("Updated receipt object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.put(`/api/Receipt/${sanitizePathParam(args.id)}`, args.receipt);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "receipt_sign",
    description: "Sign/approve a receipt (moves it through the approval flow).",
    schema: {
      id: z.string().describe("Receipt ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post(`/api/Receipt/Sign/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "file_upload",
    description: "Upload a file to Wint via POST /api/File. Returns an UploadedFileId that can be used in receipt Images arrays or other file-referencing fields. Send base64-encoded file content with its MIME type and file name.",
    schema: {
      data: z.string().describe("Base64-encoded file content"),
      contentType: z.string().describe("MIME type (e.g. image/png, application/pdf)"),
      fileName: z.string().describe("File name with extension (e.g. receipt.png)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/File", {
          Data: args.data,
          ContentType: args.contentType,
          FileName: args.fileName,
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "receipt_upload_image",
    description: "Upload an image and attach it to a receipt in one step. Uploads the file via POST /api/File, fetches the current receipt, appends the new UploadedFileId to the receipt's Images array, and PUTs the updated receipt back.",
    schema: {
      receiptId: z.string().describe("Receipt ID (GUID)"),
      base64Content: z.string().describe("Base64-encoded file content"),
      contentType: z.string().describe("MIME type (e.g. image/jpeg, image/png)"),
      fileName: z.string().describe("File name with extension (e.g. receipt.jpg)"),
    },
    handler: async (args) => {
      try {
        const safeId = sanitizePathParam(args.receiptId);

        // 1. Upload the file
        const fileResult = await wintClient.post("/api/File", {
          Data: args.base64Content,
          ContentType: args.contentType,
          FileName: args.fileName,
        });
        const uploadedFileId = fileResult.UploadedFileId;

        // 2. Get the current receipt
        const receipt = await wintClient.get(`/api/Receipt/${safeId}`);

        // 3. Append the new file ID to Images
        const images = Array.isArray(receipt.Images) ? receipt.Images : [];
        images.push(uploadedFileId);
        receipt.Images = images;

        // 4. Put the updated receipt back
        const updated = await wintClient.put(`/api/Receipt/${safeId}`, receipt);
        return formatResult(updated);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

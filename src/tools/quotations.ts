import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function quotationTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_quotation",
    summary: "Manage quotations/quotes: list, get, create, update, send.",
    modes: [
      {
        name: "list",
        description: "List quotations with pagination.",
        handler: async (args) => wintClient.get("/api/Quotation", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single quotation by id.",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Quotation/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create a quotation. Required: data → {CustomerId, Date, EndDate, Currency, Language, PdfTemplate, Rows: [{ArticleId, Description, Quantity, Price, VAT}, ...]}. Optional in data: ContactPerson, CustomerReference, Notes.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Quotation", args.data),
      },
      {
        name: "update",
        description: "Update a quotation. Required: id (serial number), data.",
        required: ["id", "data"],
        handler: async (args) =>
          wintClient.put(`/api/Quotation/edit/${sanitizePathParam(args.id)}`, args.data),
      },
      {
        name: "send",
        description:
          "Send a quotation by email. Required: options → {SerialNumber, MailSubject, MailToType (e.g. 'CustomerMail'), MailToAddresses?, MailMessage?, MailFrom?}.",
        required: ["options"],
        handler: async (args) => wintClient.post("/api/Quotation/mail", args.options),
      },
    ],
  });
  return tool ? [tool] : [];
}

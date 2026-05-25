import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";

export function articleTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_article",
    summary: "Manage articles/products: list, create, search.",
    modes: [
      {
        name: "list",
        description: "List articles with pagination. Returns article number, name, price, VAT, unit.",
        handler: async (args) => wintClient.get("/api/Article", mergeListParams(args)),
      },
      {
        name: "create",
        description:
          "Create an article. Required: data → {Text (name/description), UnitPrice, Vat (0|6|12|25)}. Optional in data: UnitId.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Article", args.data),
      },
      {
        name: "search",
        description: "Search articles by name. Required: searchName.",
        required: ["searchName"],
        handler: async (args) =>
          wintClient.get("/api/Article/SearchByName", { searchName: args.searchName }),
      },
    ],
    extraSchema: {
      searchName: z.string().optional().describe("For mode=search: article name to search."),
    },
  });
  return tool ? [tool] : [];
}

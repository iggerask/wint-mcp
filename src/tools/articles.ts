import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";

export const articleTools: WintTool[] = [
  {
    name: "article_list",
    description: "List all articles/products. Returns article number, name, price, VAT, and unit.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Article", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "article_create",
    description: "Create a new article/product. Provide article object with Name, UnitPrice, Vat (decimal, e.g. 0.25 for 25%), Unit, AccountNumber, ArticleNumber.",
    schema: {
      article: z.record(z.string(), z.any()).describe("Article object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/Article", args.article);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "article_search",
    description: "Search for articles by name.",
    schema: {
      searchName: z.string().describe("Article name to search for"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Article/SearchByName", { searchName: args.searchName });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

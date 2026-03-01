import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const accountingTools: WintTool[] = [
  {
    name: "account_list",
    description: "List all accounts in the chart of accounts. Returns account number, name, type, and balance.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/Account");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "account_balance",
    description: "Get the balance for a specific account number.",
    schema: {
      account: z.number().describe("Account number (e.g. 1930)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Account/AccountBalance/${sanitizePathParam(args.account)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "voucher_list",
    description: "List accounting vouchers with pagination.",
    schema: {
      ...paginationSchema,
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Voucher", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "voucher_get",
    description: "Get full details of a specific accounting voucher by ID.",
    schema: {
      id: z.string().describe("Voucher ID (GUID)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(`/api/Voucher/${sanitizePathParam(args.id)}`);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "financial_report_result",
    description: "Generate an income statement (resultaträkning). Provide reportParams with FromDate, ToDate, FinancialYearId, IncludeInactiveAccounts, Dimensions.",
    schema: {
      reportParams: z.record(z.string(), z.any()).describe("Report parameters object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/FinancialReports/ResultReport", args.reportParams);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "financial_report_balance",
    description: "Generate a balance sheet (balansräkning). Provide reportParams with FromDate, ToDate, FinancialYearId, IncludeInactiveAccounts.",
    schema: {
      reportParams: z.record(z.string(), z.any()).describe("Report parameters object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/FinancialReports/BalanceReport", args.reportParams);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

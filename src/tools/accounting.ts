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
    name: "monthly_result_report",
    description:
      "Get a monthly P&L / income statement (resultaträkning) broken down by account and month. Returns booked amounts per account per month for the given period. This is the best tool for understanding revenue and costs over time.",
    schema: {
      startYear: z.number().describe("Start year (e.g. 2025)"),
      startMonth: z.number().min(1).max(12).describe("Start month (1-12)"),
      endYear: z.number().describe("End year (e.g. 2026)"),
      endMonth: z.number().min(1).max(12).describe("End month (1-12)"),
      dimensions: z
        .array(z.string())
        .optional()
        .describe("Optional dimension IDs (UUIDs) to filter by"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/FinancialReports/MonthlyResultReport", {
          StartMonth: { Year: args.startYear, Month: args.startMonth },
          EndMonth: { Year: args.endYear, Month: args.endMonth },
          Dimensions: args.dimensions ?? null,
        });
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "financial_report_result",
    description: "Generate an income statement (resultaträkning). Provide reportParams with Columns (array of {StartMonth: {Year, Month}, EndMonth: {Year, Month}}), Dimensions.",
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
  {
    name: "transaction_list",
    description:
      "List booked accounting transactions with date and account filtering. Useful for seeing exactly what has been booked to specific accounts in a period. Supports account ranges like '4000<4999' or '5000<6999-5410' (include range, exclude account).",
    schema: {
      ...paginationSchema,
      BookingDateStart: z.string().optional().describe("Start of booking date range (ISO 8601, e.g. 2025-12-01)"),
      BookingDateEnd: z.string().optional().describe("End of booking date range (ISO 8601, e.g. 2026-02-28)"),
      AccountStart: z.number().optional().describe("Start of account number range (e.g. 4000)"),
      AccountEnd: z.number().optional().describe("End of account number range (e.g. 4999)"),
      AccountRange: z.string().optional().describe("Account range expression (e.g. '4000<4999,5000<6999-5410')"),
      MinAmount: z.number().optional().describe("Minimum transaction amount"),
      MaxAmount: z.number().optional().describe("Maximum transaction amount"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Transaction", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

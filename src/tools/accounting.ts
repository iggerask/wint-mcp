import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function accountingTools(): WintTool[] {
  const chartOfAccountsTool = defineDomainTool({
    name: "wint_chart_of_accounts",
    summary:
      "Chart of accounts, dimensions, and ledger transactions: account_list, account_balance, dimension_list, dimension_create, transaction_list.",
    modes: [
      {
        name: "account_list",
        description: "List all accounts. No params. Returns account number, name, type, balance.",
        handler: async () => wintClient.get("/api/Account"),
      },
      {
        name: "account_balance",
        description: "Get balance for a specific account number. Required: account (integer, e.g. 1930).",
        required: ["account"],
        handler: async (args) =>
          wintClient.get(`/api/Account/AccountBalance/${sanitizePathParam(args.account)}`),
      },
      {
        name: "dimension_list",
        description:
          "List accounting dimensions (cost centers, projects). filters → {TypeId?: string (UUID), CompatibilityType?: number (0=CostCenter, 1=Project)}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/Dimension", mergeListParams(args)),
      },
      {
        name: "dimension_create",
        description:
          "Create a dimension. Required: data → {DimensionTypeId (UUID), Name, Active (boolean)}. Optional: ShortName.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/Dimension", args.data),
      },
      {
        name: "transaction_list",
        description:
          "List booked accounting transactions. filters → {BookingDateStart?, BookingDateEnd? (ISO 8601), AccountStart?, AccountEnd?, AccountRange? (e.g. '4000<4999,5000<6999-5410'), MinAmount?, MaxAmount?}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/Transaction", mergeListParams(args)),
      },
    ],
    extraSchema: {
      account: z.number().optional().describe("For mode=account_balance: account number."),
    },
  });

  const voucherTool = defineDomainTool({
    name: "wint_voucher",
    summary: "Accounting vouchers: list, get, create.",
    modes: [
      {
        name: "list",
        description: "List vouchers with pagination.",
        handler: async (args) => wintClient.get("/api/Voucher", mergeListParams(args)),
      },
      {
        name: "get",
        description: "Get a single voucher by id (GUID). Required: id.",
        required: ["id"],
        handler: async (args) => wintClient.get(`/api/Voucher/${sanitizePathParam(args.id)}`),
      },
      {
        name: "create",
        description:
          "Create a voucher with transactions (debits/credits). The sum of all transaction amounts must equal zero (balanced). Required: data → {BookingDate (ISO 8601), SeriesId (UUID), Transactions: [{AccountNumber|AccountId, Amount (positive=debit, negative=credit), Text, Dimensions?: uuid[]}, ...]}. Optional in data: Text, Images: [{Data (base64), ContentType}, ...].",
        required: ["data"],
        handler: async (args) =>
          wintClient.post("/api/Voucher", {
            ...args.data,
            ValidateLockedSystemAccounts: args.data.ValidateLockedSystemAccounts ?? true,
          }),
      },
    ],
  });

  const financialReportTool = defineDomainTool({
    name: "wint_financial_report",
    summary:
      "Financial statements: monthly_result (P&L by month), result (income statement), balance (balance sheet).",
    modes: [
      {
        name: "monthly_result",
        description:
          "Monthly P&L (resultaträkning) per account per month. Required: startYear, startMonth (1-12), endYear, endMonth (1-12). Optional: dimensions (array of UUIDs).",
        required: ["startYear", "startMonth", "endYear", "endMonth"],
        handler: async (args) =>
          wintClient.post("/api/FinancialReports/MonthlyResultReport", {
            StartMonth: { Year: args.startYear, Month: args.startMonth },
            EndMonth: { Year: args.endYear, Month: args.endMonth },
            Dimensions: args.dimensions ?? null,
          }),
      },
      {
        name: "result",
        description:
          "Income statement (resultaträkning). Required: data → {Columns: [{StartMonth: {Year, Month}, EndMonth: {Year, Month}}, ...], Dimensions?}.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/FinancialReports/ResultReport", args.data),
      },
      {
        name: "balance",
        description:
          "Balance sheet (balansräkning). Required: data → {Columns: [{StartMonth: {Year, Month}, EndMonth: {Year, Month}}, ...], Dimensions?}.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/FinancialReports/BalanceReport", args.data),
      },
    ],
    includePagination: false,
    extraSchema: {
      startYear: z.number().optional().describe("For mode=monthly_result: start year."),
      startMonth: z.number().min(1).max(12).optional().describe("For mode=monthly_result: start month (1-12)."),
      endYear: z.number().optional().describe("For mode=monthly_result: end year."),
      endMonth: z.number().min(1).max(12).optional().describe("For mode=monthly_result: end month (1-12)."),
      dimensions: z.array(z.string()).optional().describe("For mode=monthly_result: dimension UUIDs to filter by."),
    },
  });

  return [chartOfAccountsTool, voucherTool, financialReportTool].filter(
    (t): t is WintTool => t !== null,
  );
}

import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, paginationSchema, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const salaryTools: WintTool[] = [
  {
    name: "salary_report",
    description:
      "Get the salary report showing gross salaries, employer contributions, and net pay. Filter by period range (YYYYMM integers, e.g. 202501 for Jan 2025), employee names, or person IDs.",
    schema: {
      ...paginationSchema,
      StartPeriod: z.number().optional().describe("Start period as YYYYMM integer (e.g. 202501 for Jan 2025)"),
      EndPeriod: z.number().optional().describe("End period as YYYYMM integer (e.g. 202512 for Dec 2025)"),
      PersonIds: z.array(z.number()).optional().describe("Filter by employee person IDs"),
      EmployeeName: z.string().optional().describe("Filter by employee name (partial match)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/WintSalary/SalaryReport", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_entries",
    description:
      "List individual salary entries with detailed filtering. Supports date ranges, amount ranges, and state filtering. Period params are YYYYMM integers.",
    schema: {
      ...paginationSchema,
      YearAndMonthFrom: z.number().optional().describe("Start period as YYYYMM integer (e.g. 202501)"),
      YearAndMonthTo: z.number().optional().describe("End period as YYYYMM integer (e.g. 202512)"),
      PersonIds: z.array(z.number()).optional().describe("Filter by employee person IDs"),
      PayoutDateFrom: z.string().optional().describe("Payment date from (ISO 8601)"),
      PayoutDateTo: z.string().optional().describe("Payment date to (ISO 8601)"),
      IsActive: z.boolean().optional().describe("Filter active/inactive entries"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/PersonSalary", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_deviation_list",
    description: "List salary deviations (variable pay, bonuses, absences) for a given month.",
    schema: {
      yearMonth: z.string().optional().describe("Period in YYYY-MM format"),
    },
    handler: async (args) => {
      try {
        if (args.yearMonth) {
          const result = await wintClient.get(`/api/SalaryDeviation/months/${sanitizePathParam(args.yearMonth)}`);
          return formatResult(result);
        }
        const result = await wintClient.get("/api/SalaryDeviation");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_deviation_create",
    description: "Create a new salary deviation (e.g. bonus, overtime, absence). Provide deviation object with PersonId, DeviationType, Amount, YearMonth, Description.",
    schema: {
      deviation: z.record(z.string(), z.any()).describe("Deviation object"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/SalaryDeviation/Create", args.deviation);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
];

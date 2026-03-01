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
    name: "salary_approval_report",
    description: "Get the salary approval report for the current due month. Shows which employees' salaries are pending approval.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/WintSalary/ApprovalReport");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_gross",
    description: "Get gross salaries overview for a given year.",
    schema: {
      ...paginationSchema,
      Year: z.number().describe("Year (e.g. 2025)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/Salary/GrossSalaries", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_entries",
    description:
      "List individual salary entries with detailed filtering. Supports period ranges, payout dates, amount ranges, and state filtering. Period params are YYYYMM integers.",
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
    name: "salary_person_report",
    description: "Get the salary approval report per person. Shows salary status for each employee.",
    schema: {},
    handler: async () => {
      try {
        const result = await wintClient.get("/api/PersonSalary/PersonSalaryReport");
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_payslip",
    description: "Get payslip data for a specific employee and salary period.",
    schema: {
      personId: z.number().describe("Employee person ID"),
      yearMonth: z.number().describe("Salary period as YYYYMM integer (e.g. 202501)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get(
          `/api/WintSalary/Payslip/${sanitizePathParam(args.personId)}/yearMonth/${sanitizePathParam(args.yearMonth)}`,
        );
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_search_persons",
    description: "Search for employees by name. Useful to find person IDs for other salary tools.",
    schema: {
      SearchStr: z.string().optional().describe("Search string for employee name"),
      ExcludeSelf: z.boolean().optional().describe("Exclude the current user from results"),
      ExcludeSalaryInactive: z.boolean().optional().describe("Exclude salary-disabled employees"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/WintSalary/SearchPersons", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_spec_list",
    description:
      "List salary specification documents (lönespecifikationer) for all employees. Filter by person and year. Use FilterAll to see all employees' specs.",
    schema: {
      ...paginationSchema,
      PersonId: z.number().optional().describe("Filter by employee person ID"),
      Year: z.number().optional().describe("Filter by year (e.g. 2025)"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/SalarySpecificationDocument/FilterAll", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_drafts",
    description:
      "List salary drafts with optional period and state filtering. Period params are YYYYMM integers.",
    schema: {
      ...paginationSchema,
      From: z.number().optional().describe("Start period as YYYYMM integer (e.g. 202501, inclusive)"),
      To: z.number().optional().describe("End period as YYYYMM integer (e.g. 202512, inclusive)"),
      State: z.number().optional().describe("Filter by single draft state"),
      States: z.array(z.number()).optional().describe("Filter by multiple draft states"),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.get("/api/SalaryDrafts", args);
        return formatResult(result);
      } catch (error) {
        return formatError(error);
      }
    },
  },
  {
    name: "salary_approve",
    description:
      "Approve salaries for a specific period. Approves all employees or a subset by person IDs. This is the final action after reviewing salary reports.",
    schema: {
      YearAndMonth: z.number().describe("Period to approve as YYYYMM integer (e.g. 202501)"),
      PersonIds: z.array(z.number()).optional().describe("Specific person IDs to approve. If omitted, approves all."),
    },
    handler: async (args) => {
      try {
        const result = await wintClient.post("/api/WintSalary/Approve", {
          YearAndMonth: args.YearAndMonth,
          PersonIds: args.PersonIds,
        });
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

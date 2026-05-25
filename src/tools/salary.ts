import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, defineDomainTool, mergeListParams } from "./types.js";
import { sanitizePathParam } from "../security.js";

export function salaryTools(): WintTool[] {
  const tool = defineDomainTool({
    name: "wint_salary",
    summary:
      "Salaries, deviations, payslips, drafts, and approvals. Period params are YYYYMM integers (e.g. 202501 for Jan 2025). Modes wrap several backend resources (/WintSalary, /PersonSalary, /Salary, /SalaryDrafts, /SalaryDeviation, /SalarySpecificationDocument).",
    modes: [
      {
        name: "report",
        description:
          "Paged salary report (gross, employer contributions, net pay). filters → {StartPeriod?, EndPeriod? (YYYYMM), PersonIds?: number[], EmployeeName?}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/WintSalary/SalaryReport", mergeListParams(args)),
      },
      {
        name: "approval_report",
        description: "Salary approval report for the current due month. No params.",
        handler: async () => wintClient.get("/api/WintSalary/ApprovalReport"),
      },
      {
        name: "gross",
        description: "Gross salaries overview for a given year. Required: year. Pagination supported.",
        required: ["year"],
        handler: async (args) =>
          wintClient.get("/api/Salary/GrossSalaries", { ...mergeListParams(args), Year: args.year }),
      },
      {
        name: "entries",
        description:
          "List individual salary entries. filters → {YearAndMonthFrom?, YearAndMonthTo? (YYYYMM), PersonIds?: number[], PayoutDateFrom?, PayoutDateTo? (ISO 8601), IsActive?}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/PersonSalary", mergeListParams(args)),
      },
      {
        name: "person_report",
        description: "Salary approval report per person. No params.",
        handler: async () => wintClient.get("/api/PersonSalary/PersonSalaryReport"),
      },
      {
        name: "payslip",
        description:
          "Payslip data for an employee and period. Required: personId (integer), yearMonth (YYYYMM integer).",
        required: ["personId", "yearMonth"],
        handler: async (args) =>
          wintClient.get(
            `/api/WintSalary/Payslip/${sanitizePathParam(args.personId)}/yearMonth/${sanitizePathParam(args.yearMonth)}`,
          ),
      },
      {
        name: "search_persons",
        description:
          "Search employees by name (find person IDs for other modes). filters → {SearchStr?, ExcludeSelf?, ExcludeSalaryInactive?}.",
        handler: async (args) => wintClient.get("/api/WintSalary/SearchPersons", args.filters ?? {}),
      },
      {
        name: "spec_list",
        description:
          "List salary specification documents (lönespecifikationer). filters → {PersonId?, Year?}. Pagination supported.",
        handler: async (args) =>
          wintClient.get("/api/SalarySpecificationDocument/FilterAll", mergeListParams(args)),
      },
      {
        name: "drafts",
        description:
          "List salary drafts. filters → {From?, To? (YYYYMM), State?, States?: number[]}. Pagination supported.",
        handler: async (args) => wintClient.get("/api/SalaryDrafts", mergeListParams(args)),
      },
      {
        name: "approve",
        description:
          "Approve salaries for a period. Required: data → {YearAndMonth (YYYYMM), PersonIds?: number[] — if omitted, approves all}.",
        required: ["data"],
        handler: async (args) =>
          wintClient.post("/api/WintSalary/Approve", {
            YearAndMonth: args.data.YearAndMonth,
            PersonIds: args.data.PersonIds,
          }),
      },
      {
        name: "deviation_list",
        description:
          "List salary deviations (variable pay, bonuses, absences). Optional: yearMonth (YYYYMM) — if omitted, returns all.",
        handler: async (args) => {
          if (args.yearMonth) {
            return wintClient.get(`/api/SalaryDeviation/months/${sanitizePathParam(args.yearMonth)}`);
          }
          return wintClient.get("/api/SalaryDeviation");
        },
      },
      {
        name: "deviation_create",
        description:
          "Create a salary deviation. Required: data → {PersonId, DeviationType, YearAndMonth (YYYYMM), Comment, ...type-specific: Hours, Distance, FromDate, ToDate, FromTime, ToTime}.",
        required: ["data"],
        handler: async (args) => wintClient.post("/api/SalaryDeviation/Create", args.data),
      },
    ],
    extraSchema: {
      year: z.number().optional().describe("For mode=gross: year (e.g. 2025)."),
      yearMonth: z.number().optional().describe("For mode=payslip and deviation_list: YYYYMM (e.g. 202501)."),
      personId: z.number().optional().describe("For mode=payslip: employee person ID."),
    },
  });
  return tool ? [tool] : [];
}

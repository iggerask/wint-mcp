import { z } from "zod";
import { wintClient } from "../auth/client.js";
import { WintTool, formatResult, formatError } from "./types.js";
import { sanitizePathParam } from "../security.js";

export const salaryTools: WintTool[] = [
  {
    name: "salary_report",
    description: "Get the salary report overview showing gross salaries, employer contributions, and net pay for a given period.",
    schema: {
      yearMonth: z.string().optional().describe("Period in YYYY-MM format (e.g. 2025-01)"),
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

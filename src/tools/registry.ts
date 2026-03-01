import { WintTool } from "./types.js";
import { fallbackTool } from "./fallback.js";
import { invoicingTools } from "./invoicing.js";
import { incomingInvoiceTools } from "./incoming-invoices.js";
import { customerTools } from "./customers.js";
import { receiptTools } from "./receipts.js";
import { quotationTools } from "./quotations.js";
import { accountingTools } from "./accounting.js";
import { salaryTools } from "./salary.js";
import { timeReportingTools } from "./time-reporting.js";
import { companyTools } from "./company.js";
import { todoTools } from "./todos.js";
import { articleTools } from "./articles.js";
import { automationTools } from "./automations.js";

const moduleMap: Record<string, WintTool[]> = {
  invoicing: invoicingTools,
  "incoming-invoices": incomingInvoiceTools,
  customers: customerTools,
  receipts: receiptTools,
  quotations: quotationTools,
  accounting: accountingTools,
  salary: salaryTools,
  "time-reporting": timeReportingTools,
  company: companyTools,
  todos: todoTools,
  articles: articleTools,
  automations: automationTools,
};

export const MODULE_NAMES = Object.keys(moduleMap);

export function getAllTools(): WintTool[] {
  const envModules = process.env.WINT_MODULES;

  if (!envModules || envModules.trim() === "") {
    return [...Object.values(moduleMap).flat(), fallbackTool];
  }

  const requested = envModules.split(",").map((s) => s.trim());
  const tools = requested.flatMap((key) => moduleMap[key] ?? []);

  return [...tools, fallbackTool];
}

import { describe, it, expect, vi } from "vitest";
import { getAllTools } from "./registry.js";
import { formatError } from "./types.js";

// Mock the client so registry can load without env vars
vi.mock("../auth/client.js", () => ({
  wintClient: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
  },
}));

const TRAVERSAL_PAYLOADS = [
  "../etc/passwd",
  "..%2F..%2Fetc%2Fpasswd",
  "abc/../def",
  "abc/def",
  "abc\\def",
  "abc\0def",
  "abc def",
  "123?admin=true",
  "123&foo=bar",
  "123;rm -rf /",
];

/**
 * Per-tool/mode test cases that exercise sanitizePathParam.
 * Each entry produces args where the traversal payload is interpolated into a path param.
 */
const PATH_TRAVERSAL_CASES: Array<{ tool: string; description: string; buildArgs: (payload: string) => Record<string, any> }> = [
  // wint_invoice
  { tool: "wint_invoice", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  { tool: "wint_invoice", description: "mode=delete id", buildArgs: (p) => ({ mode: "delete", id: p }) },
  // wint_incoming_invoice
  { tool: "wint_incoming_invoice", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  { tool: "wint_incoming_invoice", description: "mode=sign id", buildArgs: (p) => ({ mode: "sign", id: p }) },
  { tool: "wint_incoming_invoice", description: "mode=certify id", buildArgs: (p) => ({ mode: "certify", id: p }) },
  { tool: "wint_incoming_invoice", description: "mode=cancel id", buildArgs: (p) => ({ mode: "cancel", id: p }) },
  { tool: "wint_incoming_invoice", description: "mode=supplier_get id", buildArgs: (p) => ({ mode: "supplier_get", id: p }) },
  // wint_customer
  { tool: "wint_customer", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  // wint_receipt
  { tool: "wint_receipt", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  { tool: "wint_receipt", description: "mode=sign id", buildArgs: (p) => ({ mode: "sign", id: p }) },
  {
    tool: "wint_receipt",
    description: "mode=upload_image id",
    buildArgs: (p) => ({
      mode: "upload_image",
      id: p,
      base64Content: "aGVsbG8=",
      contentType: "image/png",
      fileName: "test.png",
    }),
  },
  // wint_quotation
  { tool: "wint_quotation", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  // wint_chart_of_accounts
  {
    tool: "wint_chart_of_accounts",
    description: "mode=account_balance account",
    buildArgs: (p) => ({ mode: "account_balance", account: p }),
  },
  // wint_voucher
  { tool: "wint_voucher", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  // wint_salary
  {
    tool: "wint_salary",
    description: "mode=payslip personId",
    buildArgs: (p) => ({ mode: "payslip", personId: p, yearMonth: 202501 }),
  },
  {
    tool: "wint_salary",
    description: "mode=payslip yearMonth",
    buildArgs: (p) => ({ mode: "payslip", personId: 1, yearMonth: p }),
  },
  {
    tool: "wint_salary",
    description: "mode=deviation_list yearMonth",
    buildArgs: (p) => ({ mode: "deviation_list", yearMonth: p }),
  },
  // wint_time_reporting
  {
    tool: "wint_time_reporting",
    description: "mode=project_get id",
    buildArgs: (p) => ({ mode: "project_get", id: p }),
  },
  // wint_company
  { tool: "wint_company", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  {
    tool: "wint_company",
    description: "mode=employee_get id",
    buildArgs: (p) => ({ mode: "employee_get", id: p }),
  },
  // wint_todo
  { tool: "wint_todo", description: "mode=snooze id", buildArgs: (p) => ({ mode: "snooze", id: p }) },
  // wint_supplier_rule
  {
    tool: "wint_supplier_rule",
    description: "mode=list supplierId",
    buildArgs: (p) => ({ mode: "list", supplierId: p }),
  },
  {
    tool: "wint_supplier_rule",
    description: "mode=get supplierId",
    buildArgs: (p) => ({ mode: "get", supplierId: p, id: 1 }),
  },
  // wint_wintcard_rule
  { tool: "wint_wintcard_rule", description: "mode=get id", buildArgs: (p) => ({ mode: "get", id: p }) },
  {
    tool: "wint_wintcard_rule",
    description: "mode=delete id",
    buildArgs: (p) => ({ mode: "delete", id: p }),
  },
  {
    tool: "wint_wintcard_rule",
    description: "mode=activate id",
    buildArgs: (p) => ({ mode: "activate", id: p }),
  },
  {
    tool: "wint_wintcard_rule",
    description: "mode=deactivate id",
    buildArgs: (p) => ({ mode: "deactivate", id: p }),
  },
];

describe("cross-cutting security: path traversal", () => {
  const tools = getAllTools();
  const toolByName = new Map(tools.map((t) => [t.name, t]));

  for (const testCase of PATH_TRAVERSAL_CASES) {
    const tool = toolByName.get(testCase.tool);
    if (!tool) continue;

    describe(`${testCase.tool} (${testCase.description})`, () => {
      for (const payload of TRAVERSAL_PAYLOADS) {
        it(`rejects malicious value: ${payload.slice(0, 30)}`, async () => {
          const result = await tool.handler(testCase.buildArgs(payload));
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain("Invalid path parameter");
        });
      }
    });
  }
});

describe("cross-cutting security: wint_endpoint_lookup", () => {
  const tools = getAllTools();
  const tool = tools.find((t) => t.name === "wint_endpoint_lookup");

  it("exists", () => {
    expect(tool).toBeDefined();
  });

  it("rejects unknown groups", async () => {
    const result = await tool!.handler({ group: "DoesNotExist" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown endpoint group");
  });
});

describe("cross-cutting security: error sanitization", () => {
  it("formatError never leaks auth credentials", () => {
    const error = {
      response: {
        status: 500,
        data: { message: "Internal error" },
      },
      config: {
        auth: { username: "admin", password: "s3cr3tK3y!" },
        baseURL: "https://internal.api.example.com",
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      },
      request: { path: "/api/test" },
    };

    const result = formatError(error);
    const text = result.content[0].text;

    expect(text).not.toContain("admin");
    expect(text).not.toContain("s3cr3tK3y!");
    expect(text).not.toContain("internal.api.example.com");
    expect(text).not.toContain("dXNlcjpwYXNz");
  });

  it("formatError never includes raw response data blob", () => {
    const error = {
      response: {
        status: 400,
        data: {
          Message: "Bad request",
          SensitiveField: "should_not_appear_if_not_Errors",
          DebugInfo: { stackTrace: "at foo.bar()" },
        },
      },
    };

    const result = formatError(error);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.SensitiveField).toBeUndefined();
    expect(parsed.DebugInfo).toBeUndefined();
    expect(parsed.message).toBe("Bad request");
  });
});

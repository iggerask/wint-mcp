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

describe("cross-cutting security: path traversal in all tools", () => {
  const tools = getAllTools();

  // Find tools that have an 'id' parameter in their schema
  const toolsWithId = tools.filter(
    (t) => t.schema.id && t.name !== "wint_api_call"
  );

  for (const tool of toolsWithId) {
    describe(tool.name, () => {
      for (const payload of TRAVERSAL_PAYLOADS) {
        it(`rejects malicious id: ${payload.slice(0, 30)}`, async () => {
          const result = await tool.handler({ id: payload });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain("Invalid path parameter");
        });
      }
    });
  }

  // Test receiptId param in receipt_upload_image
  const uploadImageTool = tools.find((t) => t.name === "receipt_upload_image");
  if (uploadImageTool) {
    describe("receipt_upload_image (receiptId param)", () => {
      for (const payload of TRAVERSAL_PAYLOADS) {
        it(`rejects malicious receiptId: ${payload.slice(0, 30)}`, async () => {
          const result = await uploadImageTool.handler({
            receiptId: payload,
            base64Content: "aGVsbG8=",
            contentType: "image/png",
            fileName: "test.png",
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain("Invalid path parameter");
        });
      }
    });
  }

  // Test yearMonth param in salary_deviation_list
  const salaryTool = tools.find((t) => t.name === "salary_deviation_list");
  if (salaryTool) {
    describe("salary_deviation_list (yearMonth param)", () => {
      for (const payload of TRAVERSAL_PAYLOADS) {
        it(`rejects malicious yearMonth: ${payload.slice(0, 30)}`, async () => {
          const result = await salaryTool.handler({ yearMonth: payload });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain("Invalid path parameter");
        });
      }
    });
  }

  // Test account param in account_balance
  const accountTool = tools.find((t) => t.name === "account_balance");
  if (accountTool) {
    describe("account_balance (account param)", () => {
      it("accepts a numeric account", async () => {
        const result = await accountTool.handler({ account: 1930 });
        expect(result.isError).toBeUndefined();
      });

      it("rejects traversal in account", async () => {
        const result = await accountTool.handler({ account: "../1930" });
        expect(result.isError).toBe(true);
      });
    });
  }
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

    // Should only have error, status, message, details — not raw data blob
    expect(parsed.SensitiveField).toBeUndefined();
    expect(parsed.DebugInfo).toBeUndefined();
    expect(parsed.message).toBe("Bad request");
  });
});

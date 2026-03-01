import { describe, it, expect } from "vitest";
import { sanitizePathParam, validateApiPath, sanitizeErrorForOutput } from "./security.js";

describe("sanitizePathParam", () => {
  it("accepts a valid GUID", () => {
    expect(sanitizePathParam("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
  });

  it("accepts an integer", () => {
    expect(sanitizePathParam(42)).toBe("42");
  });

  it("accepts a yearMonth string", () => {
    expect(sanitizePathParam("2025-01")).toBe("2025-01");
  });

  it("accepts a simple alphanumeric string", () => {
    expect(sanitizePathParam("abc123")).toBe("abc123");
  });

  it("rejects path traversal (..)", () => {
    expect(() => sanitizePathParam("../etc/passwd")).toThrow("Invalid path parameter");
  });

  it("rejects slashes", () => {
    expect(() => sanitizePathParam("abc/def")).toThrow("Invalid path parameter");
  });

  it("rejects backslashes", () => {
    expect(() => sanitizePathParam("abc\\def")).toThrow("Invalid path parameter");
  });

  it("rejects null bytes", () => {
    expect(() => sanitizePathParam("abc\0def")).toThrow("Invalid path parameter");
  });

  it("rejects spaces", () => {
    expect(() => sanitizePathParam("abc def")).toThrow("Invalid path parameter");
  });

  it("rejects query string injection", () => {
    expect(() => sanitizePathParam("123?admin=true")).toThrow("Invalid path parameter");
  });

  it("rejects empty string", () => {
    expect(() => sanitizePathParam("")).toThrow("Invalid path parameter");
  });
});

describe("validateApiPath", () => {
  it("accepts a valid /api/ path", () => {
    expect(validateApiPath("/api/Invoice/List")).toBe("/api/Invoice/List");
  });

  it("accepts a path with query-like segments", () => {
    expect(validateApiPath("/api/Customer/123")).toBe("/api/Customer/123");
  });

  it("rejects a path not starting with /api/", () => {
    expect(() => validateApiPath("/etc/passwd")).toThrow("must start with /api/");
  });

  it("rejects path traversal (..)", () => {
    expect(() => validateApiPath("/api/../etc/passwd")).toThrow("forbidden sequence");
  });

  it("rejects double slashes", () => {
    expect(() => validateApiPath("/api//Invoice")).toThrow("forbidden sequence");
  });

  it("rejects backslashes", () => {
    expect(() => validateApiPath("/api/Invoice\\List")).toThrow("forbidden sequence");
  });

  it("rejects null bytes", () => {
    expect(() => validateApiPath("/api/Invoice\0")).toThrow("forbidden sequence");
  });

  it("rejects empty path", () => {
    expect(() => validateApiPath("")).toThrow("must start with /api/");
  });

  it("rejects relative path", () => {
    expect(() => validateApiPath("api/Invoice")).toThrow("must start with /api/");
  });
});

describe("sanitizeErrorForOutput", () => {
  it("extracts status and message from axios-like error", () => {
    const error = {
      response: {
        status: 404,
        data: { Message: "Not found" },
      },
      config: {
        auth: { username: "secret", password: "s3cr3t" },
      },
    };
    const result = sanitizeErrorForOutput(error);
    expect(result).toEqual({
      error: true,
      status: 404,
      message: "Not found",
      details: undefined,
    });
  });

  it("never includes config or auth fields", () => {
    const error = {
      response: {
        status: 500,
        data: { message: "Server error" },
      },
      config: {
        auth: { username: "user", password: "pass" },
        baseURL: "https://secret.internal",
      },
    };
    const serialized = JSON.stringify(sanitizeErrorForOutput(error));
    expect(serialized).not.toContain("user");
    expect(serialized).not.toContain("pass");
    expect(serialized).not.toContain("secret.internal");
  });

  it("includes Errors field as details", () => {
    const error = {
      response: {
        status: 400,
        data: { Message: "Validation failed", Errors: [{ Field: "Name", Error: "Required" }] },
      },
    };
    const result = sanitizeErrorForOutput(error);
    expect(result.details).toEqual([{ Field: "Name", Error: "Required" }]);
  });

  it("truncates oversized responses", () => {
    const error = {
      response: {
        status: 200,
        data: { Message: "Ok", Errors: Array(500).fill({ Field: "x", Error: "y".repeat(100) }) },
      },
    };
    const result = sanitizeErrorForOutput(error);
    expect(result.details).toBe("[response too large, truncated]");
  });

  it("handles non-axios errors gracefully", () => {
    const result = sanitizeErrorForOutput(new Error("something broke"));
    expect(result).toEqual({ error: true, message: "Error: something broke" });
  });

  it("handles string errors", () => {
    const result = sanitizeErrorForOutput("network timeout");
    expect(result).toEqual({ error: true, message: "network timeout" });
  });

  it("handles null/undefined errors", () => {
    expect(sanitizeErrorForOutput(null)).toEqual({ error: true, message: "null" });
    expect(sanitizeErrorForOutput(undefined)).toEqual({ error: true, message: "undefined" });
  });
});

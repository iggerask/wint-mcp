import { describe, it, expect } from "vitest";
import { formatResult, formatError } from "./types.js";

describe("formatResult", () => {
  it("wraps data in MCP text content", () => {
    const result = formatResult({ Id: 1, Name: "Test" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ Id: 1, Name: "Test" });
  });

  it("handles arrays", () => {
    const result = formatResult([1, 2, 3]);
    expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
  });

  it("handles null", () => {
    const result = formatResult(null);
    expect(result.content[0].text).toBe("null");
  });
});

describe("formatError", () => {
  it("returns isError: true", () => {
    const result = formatError(new Error("test"));
    expect(result.isError).toBe(true);
  });

  it("returns correct MCP content shape", () => {
    const result = formatError({ response: { status: 400, data: { Message: "Bad" } } });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe("Bad");
  });

  it("never leaks auth credentials", () => {
    const error = {
      response: { status: 500, data: { message: "Error" } },
      config: {
        auth: { username: "admin", password: "hunter2" },
        baseURL: "https://internal.host",
        headers: { Authorization: "Basic abc123" },
      },
    };
    const result = formatError(error);
    const text = result.content[0].text;
    expect(text).not.toContain("admin");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("internal.host");
    expect(text).not.toContain("abc123");
  });

  it("handles non-response errors", () => {
    const result = formatError("something failed");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.message).toBe("something failed");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fallbackTool } from "./fallback.js";

vi.mock("../auth/client.js", () => ({
  wintClient: {
    request: vi.fn().mockResolvedValue({ Items: [] }),
  },
}));

import { wintClient } from "../auth/client.js";

const mockRequest = vi.mocked(wintClient.request);

describe("fallbackTool (wint_api_call)", () => {
  beforeEach(() => {
    mockRequest.mockClear();
    mockRequest.mockResolvedValue({ Items: [] });
  });

  it("passes through a valid /api/ call", async () => {
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/api/Invoice/List",
      params: { Page: 1 },
    });
    expect(mockRequest).toHaveBeenCalledWith("GET", "/api/Invoice/List", {
      params: { Page: 1 },
      data: undefined,
    });
    expect(result.content[0].text).toContain("Items");
  });

  it("rejects path traversal (../)", async () => {
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/api/../etc/passwd",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("forbidden sequence");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("rejects paths not starting with /api/", async () => {
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/etc/passwd",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("must start with /api/");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("rejects double-slash paths", async () => {
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/api//Invoice",
    });
    expect(result.isError).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("rejects backslash paths", async () => {
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/api/Invoice\\List",
    });
    expect(result.isError).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("passes body for POST requests", async () => {
    await fallbackTool.handler({
      method: "POST",
      path: "/api/Invoice",
      body: { CustomerId: 1 },
    });
    expect(mockRequest).toHaveBeenCalledWith("POST", "/api/Invoice", {
      params: undefined,
      data: { CustomerId: 1 },
    });
  });

  it("returns formatError on API failure", async () => {
    mockRequest.mockRejectedValue({
      response: { status: 500, data: { Message: "Server error" } },
    });
    const result = await fallbackTool.handler({
      method: "GET",
      path: "/api/Invoice/List",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Server error");
  });
});

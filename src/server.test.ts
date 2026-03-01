import { describe, it, expect, vi } from "vitest";
import { createServer } from "./server.js";

vi.mock("./auth/client.js", () => ({
  wintClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

describe("createServer", () => {
  it("returns an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server.tool).toBe("function");
    expect(typeof server.connect).toBe("function");
  });

  it("registers tools without throwing", () => {
    expect(() => createServer()).not.toThrow();
  });
});

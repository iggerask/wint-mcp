import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosInstance } from "axios";
import { WintApiClient, BASE_URL } from "./client.js";

function createMockAxios(): AxiosInstance {
  return {
    request: vi.fn().mockResolvedValue({ data: { ok: true } }),
  } as unknown as AxiosInstance;
}

describe("WintApiClient", () => {
  let mockAxios: AxiosInstance;
  let client: WintApiClient;

  beforeEach(() => {
    mockAxios = createMockAxios();
    client = new WintApiClient(mockAxios);
  });

  it("throws when env vars are missing and no injected client", () => {
    const origUser = process.env.WINT_USERNAME;
    const origKey = process.env.WINT_API_KEY;
    delete process.env.WINT_USERNAME;
    delete process.env.WINT_API_KEY;

    expect(() => new WintApiClient()).toThrow("WINT_USERNAME and WINT_API_KEY");

    process.env.WINT_USERNAME = origUser;
    process.env.WINT_API_KEY = origKey;
  });

  it("calls axios.request with correct method and path for GET", async () => {
    const result = await client.get("/api/Invoice/List", { Page: 1 });
    expect(result).toEqual({ ok: true });
    expect(mockAxios.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/Invoice/List",
      params: { Page: 1 },
      data: undefined,
    });
  });

  it("calls axios.request with correct method and data for POST", async () => {
    const body = { CustomerId: 1 };
    await client.post("/api/Invoice", body, { draft: "true" });
    expect(mockAxios.request).toHaveBeenCalledWith({
      method: "POST",
      url: "/api/Invoice",
      params: { draft: "true" },
      data: body,
    });
  });

  it("calls axios.request with correct method and data for PUT", async () => {
    const body = { Name: "Updated" };
    await client.put("/api/Customer/1", body);
    expect(mockAxios.request).toHaveBeenCalledWith({
      method: "PUT",
      url: "/api/Customer/1",
      params: undefined,
      data: body,
    });
  });

  it("calls axios.request with correct method for DELETE", async () => {
    await client.delete("/api/Invoice/abc-123");
    expect(mockAxios.request).toHaveBeenCalledWith({
      method: "DELETE",
      url: "/api/Invoice/abc-123",
      params: undefined,
      data: undefined,
    });
  });

  it("logs to stderr on each request", async () => {
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await client.get("/api/Invoice/List");
    expect(stderrSpy).toHaveBeenCalledWith("[wint] GET /api/Invoice/List");
    stderrSpy.mockRestore();
  });

  it("exports BASE_URL", () => {
    expect(BASE_URL).toBe("https://superkollapi.wint.se");
  });
});

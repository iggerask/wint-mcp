import { describe, it, expect } from "vitest";
import { endpointLookupTool } from "./endpoint-lookup.js";

describe("wint_endpoint_lookup", () => {
  it("returns the endpoint section for a known group", async () => {
    const result = await endpointLookupTool.handler({ group: "Invoice" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.group).toBe("Invoice");
    expect(parsed.endpoints).toContain("[Invoice]");
    expect(parsed.endpoints).toContain("GET /api/Invoice/List");
  });

  it("returns the correct slice (does not bleed into the next group)", async () => {
    const result = await endpointLookupTool.handler({ group: "Account" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.endpoints).toContain("[Account]");
    // The next group in the index starts with `[`. The section should not
    // contain any other `[Header]` markers.
    const otherHeaders = parsed.endpoints.match(/\n\[[A-Za-z]+\]/g);
    expect(otherHeaders).toBeNull();
  });

  it("rejects unknown groups with a clear error", async () => {
    const result = await endpointLookupTool.handler({ group: "DoesNotExist" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown endpoint group");
    expect(result.content[0].text).toContain("DoesNotExist");
  });

  it("looks up late-in-alphabet groups (no truncation)", async () => {
    // Regression guard: a prior version truncated the listed groups via .slice(0, 50),
    // so groups late in the alphabet weren't surfaced to the LLM. Verify the handler
    // still resolves groups from across the alphabet.
    for (const lateGroup of ["WintSalary", "Voucher", "TimeReport"]) {
      const result = await endpointLookupTool.handler({ group: lateGroup });
      expect(result.isError, `expected ${lateGroup} to resolve`).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.endpoints).toContain(`[${lateGroup}]`);
    }
  });
});

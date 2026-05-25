# Wint MCP Server

An MCP server that gives Claude (and other LLM clients) direct access to the [Wint](https://wint.se) / Superkoll business management API — invoicing, expenses, accounting, salary, and more.

```
Claude Desktop  <-->  wint-mcp (stdio)  <-->  Wint API
```

## Quick start

### 1. Get your Wint API credentials

In Wint, go to **Settings > Integrations > Custom integrations** and create a new integration. This gives you a **username** and **API key**. The integration's permissions control what the MCP server can access.

### 2. Install and build

```bash
git clone <repo-url> wint-mcp
cd wint-mcp
npm install
npm run build
```

### 3. Configure Claude Desktop

Open your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "wint": {
      "command": "node",
      "args": ["/absolute/path/to/wint-mcp/dist/src/index.js"],
      "env": {
        "WINT_USERNAME": "your-username",
        "WINT_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Claude Desktop. You should see "wint" listed under the MCP tools icon.

## Tool surface

The server exposes **16 mode-dispatched domain tools**, plus `wint_endpoint_lookup` and the generic `wint_api_call` fallback — **18 tools total**. Each domain tool takes a `mode` parameter and dispatches to a specific operation; the rest of the args (`id`, `filters`, `data`, `options`, …) are documented per-mode in the tool's description.

| Tool | Module key | Modes |
|------|-----------|-------|
| `wint_invoice` | `invoicing` | `list`, `get`, `create`, `update`, `delete`, `send`, `send_reminder`, `pdf` |
| `wint_incoming_invoice` | `incoming-invoices` | `list`, `get`, `create`, `update`, `sign`, `certify`, `cancel`, `send_to_person`, `supplier_list`, `supplier_get` |
| `wint_customer` | `customers` | `list`, `get`, `create`, `update`, `search` |
| `wint_receipt` | `receipts` | `list`, `get`, `create`, `update`, `sign`, `file_upload`, `upload_image`, `categories`, `payment_methods` |
| `wint_quotation` | `quotations` | `list`, `get`, `create`, `update`, `send` |
| `wint_chart_of_accounts` | `accounting` | `account_list`, `account_balance`, `dimension_list`, `dimension_create`, `transaction_list` |
| `wint_voucher` | `accounting` | `list`, `get`, `create` |
| `wint_financial_report` | `accounting` | `monthly_result`, `result`, `balance` |
| `wint_salary` | `salary` | `report`, `approval_report`, `gross`, `entries`, `person_report`, `payslip`, `search_persons`, `spec_list`, `drafts`, `approve`, `deviation_list`, `deviation_create` |
| `wint_time_reporting` | `time-reporting` | `report_list`, `report_create`, `project_list`, `project_get` |
| `wint_company` | `company` | `get`, `list`, `select`, `global_search`, `employee_list`, `employee_get`, `search_persons` |
| `wint_todo` | `todos` | `summary`, `list`, `snooze` |
| `wint_article` | `articles` | `list`, `create`, `search` |
| `wint_customer_automation_rule` | `automations` | `list` |
| `wint_supplier_rule` | `automations` | `list`, `get`, `create`, `update` |
| `wint_wintcard_rule` | `automations` | `get`, `create`, `update`, `delete`, `activate`, `deactivate` |
| `wint_endpoint_lookup` | *always loaded* | Returns the slice of the Wint endpoint index for a resource group. Call this before `wint_api_call` when you need an endpoint that isn't covered above. |
| `wint_api_call` | *always loaded* | Generic HTTP escape hatch — call any Wint endpoint by method + path. |

### Example invocations

```jsonc
// List unpaid invoices
wint_invoice({ "mode": "list", "filters": { "Statuses": [1] } })

// Send an invoice by email
wint_invoice({
  "mode": "send",
  "id": 42,
  "options": { "InvoiceSendMethod": "Email", "MailOptions": { /* ... */ } }
})

// Get a P&L for a quarter
wint_financial_report({
  "mode": "monthly_result",
  "startYear": 2026, "startMonth": 1,
  "endYear": 2026, "endMonth": 3
})

// Approve salaries for January
wint_salary({
  "mode": "approve",
  "data": { "YearAndMonth": 202601, "PersonIds": [10, 11, 12] }
})
```

### Filtering: `WINT_MODULES` and `WINT_TOOL_MODES`

You can narrow the tool surface with two env vars (they compose):

**`WINT_MODULES`** — load only specific modules (matched against the module keys in the table above):

```json
"env": {
  "WINT_MODULES": "invoicing,receipts,salary"
}
```

**`WINT_TOOL_MODES`** — within each loaded tool, allow only specific modes. Format: `tool:mode1,mode2;tool:mode1`.

```json
"env": {
  "WINT_TOOL_MODES": "wint_invoice:list,get,pdf;wint_voucher:list,get"
}
```

If filtering leaves a tool with zero modes, that tool is dropped entirely. `wint_endpoint_lookup` and `wint_api_call` are always loaded.

Use cases: read-only deployments, per-agent permission scopes, demos.

## File uploads — pass a path, not base64

`wint_receipt` modes `file_upload` and `upload_image` take a file via **either**:

- **`filePath`** (recommended) — absolute path to a local file. The server reads from disk and base64-encodes it. The model spends tokens only on the path. `contentType` and `fileName` are auto-detected from the extension; pass them to override.
- **`base64Content` + `contentType` + `fileName`** — only when the file isn't on disk (e.g. the model synthesized it). Every byte costs tokens — avoid this for anything larger than a few KB.

```jsonc
// Fast — server reads the file
wint_receipt({
  "mode": "upload_image",
  "id": 123,
  "filePath": "/Users/me/Downloads/IMG_4521.jpg"
})

// Slow / expensive — only when you have no path
wint_receipt({
  "mode": "file_upload",
  "base64Content": "...big base64 string...",
  "contentType": "image/png",
  "fileName": "synthesized.png"
})
```

Recognized extensions for auto-detect: `.png`, `.jpg`/`.jpeg`, `.gif`, `.webp`, `.heic`/`.heif`, `.bmp`, `.tif`/`.tiff`, `.pdf`. Anything else falls back to `application/octet-stream` — pass `contentType` explicitly in that case.

## The fallback tools

The Wint API has hundreds of endpoints; the curated domain tools cover the most common workflows. When you need something else:

1. Call **`wint_endpoint_lookup({ group: "Invoice" })`** to see the endpoints in a resource group (e.g. `Invoice`, `RecurringInvoice`, `BankIdSign`, `Settings`).
2. Call **`wint_api_call({ method, path, params?, body? })`** with the path you need.

The `wint_api_call` description lists the available groups but not every endpoint — that's deliberate (the full index used to inflate every conversation by ~30KB). Look up details on demand via `wint_endpoint_lookup`.

## Development

```bash
npm run dev        # Run with tsx (no build step)
npm run build      # Compile TypeScript
npm test           # Run tests (vitest)
npm run test:watch # Watch mode
```

### Project structure

```
src/
  index.ts              # Entrypoint (stdio transport)
  server.ts             # MCP server setup, tool registration
  auth/client.ts        # Wint API HTTP client (basic auth)
  security.ts           # Path validation, error sanitization
  tools/
    types.ts            # WintTool, defineDomainTool factory, mergeListParams
    registry.ts         # Module map, WINT_MODULES filtering
    fallback.ts         # wint_api_call (generic escape hatch)
    endpoint-lookup.ts  # wint_endpoint_lookup (on-demand endpoint index slice)
    invoicing.ts        # wint_invoice
    incoming-invoices.ts # wint_incoming_invoice
    customers.ts        # wint_customer
    receipts.ts         # wint_receipt (+ file-loading helper)
    quotations.ts       # wint_quotation
    accounting.ts       # wint_chart_of_accounts / wint_voucher / wint_financial_report
    salary.ts           # wint_salary
    time-reporting.ts   # wint_time_reporting
    company.ts          # wint_company
    todos.ts            # wint_todo
    articles.ts         # wint_article
    automations.ts      # wint_customer_automation_rule / wint_supplier_rule / wint_wintcard_rule
  generated/
    endpoint-index.ts   # Auto-generated full API endpoint list (served on demand)
```

### Adding a new mode to an existing tool

Most additions are one new entry in the tool's `modes` array:

```ts
// in src/tools/invoicing.ts
{
  name: "preview",                  // mode value
  description: "Render an invoice preview as HTML. Required: id.",
  required: ["id"],
  handler: async (args) =>
    wintClient.get(`/api/Invoice/${sanitizePathParam(args.id)}/Preview/0`),
},
```

The shared schema (`mode`, `id`, `filters`, `data`, `options`, pagination) is already there — only add to `extraSchema` if your mode needs a well-known top-level field that doesn't fit those buckets.

### Adding a new domain tool

1. Create `src/tools/your-module.ts` exporting a function `yourTools(): WintTool[]` that calls `defineDomainTool(...)`. Return `tool ? [tool] : []` so the env-var mode filter can drop it.
2. Add it to `moduleMap` in `src/tools/registry.ts` (the value is the function reference — modules are lazy so `WINT_TOOL_MODES` is re-evaluated on each `getAllTools()` call).
3. Bump the count expectation in `src/tools/registry.test.ts`.
4. Run `npm test && npm run build`.

## License

[MIT](LICENSE)

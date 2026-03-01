# Wint MCP Server

An MCP server that gives Claude (and other LLM clients) direct access to the [Wint](https://wint.se) / Superkoll business management API — invoicing, expenses, accounting, salary, and more.

```
Claude Desktop  <-->  wint-mcp (stdio)  <-->  Wint API
```

## Quick start

### 1. Get your Wint API credentials

You need a **username** and **API key** from your Wint account. Contact Wint support or your account administrator to obtain these.

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

## Modules

The server exposes **65 tools** across 12 modules, plus a generic fallback tool for any endpoint not covered by the curated tools.

| Module | Key | Tools | What it covers |
|--------|-----|-------|----------------|
| Invoicing | `invoicing` | 8 | Create, send, and manage customer invoices |
| Incoming invoices | `incoming-invoices` | 6 | Supplier invoice approval workflow |
| Customers | `customers` | 5 | Customer CRUD and search |
| Receipts | `receipts` | 7 | Expense reports, file uploads |
| Quotations | `quotations` | 5 | Quotes / offers |
| Accounting | `accounting` | 6 | Accounts, vouchers, financial reports |
| Salary | `salary` | 3 | Salary reports and deviations |
| Time reporting | `time-reporting` | 4 | Time logs and projects |
| Company | `company` | 4 | Company info and person search |
| Todos | `todos` | 2 | Todo list and snoozing |
| Articles | `articles` | 3 | Product / service articles |
| Automations | `automations` | 11 | Supplier auto-approval rules, WintCard classification rules |
| *Fallback* | *always loaded* | 1 | Generic `wint_api_call` for any API endpoint |

### Limiting active modules

By default all modules are loaded. To load only specific modules, set the `WINT_MODULES` environment variable:

```json
{
  "mcpServers": {
    "wint": {
      "command": "node",
      "args": ["/absolute/path/to/wint-mcp/dist/src/index.js"],
      "env": {
        "WINT_USERNAME": "your-username",
        "WINT_API_KEY": "your-api-key",
        "WINT_MODULES": "invoicing,customers,receipts"
      }
    }
  }
}
```

This reduces the number of tools the LLM sees, which can improve response quality and is useful when you only have API permissions for certain areas.

The `wint_api_call` fallback tool is always available regardless of this setting.

## The fallback tool

The Wint API has hundreds of endpoints. The curated modules cover the most common workflows, but `wint_api_call` lets Claude call **any** endpoint directly by specifying the HTTP method, path, and optional params/body. Its description includes a full endpoint index so the LLM knows what's available.

## Development

```bash
npm run dev       # Run with tsx (no build step)
npm run build     # Compile TypeScript
npm test          # Run tests
npm run test:watch # Run tests in watch mode
```

### Project structure

```
src/
  index.ts              # Entrypoint (stdio transport)
  server.ts             # MCP server setup, tool registration
  auth/client.ts        # Wint API HTTP client (basic auth)
  security.ts           # Path validation, error sanitization
  tools/
    registry.ts         # Module map, WINT_MODULES filtering
    types.ts            # WintTool interface, shared schemas
    fallback.ts         # Generic wint_api_call tool
    invoicing.ts        # Invoice tools
    incoming-invoices.ts
    customers.ts
    receipts.ts
    quotations.ts
    accounting.ts
    salary.ts
    time-reporting.ts
    company.ts
    todos.ts
    articles.ts
    automations.ts      # Automation rule tools
  generated/
    endpoint-index.ts   # Auto-generated API endpoint list
```

### Adding a new module

1. Create `src/tools/your-module.ts` exporting a `WintTool[]` array
2. Import and add it to `moduleMap` in `src/tools/registry.ts`
3. Update the `MODULE_NAMES` length assertion in `registry.test.ts`
4. Run `npm test && npm run build`

## License

Private / proprietary.

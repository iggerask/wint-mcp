import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllTools } from "./tools/registry.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "wint",
    version: "1.0.0",
  });

  const tools = getAllTools();

  for (const tool of tools) {
    const hasParams = Object.keys(tool.schema).length > 0;
    if (hasParams) {
      server.tool(
        tool.name,
        tool.description,
        tool.schema,
        async (args) => {
          return tool.handler(args);
        }
      );
    } else {
      server.tool(
        tool.name,
        tool.description,
        async () => {
          return tool.handler({});
        }
      );
    }
  }

  console.error(`Wint MCP server initialized with ${tools.length} tools`);
  return server;
}

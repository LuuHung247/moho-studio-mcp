#!/usr/bin/env node

/**
 * Moho Studio MCP Bridge Server
 *
 * Entry point for the MCP server that bridges MCP clients (Claude Desktop,
 * Claude Code) to the Lua plugin running inside Moho (file-based JSON-RPC).
 *
 * Communication flow:
 *   MCP Client <--stdio--> This Bridge <--file IPC/JSON-RPC--> MOHO Lua Plugin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { MohoClient } from "./moho-client.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources.js";
import { PRODUCTION_GUIDE } from "./guide.js";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  process.stderr.write(
    `[moho-mcp] Starting ${config.server.name} v${config.server.version}\n`,
  );

  // Create the MCP server
  const server = new McpServer(
    {
      name: config.server.name,
      version: config.server.version,
    },
    {
      instructions: PRODUCTION_GUIDE,
    },
  );

  // Create the MOHO TCP client (connection is lazy — established on first tool call)
  const mohoClient = new MohoClient();

  // Register all MOHO tools on the MCP server
  registerTools(server, mohoClient);

  // Register static knowledge resources (shortcuts, tools reference)
  registerResources(server);

  // Wire up stdio transport (stdin/stdout for MCP protocol, stderr for logging)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("[moho-mcp] MCP server running on stdio transport\n");

  // -----------------------------------------------------------------------
  // Graceful shutdown
  // -----------------------------------------------------------------------

  const shutdown = (): void => {
    process.stderr.write("[moho-mcp] Shutting down...\n");
    mohoClient.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", shutdown);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  process.stderr.write(
    `[moho-mcp] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});

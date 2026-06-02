#!/usr/bin/env node
const { loadWorkspaceContext, parseArgs } = require("./mcp/health-context");
const { createHealthClient } = require("./mcp/health-client");
const { createMcpServer } = require("./mcp/stdio-server");
const { TOOLS, callTool } = require("./mcp/health-tools");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = loadWorkspaceContext(args);
  if (args.listTools) {
    process.stdout.write(JSON.stringify({ tools: TOOLS }) + "\n");
    return;
  }
  const client = createHealthClient(context);
  await createMcpServer({ tools: TOOLS, callTool: (request) => callTool(request, client) }).run();
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`${error.message || "health mcp wrapper failed"}\n`);
  process.exit(2);
});

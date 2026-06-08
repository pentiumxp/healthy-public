#!/usr/bin/env node
const { loadWorkspaceContext, parseArgs } = require("./mcp/health-context");
const { createHealthClient } = require("./mcp/health-client");
const { createMcpServer } = require("./mcp/stdio-server");
const { TOOLS, callTool } = require("./mcp/health-tools");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = loadWorkspaceContext(args);
  const tools = toolsForMode(args);
  if (args.listTools) {
    process.stdout.write(JSON.stringify({ tools }) + "\n");
    return;
  }
  const client = createHealthClient(context);
  await createMcpServer({ tools, callTool: (request) => callTool(requestForMode(args, request), client) }).run();
  process.exit(0);
}

function toolsForMode(args) {
  if (!args.gatewayToolNames) return TOOLS;
  return TOOLS.map((tool) => ({ ...tool, name: stripHealthPrefix(tool.name) }));
}

function requestForMode(args, request) {
  if (!args.gatewayToolNames) return request;
  const name = request.params && request.params.name;
  if (!name || String(name).startsWith("mcp_health_")) return request;
  return { ...request, params: { ...request.params, name: `mcp_health_${name}` } };
}

function stripHealthPrefix(name) {
  return String(name || "").replace(/^mcp_health_/, "");
}

main().catch((error) => {
  process.stderr.write(`${error.message || "health mcp wrapper failed"}\n`);
  process.exit(2);
});

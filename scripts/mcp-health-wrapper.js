#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const TOOLS = [
  {
    name: "mcp_health_records_get_summary",
    description: "Return a bounded health summary for the configured Hermes workspace.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = loadWorkspaceContext(args);
  if (args.listTools) {
    process.stdout.write(JSON.stringify({ tools: TOOLS }) + "\n");
    return;
  }
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const request = JSON.parse(line);
    const response = await handleRequest(request, context);
    process.stdout.write(JSON.stringify(response) + "\n");
  }
}

function parseArgs(argv) {
  const args = { noWorkspaceOverride: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i];
    else if (arg === "--no-workspace-override") args.noWorkspaceOverride = true;
    else if (arg === "--list-tools") args.listTools = true;
  }
  return args;
}

function loadWorkspaceContext(args) {
  if (!args.workspace) failClosed("workspace is required");
  const healthDir = path.join(args.workspace, ".hermes-health");
  const configPath = path.join(healthDir, "config.json");
  const keyPath = path.join(healthDir, "access-key.txt");
  if (!fs.existsSync(configPath)) failClosed("health config is missing");
  if (!fs.existsSync(keyPath)) failClosed("health access key is missing");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const accessKey = fs.readFileSync(keyPath, "utf8").trim();
  if (!config.base_url || !config.workspace_id || !accessKey) {
    failClosed("health workspace config is incomplete");
  }
  return { accessKey, baseUrl: config.base_url, workspaceId: config.workspace_id };
}

async function handleRequest(request, context) {
  if (request.method === "tools/list") {
    return { jsonrpc: "2.0", id: request.id, result: { tools: TOOLS } };
  }
  if (request.method === "tools/call") {
    return callTool(request, context);
  }
  return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method not found" } };
}

async function callTool(request, context) {
  const name = request.params && request.params.name;
  if (name !== "mcp_health_records_get_summary") {
    return { jsonrpc: "2.0", id: request.id, error: { code: -32602, message: "unknown tool" } };
  }
  const url = new URL("/api/v1/dashboard", context.baseUrl);
  url.searchParams.set("workspace_id", context.workspaceId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${context.accessKey}` } });
  const data = await response.json();
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [{ type: "text", text: JSON.stringify(summarize(data)) }]
    }
  };
}

function summarize(data) {
  return {
    ok: true,
    workspace_id: data.workspace && data.workspace.id,
    summary: {
      strength_sessions: data.strength && data.strength.sessionCount,
      weekly_volume_kg: data.strength && data.strength.weeklyVolumeKg,
      pending_review: data.pendingReview
    },
    warnings: []
  };
}

function failClosed(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

main().catch((error) => failClosed(error.message || "health mcp wrapper failed"));


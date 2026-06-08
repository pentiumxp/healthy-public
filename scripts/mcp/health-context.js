const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = { noWorkspaceOverride: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i];
    else if (arg === "--no-workspace-override") args.noWorkspaceOverride = true;
    else if (arg === "--list-tools") args.listTools = true;
    else if (arg === "--api-base-url") args.apiBaseUrl = argv[++i];
    else if (arg === "--gateway-tool-names") args.gatewayToolNames = true;
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
  return { accessKey, baseUrl: String(args.apiBaseUrl || config.base_url).trim(), workspaceId: config.workspace_id };
}

function failClosed(message) {
  throw new Error(message);
}

module.exports = { loadWorkspaceContext, parseArgs };

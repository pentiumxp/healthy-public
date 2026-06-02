const readline = require("node:readline");

function createMcpServer({ tools, callTool }) {
  async function run() {
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      const request = JSON.parse(line);
      const response = await handleRequest(request);
      if (response) process.stdout.write(JSON.stringify(response) + "\n");
    }
  }

  async function handleRequest(request) {
    if (request.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "health-mcp", version: "0.1.0" } }
      };
    }
    if (request.method === "notifications/initialized") return null;
    if (request.method === "tools/list") return { jsonrpc: "2.0", id: request.id, result: { tools } };
    if (request.method === "tools/call") return callTool(request);
    return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method not found" } };
  }

  return { run };
}

module.exports = { createMcpServer };

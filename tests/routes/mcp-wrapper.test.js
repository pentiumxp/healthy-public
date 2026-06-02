const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const WRAPPER = path.resolve(__dirname, "..", "..", "scripts", "mcp-health-wrapper.js");

test("MCP wrapper fails closed without workspace config and key", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-mcp-missing-"));
  const result = spawnSync(process.execPath, [WRAPPER, "--workspace", workspace, "--no-workspace-override"], {
    encoding: "utf8",
    input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n"
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /health config is missing/);
  assert.doesNotMatch(result.stderr, /key-/);
});

test("MCP wrapper lists mcp_health callable from workspace-local config", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-mcp-ready-"));
  const healthDir = path.join(workspace, ".hermes-health");
  fs.mkdirSync(healthDir);
  fs.writeFileSync(path.join(healthDir, "config.json"), JSON.stringify({
    base_url: "http://127.0.0.1:4877",
    workspace_id: "health:weixin_test_1"
  }));
  fs.writeFileSync(path.join(healthDir, "access-key.txt"), "synthetic-key");

  const result = spawnSync(process.execPath, [WRAPPER, "--workspace", workspace, "--no-workspace-override", "--list-tools"], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.tools[0].name, "mcp_health_records_get_summary");
  assert.doesNotMatch(result.stdout, /synthetic-key/);
});


const assert = require("node:assert/strict");
const test = require("node:test");
const { createHealthClient } = require("../../scripts/mcp/health-client");

test("MCP health client sends JSON as UTF-8", async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    const client = createHealthClient({
      baseUrl: "http://127.0.0.1:4877",
      workspaceId: "health:owner",
      accessKey: "synthetic-key"
    });
    await client.addMedication({ name: "Atorvastatin" });
    assert.equal(captured.options.headers["content-type"], "application/json; charset=utf-8");
    assert.match(captured.url, /workspace_id=health%3Aowner/);
    assert.doesNotMatch(captured.options.body, /synthetic-key/);
  } finally {
    global.fetch = originalFetch;
  }
});

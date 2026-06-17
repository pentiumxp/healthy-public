const assert = require("node:assert/strict");
const test = require("node:test");
const { TOOLS, callTool } = require("../../scripts/mcp/health-tools");

test("MCP unified sleep tools expose Apple Health sleep through recovery queries", async () => {
  const client = {
    listAppleSleepRecords: async () => ({ records: [
      { id: "apple-1", sleep_start: "2026-06-15T16:40:59.000Z", total_sleep_minutes: 591 }
    ] }),
    listMedicalRecords: async () => { throw new Error("recovery should not be queried for Apple Health source"); }
  };
  const result = await callTool(request("mcp_health_recovery_sleep_list", { sourceType: "Apple Health" }), client);
  const payload = JSON.parse(result.result.content[0].text);
  assert.equal(payload.records[0].record_domain, "apple_health_sleep");
  assert.equal(payload.records[0].source_type, "Apple Health");
  assert.equal(payload.records[0].total_sleep_minutes, 591);
});

test("MCP unified sleep list merges recovery and Apple Health records", async () => {
  assert.ok(TOOLS.some((tool) => tool.name === "mcp_health_sleep_records_list"));
  const client = {
    listAppleSleepRecords: async () => ({ records: [
      { id: "apple-1", sleep_start: "2026-06-15T16:40:59.000Z", total_sleep_minutes: 591 }
    ] }),
    listMedicalRecords: async (kind, args) => {
      assert.equal(kind, "recovery-sleep");
      assert.equal("limit" in args, false);
      return { records: [{ id: "oura-1", sleep_start: "2026-03-30", source_type: "oura_30d_trend", total_sleep_minutes: 443 }] };
    }
  };
  const result = await callTool(request("mcp_health_sleep_records_list", { limit: 5 }), client);
  const payload = JSON.parse(result.result.content[0].text);
  assert.deepEqual(payload.records.map((record) => record.record_domain), ["apple_health_sleep", "recovery_sleep"]);
});

function request(name, args) {
  return { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } };
}

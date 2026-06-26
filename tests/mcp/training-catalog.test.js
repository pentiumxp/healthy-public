const assert = require("node:assert/strict");
const test = require("node:test");
const { TOOLS, callTool } = require("../../scripts/mcp/health-tools");

test("MCP exposes training catalog tools with canonical keys and aliases", async () => {
  assert.ok(TOOLS.some((tool) => tool.name === "mcp_health_strength_exercise_catalog_list"));
  assert.ok(TOOLS.some((tool) => tool.name === "mcp_health_cardio_activity_catalog_list"));

  const strength = await callTool(request("mcp_health_strength_exercise_catalog_list"), {});
  const cardio = await callTool(request("mcp_health_cardio_activity_catalog_list"), {});
  const strengthRecords = JSON.parse(strength.result.content[0].text).records;
  const cardioRecords = JSON.parse(cardio.result.content[0].text).records;

  assert.ok(strengthRecords.some((item) => item.key === "barbell_back_squat" && item.aliases.includes("杠铃深蹲")));
  assert.ok(strengthRecords.some((item) => item.key === "push_up"
    && item.label === "俯卧撑"
    && item.english === "Push-up"
    && ["pushup", "push-up", "push up", "俯卧撑", "伏地挺身"].every((alias) => item.aliases.includes(alias))));
  assert.ok(cardioRecords.some((item) => item.key === "indoor_walk" && item.aliases.includes("室内步行")));
  assert.doesNotMatch(JSON.stringify({ strengthRecords, cardioRecords }), /synthetic-key|launch=/);
});

function request(name) {
  return { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: {} } };
}

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const test = require("node:test");
const { createServer } = require("../../src/app/http-server");
const { sha256 } = require("../../src/utils/auth");
const { createTestServices } = require("../test-helpers");
const { loadWorkspaceContext, parseArgs } = require("../../scripts/mcp/health-context");

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
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_strength_exercise_catalog_list"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_cardio_activity_catalog_list"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_apple_health_bulk_sync"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_apple_daily_summaries_bulk_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_apple_workouts_list"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_profile_update"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_strength_session_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_cardio_session_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_body_measurement_update"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_lab_result_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_risk_profile_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "mcp_health_followup_task_create"));
  assert.doesNotMatch(result.stdout, /synthetic-key/);
});

test("MCP wrapper can expose gateway-local tool names", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-mcp-gateway-names-"));
  const healthDir = path.join(workspace, ".hermes-health");
  fs.mkdirSync(healthDir);
  fs.writeFileSync(path.join(healthDir, "config.json"), JSON.stringify({
    base_url: "http://127.0.0.1:4877",
    workspace_id: "health:weixin_test_1"
  }));
  fs.writeFileSync(path.join(healthDir, "access-key.txt"), "synthetic-key");

  const result = spawnSync(process.execPath, [
    WRAPPER,
    "--workspace",
    workspace,
    "--no-workspace-override",
    "--gateway-tool-names",
    "--list-tools"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.tools.some((tool) => tool.name === "lab_result_record"));
  assert.ok(parsed.tools.some((tool) => tool.name === "apple_health_bulk_sync"));
  assert.ok(!parsed.tools.some((tool) => tool.name === "mcp_health_lab_result_record"));
  assert.doesNotMatch(result.stdout, /synthetic-key/);
});

test("MCP wrapper launch context can override API base URL", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-mcp-api-base-"));
  const healthDir = path.join(workspace, ".hermes-health");
  fs.mkdirSync(healthDir);
  fs.writeFileSync(path.join(healthDir, "config.json"), JSON.stringify({
    base_url: "http://127.0.0.1:4877",
    workspace_id: "health:weixin_test_1"
  }));
  fs.writeFileSync(path.join(healthDir, "access-key.txt"), "synthetic-key");

  const context = loadWorkspaceContext(parseArgs([
    "--workspace",
    workspace,
    "--no-workspace-override",
    "--api-base-url",
    "http://172.27.192.1:4877"
  ]));

  assert.equal(context.baseUrl, "http://172.27.192.1:4877");
  assert.equal(context.workspaceId, "health:weixin_test_1");
});

test("MCP wrapper can write and read workspace-local health data", async () => {
  const services = createTestServices();
  services.pluginService.provision({
    owner: "hermes",
    workspace_id: "health:weixin_test_1",
    hermes_workspace_id: "weixin_test_1",
    access_key_hash: sha256("synthetic-key"),
    scopes: ["health:read", "health:write", "records:write"]
  }, "registration-key");
  const server = createServer(services);
  await listen(server);
  const workspace = createMcpWorkspace(`http://127.0.0.1:${server.address().port}`);
  try {
    const profile = await mcpCall(workspace, "mcp_health_profile_update", { heightValue: 180, targetWeightValue: 78 });
    assert.equal(profile.profile.height_cm, 180);

    const strength = await mcpCall(workspace, "mcp_health_strength_session_record", {
      startedAt: "2026-06-02T19:00:00+08:00",
      sets: [{ exercise: { name: "Bench Press" }, weightValue: 80, weightUnit: "kg", reps: 5 }]
    });
    assert.equal(strength.sets.length, 1);

    const cardio = await mcpCall(workspace, "mcp_health_cardio_session_record", {
      startedAt: "2026-06-04T19:52:00+08:00",
      activityType: "indoor_walk",
      durationSeconds: 1504,
      distanceValue: 2.28,
      distanceUnit: "km"
    });
    assert.equal(cardio.activity_type, "indoor_walk");

    const appleDaily = await mcpCall(workspace, "mcp_health_apple_daily_summaries_bulk_record", {
      records: [
        { summaryDate: "2026-06-14", stepCount: 8800, activeEnergyKcal: 430 },
        { summaryDate: "2026-06-15", stepCount: 10200, activeEnergyKcal: 510 }
      ]
    });
    assert.equal(appleDaily.count, 2);
    const appleWorkout = await mcpCall(workspace, "mcp_health_apple_workout_record", {
      startedAt: "2026-06-15T19:00:00+08:00",
      appleActivityType: "outdoor walk",
      durationSeconds: 1800
    });
    assert.equal(appleWorkout.apple_activity_type, "outdoor_walk");
    const appleBulk = await mcpCall(workspace, "mcp_health_apple_health_bulk_sync", {
      source: "apple_health_ios",
      range: "last7",
      client_sync_id: "ios-run-mcp",
      sleep_records: [{ sleepStart: "2026-06-14T23:00:00+08:00", sleepEnd: "2026-06-15T06:30:00+08:00", totalSleepMinutes: 450 }],
      ecg_records: [{ recordedAt: "2026-06-15T07:10:00+08:00", classification: "sinus rhythm", averageHeartRateBpm: 62 }],
      body_measurements: ["body_fat_percentage", "lean_body_mass", "waist_circumference", "hip_circumference"].map((metric, index) => ({
        measuredAt: "2026-06-15T07:00:00+08:00", metric, value: [18.2, 59.3, 82, 96][index], unit: ["percent", "kg", "cm", "cm"][index]
      })),
      vitals: [{ measuredAt: "2026-06-15T07:01:00+08:00", metric: "hrv_ms", value: 42 }]
    });
    assert.equal(appleBulk.counts.sleep_records, 1);
    assert.equal(appleBulk.counts.ecg_records, 1);
    assert.equal(appleBulk.counts.body_measurements, 4);
    assert.equal(appleBulk.counts.vitals, 1);

    const body = await mcpCall(workspace, "mcp_health_body_measurement_record", {
      measuredAt: "2026-06-02T08:00:00+08:00",
      metric: "weight",
      value: 81,
      unit: "kg"
    });
    const updatedBody = await mcpCall(workspace, "mcp_health_body_measurement_update", {
      measurementId: body.id,
      value: 80.5
    });
    assert.equal(updatedBody.value, 80.5);

    const summary = await mcpCall(workspace, "mcp_health_records_get_summary", {});
    assert.equal(summary.workspace_id, "health:weixin_test_1");
    assert.equal(summary.summary.strength_sessions, 1);
    assert.equal(summary.summary.apple_health.latestDaily.step_count, 10200);
    assert.equal(summary.summary.apple_health.latestEcg.classification, "sinus_rhythm");
    assert.equal(summary.summary.latest_body_metrics.weight.value, 80.5);
    for (const [metric, value] of Object.entries({ body_fat_percentage: 18.2, lean_body_mass: 59.3, waist_circumference: 82, hip_circumference: 96 })) {
      assert.equal(summary.summary.latest_body_metrics[metric].value, value);
    }

    const lab = await mcpCall(workspace, "mcp_health_lab_result_record", {
      observedAt: "2026-06-02T08:00:00+08:00",
      testName: "ALT",
      value: 59.2,
      unit: "U/L",
      panel: "liver"
    });
    assert.equal(lab.test_name, "ALT");
    const risks = await mcpCall(workspace, "mcp_health_risk_profile_record", {
      assessedAt: "2026-06-02T08:00:00+08:00",
      riskKey: "atherosclerosis",
      label: "Atherosclerosis with coronary plaque",
      priority: 1
    });
    assert.equal(risks.risk_key, "atherosclerosis");
    await mcpCall(workspace, "mcp_health_followup_task_create", {
      title: "Repeat ALT with CK",
      category: "lab_review",
      status: "open"
    });
    const labs = await mcpCall(workspace, "mcp_health_lab_results_list", { testName: "ALT" });
    assert.equal(labs.records.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("MCP wrapper rejects model-supplied workspace or credential overrides", async () => {
  const services = createTestServices();
  services.pluginService.provision({
    workspace_id: "health:weixin_test_1",
    hermes_workspace_id: "weixin_test_1",
    access_key_hash: sha256("synthetic-key")
  }, "registration-key");
  const server = createServer(services);
  await listen(server);
  const workspace = createMcpWorkspace(`http://127.0.0.1:${server.address().port}`);
  try {
    const result = await mcpRequest(workspace, "mcp_health_profile_update", {
      workspace_id: "health:owner",
      heightValue: 180
    });
    assert.equal(result.error.message, "forbidden_argument");
    assert.doesNotMatch(JSON.stringify(result), /synthetic-key/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("MCP wrapper rejects corrupted text before writing health data", async () => {
  const services = createTestServices();
  services.pluginService.provision({
    workspace_id: "health:weixin_test_1",
    hermes_workspace_id: "weixin_test_1",
    access_key_hash: sha256("synthetic-key")
  }, "registration-key");
  const server = createServer(services);
  await listen(server);
  const workspace = createMcpWorkspace(`http://127.0.0.1:${server.address().port}`);
  try {
    const result = await mcpRequest(workspace, "mcp_health_medication_add", { name: "????", frequency: "daily" });
    assert.equal(result.error.message, "invalid_text_encoding");
    assert.equal(services.profileService.listActiveMedications({ workspaceRef: "health:weixin_test_1" }).length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function createMcpWorkspace(baseUrl) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-mcp-api-"));
  const healthDir = path.join(workspace, ".hermes-health");
  fs.mkdirSync(healthDir);
  fs.writeFileSync(path.join(healthDir, "config.json"), JSON.stringify({
    base_url: baseUrl,
    workspace_id: "health:weixin_test_1"
  }));
  fs.writeFileSync(path.join(healthDir, "access-key.txt"), "synthetic-key");
  return workspace;
}

async function mcpCall(workspace, name, args) {
  const result = await mcpRequest(workspace, name, args);
  assert.ifError(result.error);
  const text = result.result.content[0].text;
  assert.doesNotMatch(text, /synthetic-key/);
  return JSON.parse(text);
}

function mcpRequest(workspace, name, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WRAPPER, "--workspace", workspace, "--no-workspace-override"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        assert.equal(code, 0, stderr);
        assert.doesNotMatch(stdout, /synthetic-key/);
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) + "\n");
  });
}

function listen(server) { return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); }

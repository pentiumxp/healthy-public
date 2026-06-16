const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer } = require("../../src/app/http-server");
const { sha256 } = require("../../src/utils/auth");
const { createTestServices } = require("../test-helpers");

test("Apple Health bulk APIs write long-term workspace-local data", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await provision(base, "weixin_owner", "key-owner");
    await provision(base, "weixin_test_1", "key-test");
    const ownerLaunch = await launch(base, "weixin_owner", "key-owner");
    const testLaunch = await launch(base, "weixin_test_1", "key-test");

    const synced = await api(base, "/api/v1/apple-health/bulk-sync", "POST", ownerLaunch, {
      source: "apple_health_ios",
      range: "last7",
      client_sync_id: "ios-run-owner",
      daily_summaries: [
        { summaryDate: "2026-06-14", steps: 8800, activeEnergyKcal: 430, exerciseMinutes: 42 },
        { summaryDate: "2026-06-15", steps: 10200, activeEnergyKcal: 510, exerciseMinutes: 58 }
      ],
      workouts: [{
        startedAt: "2026-06-15T19:00:00+08:00",
        appleActivityType: "outdoor walk",
        durationSeconds: 1800,
        averageHeartRateBpm: 116,
        minHeartRateBpm: 91,
        maxHeartRateBpm: 138,
        heartRateSamples: [
          { sampledAt: "2026-06-15T19:00:05+08:00", heartRateBpm: 91 },
          { sampledAt: "2026-06-15T19:05:05+08:00", heartRateBpm: 121 }
        ]
      }],
      sleep_records: [{ sleepStart: "2026-06-14T23:30:00+08:00", sleepEnd: "2026-06-15T06:30:00+08:00", totalSleepMinutes: 420 }],
      ecg_records: [{
        externalId: "route-ecg-1",
        recordedAt: "2026-06-15T07:10:00+08:00",
        classification: "sinus rhythm",
        averageHeartRateBpm: 62,
        samplingFrequencyHz: 512,
        voltageSamples: [
          { sampleIndex: 0, offsetMs: 0, voltageMicrovolts: -31 },
          { sampleIndex: 1, offsetMs: 1.95, voltageMicrovolts: 42 }
        ]
      }]
    });
    assert.equal(synced.counts.daily_summaries, 2);
    assert.equal(synced.counts.workouts, 1);
    assert.equal(synced.counts.sleep_records, 1);
    assert.equal(synced.counts.ecg_records, 1);

    const ownerDashboard = await api(base, "/api/v1/dashboard", "GET", ownerLaunch);
    const testDashboard = await api(base, "/api/v1/dashboard", "GET", testLaunch);
    assert.equal(ownerDashboard.appleHealth.latestDaily.step_count, 10200);
    assert.equal(ownerDashboard.appleHealth.workouts[0].apple_activity_type, "outdoor_walk");
    assert.equal(ownerDashboard.appleHealth.workouts[0].heart_rate_summary.max_heart_rate_bpm, 138);
    assert.equal(ownerDashboard.appleHealth.workouts[0].heart_rate_samples.length, 2);
    assert.equal(ownerDashboard.appleHealth.latestSleep.total_sleep_minutes, 420);
    assert.equal(ownerDashboard.appleHealth.latestEcg.classification, "sinus_rhythm");
    assert.equal(testDashboard.appleHealth.latestDaily, null);
    const ecg = await api(base, "/api/v1/apple-health/ecg-records/by-external-id?externalId=route-ecg-1", "GET", ownerLaunch);
    assert.equal(ecg.record.sample_count, 2);
    assert.equal(ecg.record.voltage_samples[1].voltage_microvolts, 42);
    const ecgList = await api(base, "/api/v1/apple-health/ecg-records?limit=10", "GET", ownerLaunch);
    assert.equal(ecgList.records.length, 1);
    assert.equal(ecgList.records[0].classification, "sinus_rhythm");
    assert.equal(ecgList.records[0].voltage_samples, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Apple Health bulk sync accepts Home AI proxy workspace context", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await provision(base, "weixin_test_1", "key-test");
    const synced = await apiWithWorkspaceKey(base, "/api/v1/apple-health/bulk-sync", "POST", "weixin_test_1", "key-test", {
      source: "apple_health_ios",
      range: "last7",
      client_sync_id: "ios-run-proxy",
      daily_summaries: [{ summaryDate: "2026-06-16", steps: 1234 }],
      electrocardiograms: [{ recordedAt: "2026-06-16T08:00:00+08:00", classification: "inconclusive other" }]
    });
    assert.equal(synced.counts.daily_summaries, 1);
    assert.equal(synced.counts.ecg_records, 1);

    const dashboard = await apiWithWorkspaceKey(base, "/api/v1/dashboard", "GET", "weixin_test_1", "key-test");
    assert.equal(dashboard.appleHealth.latestDaily.summary_date, "2026-06-16");
    assert.equal(dashboard.appleHealth.latestDaily.step_count, 1234);
    assert.equal(dashboard.appleHealth.latestEcg.classification, "inconclusive_other");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function provision(base, hermesWorkspaceId, rawKey) {
  const response = await fetch(`${base}/api/v1/hermes/plugin/workspaces`, {
    method: "POST",
    headers: { Authorization: "Bearer registration-key", "content-type": "application/json" },
    body: JSON.stringify({
      owner: "hermes",
      workspace_id: `health:${hermesWorkspaceId}`,
      hermes_workspace_id: hermesWorkspaceId,
      access_key_hash: sha256(rawKey),
      scopes: ["health:read", "health:write"]
    })
  });
  assert.equal(response.status, 200);
}

async function launch(base, hermesWorkspaceId, rawKey) {
  const response = await fetch(`${base}/api/v1/hermes/plugin/launch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: `health:${hermesWorkspaceId}`, hermes_workspace_id: hermesWorkspaceId })
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function api(base, path, method, launch, body) {
  const url = new URL(`${base}${path}`);
  url.searchParams.set("launch", new URLSearchParams(launch.entry_path.split("?")[1]).get("launch"));
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function apiWithWorkspaceKey(base, path, method, workspaceId, rawKey, body) {
  const url = new URL(`${base}${path}`);
  url.searchParams.set("workspaceId", workspaceId);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${rawKey}`,
      "x-hermes-plugin-workspace-id": workspaceId,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  assert.equal(response.status, 200);
  return response.json();
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, resolve));
}

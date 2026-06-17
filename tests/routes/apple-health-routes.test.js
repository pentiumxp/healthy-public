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
    seedAppleExportRows(services, "health:weixin_owner");

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
        elevationGainM: 190,
        elevationLossM: 8,
        sourceName: "Technogym",
        deviceManufacturer: "Technogym",
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
    assert.equal(ownerDashboard.appleHealth.workouts[0].elevation_gain_m, 190);
    assert.equal(ownerDashboard.appleHealth.workouts[0].elevation_loss_m, 8);
    assert.equal(ownerDashboard.appleHealth.workouts[0].source_name, "Technogym");
    assert.equal(ownerDashboard.appleHealth.workouts[0].device_manufacturer, "Technogym");
    assert.equal(ownerDashboard.appleHealth.workouts[0].heart_rate_summary.max_heart_rate_bpm, 138);
    assert.equal(ownerDashboard.appleHealth.workouts[0].heart_rate_samples.length, 2);
    assert.equal(ownerDashboard.appleHealth.latestSleep.total_sleep_minutes, 420);
    const sleepList = await api(base, "/api/v1/apple-health/sleep-records?limit=5", "GET", ownerLaunch);
    assert.equal(sleepList.records.length, 1);
    assert.equal(sleepList.records[0].total_sleep_minutes, 420);
    assert.equal(ownerDashboard.appleHealth.latestEcg.classification, "sinus_rhythm");
    assert.equal(testDashboard.appleHealth.latestDaily, null);
    const ecg = await api(base, "/api/v1/apple-health/ecg-records/by-external-id?externalId=route-ecg-1", "GET", ownerLaunch);
    assert.equal(ecg.record.sample_count, 2);
    assert.equal(ecg.record.voltage_samples[1].voltage_microvolts, 42);
    const ecgList = await api(base, "/api/v1/apple-health/ecg-records?limit=10", "GET", ownerLaunch);
    assert.equal(ecgList.records.length, 1);
    assert.equal(ecgList.records[0].classification, "sinus_rhythm");
    assert.equal(ecgList.records[0].voltage_samples, undefined);
    assert.equal((await api(base, "/api/v1/apple-health/observations?metricName=VO2Max", "GET", ownerLaunch)).records[0].numeric_avg, 42.5);
    assert.equal((await api(base, "/api/v1/apple-health/import-files?fileKind=ecg_csv", "GET", ownerLaunch)).records[0].row_count, 15360);
    assert.equal((await api(base, "/api/v1/apple-health/route-points?routeFile=route.gpx", "GET", ownerLaunch)).records[0].latitude, 31.1);
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

test("Apple Health sync state supports latest-only native synchronization", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await provision(base, "weixin_test_1", "key-test");
    const launchToken = await launch(base, "weixin_test_1", "key-test");
    const emptyState = await api(base, "/api/v1/apple-health/sync-state", "GET", launchToken);
    assert.equal(emptyState.domains.daily_summaries.latest_record_at, null);
    assert.equal(emptyState.domains.workouts.record_count, 0);
    assert.equal(emptyState.instructions.write_endpoint, "/api/v1/apple-health/incremental-sync");

    const noPayload = await api(base, "/api/v1/apple-health/incremental-sync", "POST", launchToken, {
      source: "apple_health_ios",
      range: "latest"
    });
    assert.equal(noPayload.mode, "incremental");
    assert.deepEqual(noPayload.counts, {
      daily_summaries: 0, workouts: 0, sleep_records: 0,
      ecg_records: 0, body_measurements: 0, vitals: 0
    });

    await api(base, "/api/v1/apple-health/incremental-sync", "POST", launchToken, {
      source: "apple_health_ios",
      range: "latest",
      daily_summaries: [{ summaryDate: "2026-06-17", steps: 3210 }],
      workouts: [{ startedAt: "2026-06-17T08:00:00+08:00", endedAt: "2026-06-17T08:30:00+08:00", appleActivityType: "walking", durationSeconds: 1800 }],
      sleep_records: [{ sleepStart: "2026-06-16T23:00:00+08:00", sleepEnd: "2026-06-17T06:00:00+08:00" }],
      ecg_records: [{ externalId: "latest-ecg-1", recordedAt: "2026-06-17T07:00:00+08:00", classification: "sinus rhythm" }],
      vitals: [{ measuredAt: "2026-06-17T07:01:00+08:00", metric: "heart_rate", value: 67 }]
    });
    const state = await api(base, "/api/v1/apple-health/sync-state", "GET", launchToken);
    assert.equal(state.domains.daily_summaries.latest_record_at, "2026-06-17");
    assert.equal(state.domains.workouts.latest_record_at, "2026-06-17T00:30:00.000Z");
    assert.equal(state.domains.sleep_records.latest_record_at, "2026-06-16T22:00:00.000Z");
    assert.equal(state.domains.ecg_records.latest_record_at, "2026-06-16T23:00:00.000Z");
    assert.equal(state.domains.vitals.latest_record_at, "2026-06-16T23:01:00.000Z");
    assert.match(state.domains.vitals.recommended_since, /^2026-06-14T23:01:00/);
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

function seedAppleExportRows(services, workspaceRef) {
  const user = services.db.prepare("SELECT id FROM users WHERE workspace_ref = ?").get(workspaceRef);
  services.db.prepare(`INSERT INTO apple_health_observations
    (id, user_id, source_type, external_id, category_id, category_name, record_type, metric_name, period, granularity, numeric_avg, unit, created_at, updated_at)
    VALUES ('route_obs1', ?, 'apple_health_export_daily_observation', 'route_obs1', '03_cardiorespiratory', 'Cardio', 'HKQuantityTypeIdentifierVO2Max', 'VO2Max', '2026-06-15', 'daily', 42.5, 'ml/kg/min', 'now', 'now')`).run(user.id);
  services.db.prepare(`INSERT INTO apple_health_import_files
    (id, user_id, source_type, external_id, file_path, file_kind, byte_size, row_count, metadata_json, created_at, updated_at)
    VALUES ('route_file1', ?, 'apple_health_export_file', 'route_file1', 'apple_health_export/electrocardiograms/ecg.csv', 'ecg_csv', 120, 15360, '{}', 'now', 'now')`).run(user.id);
  services.db.prepare(`INSERT INTO apple_health_workout_route_points
    (id, user_id, source_type, external_id, route_file, point_index, recorded_at, latitude, longitude, elevation_m, metadata_json, created_at, updated_at)
    VALUES ('route_point1', ?, 'apple_health_workout_route', 'route_point1', 'route.gpx', 0, '2026-06-15T00:00:00.000Z', 31.1, 121.1, 5.5, '{}', 'now', 'now')`).run(user.id);
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

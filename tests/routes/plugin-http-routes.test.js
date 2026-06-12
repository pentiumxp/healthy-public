const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer } = require("../../src/app/http-server");
const { sha256 } = require("../../src/utils/auth");
const { createTestServices } = require("../test-helpers");

test("manifest exposes unified Hermes plugin discovery fields", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const manifest = await (await fetch(`${base}/api/v1/hermes/plugin/manifest`)).json();
    assert.equal(manifest.id, "health");
    assert.equal(manifest.title, "健康");
    assert.equal(manifest.kind, "embedded_app");
    assert.equal(manifest.mcp.server, "health-mcp");
    assert.equal(manifest.mcp.toolset, "health");
    assert.deepEqual(manifest.toolsets, ["health"]);
    assert.deepEqual(manifest.actions.find((action) => action.id === "record_metric"), {
      id: "record_metric",
      label: "记录指标",
      placement: ["plugin_drawer_frequent", "dock_long_press", "search"],
      priority: 10,
      entry: { type: "plugin_route", pluginRoute: "record_metric" }
    });
    assert.equal(manifest.provisioning.endpoint, "/api/v1/hermes/plugin/workspaces");
    assert.equal(manifest.launch.endpoint, "/api/v1/hermes/plugin/launch");
    assert.equal(manifest.workspace.required, true);
    assert.equal(countRows(services.db, "users"), 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("embedded UI serves Chinese display label script", async () => {
  const server = createServer(createTestServices());
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/health-labels.js`);
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/javascript/);
    assert.match(text, /HealthLabels/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("embedded UI serves cardio module script", async () => {
  const server = createServer(createTestServices());
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/health-cardio.js`);
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(text, /HealthCardio/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("registration requires configured service key and rejects wrong key with stable diagnostics", async () => {
  const missingKeyServices = createTestServices({ registrationKey: "" });
  const missingKeyServer = createServer(missingKeyServices);
  await listen(missingKeyServer);
  const missingKeyBase = `http://127.0.0.1:${missingKeyServer.address().port}`;
  try {
    const response = await registrationRequest(missingKeyBase, "weixin_test_1", "key-test", "registration-key");
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "registration_key_required");
    assert.equal(countRows(missingKeyServices.db, "users"), 0);
  } finally {
    await new Promise((resolve) => missingKeyServer.close(resolve));
  }

  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await registrationRequest(base, "weixin_test_1", "key-test", "wrong-registration-key");
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "registration_key_invalid");
    assert.equal(countRows(services.db, "users"), 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("registration is idempotent and stores one workspace-local profile", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const created = await provision(base, "weixin_test_1", "key-test");
    const updated = await provision(base, "weixin_test_1", "key-test-rotated");

    assert.equal(created.provisioning_result, "created");
    assert.equal(updated.provisioning_result, "updated");
    assert.equal(countRows(services.db, "users"), 1);
    assert.equal(countRows(services.db, "user_profiles"), 1);
    const targetUser = services.profileService.getUserByWorkspace("health:weixin_test_1");
    assert.equal(targetUser.workspace_access_key_hash, sha256("key-test-rotated"));
    assert.notEqual(targetUser.workspace_access_key_hash, "key-test-rotated");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("Owner workspace registration accepts bare Hermes workspace id and launches canonical Health workspace", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const registration = await fetch(`${base}/api/v1/hermes/plugin/workspaces`, {
      method: "POST",
      headers: { Authorization: "Bearer registration-key", "content-type": "application/json" },
      body: JSON.stringify({
        owner: "hermes",
        workspace_id: "owner",
        target_workspace_id: "owner",
        display_name: "Owner",
        access_key_hash: sha256("key-owner"),
        scopes: ["health:read", "health:write", "reports:read", "records:write"]
      })
    });
    const registrationBody = await registration.json();
    assert.equal(registration.status, 200);
    assert.equal(registrationBody.workspace_id, "health:owner");
    assert.equal(registrationBody.hermes_workspace_id, "owner");
    assert.equal(registrationBody.status, "active");

    const ownerUser = services.profileService.getUserByWorkspace("health:owner");
    assert.equal(ownerUser.hermes_user_ref, "owner");
    assert.equal(ownerUser.workspace_access_key_hash, sha256("key-owner"));

    const launchResponse = await fetch(`${base}/api/v1/hermes/plugin/launch`, {
      method: "POST",
      headers: { Authorization: "Bearer key-owner", "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "owner", target_workspace_id: "owner" })
    });
    const launchBody = await launchResponse.json();
    assert.equal(launchResponse.status, 200);
    assert.match(launchBody.entry_path, /launch=/);
    assert.doesNotMatch(launchBody.entry_path, /workspace_id=/);
    assert.equal(launchBody.expires_in, 300);
    assert.equal(launchBody.expires_in_seconds, 300);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("launch fails closed for an unregistered workspace", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/v1/hermes/plugin/launch`, {
      method: "POST",
      headers: { Authorization: "Bearer key-test", "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "health:weixin_test_1", hermes_workspace_id: "weixin_test_1" })
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "workspace_not_registered");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("plugin provisioning, launch, and dashboard preserve workspace isolation", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await provision(base, "weixin_owner", "key-owner");
    await provision(base, "weixin_test_1", "key-test");
    const ownerLaunch = await launch(base, "weixin_owner", "key-owner");
    const testLaunch = await launch(base, "weixin_test_1", "key-test");

    assert.match(ownerLaunch.entry_path, /launch=/);
    assert.equal(ownerLaunch.expires_in, 300);
    assert.doesNotMatch(ownerLaunch.entry_path, /key-owner/);
    assert.doesNotMatch(ownerLaunch.entry_path, /workspace_id=/);

    await api(base, "/api/v1/profile", "PUT", "weixin_owner", ownerLaunch, {
      profile: { heightValue: 180, targetWeightValue: 78 }
    });
    await api(base, "/api/v1/body/measurements", "POST", "weixin_owner", ownerLaunch, {
      measuredAt: "2026-06-01T08:00:00+08:00",
      metric: "weight",
      value: 80,
      unit: "kg"
    });

    const ownerDashboard = await api(base, "/api/v1/dashboard", "GET", "weixin_owner", ownerLaunch);
    const ownerDashboardLaunchOnly = await apiWithLaunchOnly(base, "/api/v1/dashboard", "GET", ownerLaunch);
    const testDashboard = await api(base, "/api/v1/dashboard", "GET", "weixin_test_1", testLaunch);

    assert.equal(ownerDashboard.body.latest.weight.value, 80);
    assert.equal(ownerDashboardLaunchOnly.workspace.id, "health:weixin_owner");
    assert.equal(testDashboard.body.latest.weight, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("provisioning stores only key hash and launch rejects Owner key for target workspace", async () => {
  const services = createTestServices();
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await provision(base, "weixin_owner", "key-owner");
    await provision(base, "weixin_test_1", "key-test");
    const targetUser = services.profileService.getUserByWorkspace("health:weixin_test_1");
    assert.equal(targetUser.workspace_access_key_hash, sha256("key-test"));
    assert.notEqual(targetUser.workspace_access_key_hash, "key-test");

    const response = await fetch(`${base}/api/v1/hermes/plugin/launch`, {
      method: "POST",
      headers: { Authorization: "Bearer key-owner", "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "health:weixin_test_1", hermes_workspace_id: "weixin_test_1" })
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "permission_denied");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function provision(base, hermesWorkspaceId, rawKey) {
  const response = await registrationRequest(base, hermesWorkspaceId, rawKey, "registration-key");
  assert.equal(response.status, 200);
  return response.json();
}

async function registrationRequest(base, hermesWorkspaceId, rawKey, registrationKey) {
  return fetch(`${base}/api/v1/hermes/plugin/workspaces`, {
    method: "POST",
    headers: { Authorization: `Bearer ${registrationKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      owner: "hermes",
      workspace_id: `health:${hermesWorkspaceId}`,
      hermes_workspace_id: hermesWorkspaceId,
      display_name: hermesWorkspaceId,
      access_key_hash: sha256(rawKey),
      scopes: ["health:read", "health:write"]
    })
  });
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

async function api(base, path, method, hermesWorkspaceId, launch, body) {
  const url = new URL(`${base}${path}`);
  url.searchParams.set("workspace_id", `health:${hermesWorkspaceId}`);
  url.searchParams.set("launch", new URLSearchParams(launch.entry_path.split("?")[1]).get("launch"));
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function apiWithLaunchOnly(base, path, method, launch, body) {
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

function listen(server) {
  return new Promise((resolve) => server.listen(0, resolve));
}

function countRows(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

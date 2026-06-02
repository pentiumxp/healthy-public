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
    assert.equal(manifest.provisioning.endpoint, "/api/v1/hermes/plugin/workspaces");
    assert.equal(manifest.launch.endpoint, "/api/v1/hermes/plugin/launch");
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
  const response = await fetch(`${base}/api/v1/hermes/plugin/workspaces`, {
    method: "POST",
    headers: { Authorization: "Bearer registration-key", "content-type": "application/json" },
    body: JSON.stringify({
      owner: "hermes",
      workspace_id: `health:${hermesWorkspaceId}`,
      hermes_workspace_id: hermesWorkspaceId,
      display_name: hermesWorkspaceId,
      access_key_hash: sha256(rawKey),
      scopes: ["health:read", "health:write"]
    })
  });
  assert.equal(response.status, 200);
  return response.json();
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

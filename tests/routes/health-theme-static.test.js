const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer } = require("../../src/app/http-server");
const { sha256 } = require("../../src/utils/auth");
const { createTestServices } = require("../test-helpers");

test("health HTML injects bounded launch appearance without URL leakage", async () => {
  const services = createTestServices();
  services.pluginService.provision({
    owner: "hermes",
    workspace_id: "health:owner",
    hermes_workspace_id: "owner",
    display_name: "Owner",
    access_key_hash: sha256("owner-workspace-key"),
    scopes: ["health:read", "health:write"]
  }, "registration-key");
  const server = createServer(services);
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const launchResponse = await fetch(`${base}/api/v1/hermes/plugin/launch`, {
      method: "POST",
      headers: { Authorization: "Bearer owner-workspace-key", "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "health:owner",
        hermes_workspace_id: "owner",
        appearance: { theme: "light", fontSize: "large" }
      })
    });
    const launchBody = await launchResponse.json();
    assert.equal(launchResponse.status, 200);
    assert.doesNotMatch(launchBody.entry_path, /owner-workspace-key|workspace_id=|theme=|fontSize=/);

    const htmlResponse = await fetch(`${base}${launchBody.entry_path}`);
    const html = await htmlResponse.text();
    assert.equal(htmlResponse.status, 200);
    assert.match(html, /window\.__HEALTH_PLUGIN_APPEARANCE__=\{"theme":"light","fontSize":"large"\}/);
    assert.ok(html.indexOf("__HEALTH_PLUGIN_APPEARANCE__") < html.indexOf("var appearance"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("health HTML and theme module are available without launch", async () => {
  const server = createServer(createTestServices());
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const htmlResponse = await fetch(`${base}/health.html`);
    const html = await htmlResponse.text();
    assert.equal(htmlResponse.status, 200);
    assert.match(html, /data-theme="dark"/);
    assert.match(html, /localStorage\.getItem\("hermesWebTheme"\)/);
    assert.match(html, /meta name="theme-color" content="#000000"/);
    assert.match(html, /id="composer"/);
    assert.match(html, /id="messageInput"/);
    assert.match(html, /data-keyboard-input/);
    assert.match(html, /health\.js\?v=20260625-1/);
    assert.doesNotMatch(html, /pendingText|refreshButton|review|待确认数据/);

    const themeResponse = await fetch(`${base}/health-theme.js`);
    const themeJs = await themeResponse.text();
    assert.equal(themeResponse.status, 200);
    assert.match(themeResponse.headers.get("content-type"), /application\/javascript/);
    assert.match(themeJs, /HealthTheme/);

    const strengthResponse = await fetch(`${base}/health-strength.js`);
    const strengthJs = await strengthResponse.text();
    assert.equal(strengthResponse.status, 200);
    assert.match(strengthJs, /HealthStrength/);

    const appleResponse = await fetch(`${base}/health-apple.js`);
    const appleJs = await appleResponse.text();
    assert.equal(appleResponse.status, 200);
    assert.match(appleJs, /HealthApple/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("health UI executes host plugin action routes and posts navigation state", async () => {
  const sandbox = runHealthUi({
    search: "?launch=launch-test&workspace_id=health:test&pluginRoute=medication",
    fetchJson: successPayloads()
  });
  await flushAsync();

  assert.equal(sandbox.document.getElementById("pageTitle").textContent, "\u5f53\u524d\u7528\u836f");
  assert.equal(sandbox.document.getElementById("detailView").classList.has("hidden"), false);
  assert.ok(sandbox.messages.some((message) => message.type === "health.plugin.navigation" && message.canGoBack === true));

  sandbox.dispatchMessage({ type: "hermes.plugin.back" });
  assert.ok(sandbox.messages.some((message) => message.type === "health.plugin.back_result" && message.handled === true));
  assert.equal(sandbox.document.getElementById("pageTitle").textContent, "\u5065\u5eb7");
});

test("health UI emits refresh_required when launch token is missing", async () => {
  const sandbox = runHealthUi({ search: "?workspace_id=health:test", fetchJson: successPayloads() });
  await flushAsync();

  assert.deepEqual(plain(sandbox.messages.filter((message) => message.type === "health.plugin.refresh_required")), [
    { type: "health.plugin.refresh_required", reason: "missing_launch_token" }
  ]);
});

test("health UI emits refresh_required on auth failure without leaking token", async () => {
  const sandbox = runHealthUi({
    search: "?launch=expired-launch&workspace_id=health:test",
    fetchJson: () => ({ ok: false, status: 401, body: { ok: false, error: { code: "launch_token_expired", message: "expired" } } })
  });
  await flushAsync();

  const refreshMessages = sandbox.messages.filter((message) => message.type === "health.plugin.refresh_required");
  assert.deepEqual(plain(refreshMessages), [{ type: "health.plugin.refresh_required", reason: "token_expired" }]);
  assert.doesNotMatch(JSON.stringify(sandbox.messages), /expired-launch/);
});

function runHealthUi({ search, fetchJson }) {
  const messages = [];
  const listeners = {};
  const document = createDocument();
  const sandbox = {
    URLSearchParams,
    location: { search, pathname: "/health.html" },
    window: {
      HealthLabels: labels(),
      HealthApple: { render() {} },
      HealthStrength: { renderList() {} },
      HealthTheme: { applyTheme() {}, applyPluginFontSize() {} },
      addEventListener: (type, handler) => { listeners[type] = handler; },
      parent: { postMessage: (message) => messages.push(message) }
    },
    document,
    fetch: async (url) => {
      const response = fetchJson(url);
      return {
        ok: response.ok,
        status: response.status || (response.ok ? 200 : 500),
        json: async () => response.body
      };
    }
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = document;
  sandbox.window.location = sandbox.location;
  sandbox.window.URLSearchParams = URLSearchParams;
  sandbox.messages = messages;
  sandbox.dispatchMessage = (message) => listeners.message({ data: message });
  vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR, "health.js"), "utf8"), sandbox);
  return sandbox;
}

function successPayloads() {
  const payloads = {
    "/api/v1/dashboard": {
      workspace: { id: "health:test", hermesWorkspaceId: "test" },
      profile: {},
      medications: { activeCount: 1 },
      strength: { weeklyVolumeKg: 0, chart: [] },
      appleHealth: {},
      body: { latest: {} },
      medical: { counts: {} }
    },
    "/api/v1/strength/sessions": { sessions: [] },
    "/api/v1/profile/medications": { medications: [{ name: "Synthetic", status: "active" }] },
    "/api/v1/medical/risk-profiles": { records: [] },
    "/api/v1/medical/lab-results": { records: [] },
    "/api/v1/medical/clinical-events": { records: [] },
    "/api/v1/medical/clinical-findings": { records: [] },
    "/api/v1/medical/recovery-sleep": { records: [] }
  };
  return (url) => {
    const pathname = String(url).split("?")[0];
    return { ok: true, status: 200, body: payloads[pathname] || {} };
  };
}

function labels() {
  return {
    risk: (row) => row.label || row.risk_key || "--",
    status: (value) => value || "--",
    lab: (value) => value || "--",
    medication: (value) => value || "--",
    frequency: (value) => value || ""
  };
}

function createDocument() {
  const ids = [
    "backButton", "medicationButton", "workspaceLabel", "latestStrength",
    "homeView", "detailView", "pageTitle", "heightValue", "targetWeightValue",
    "medicationCount", "weeklyVolume", "strengthChart", "medicalCounts",
    "medicalList", "weightMetric", "fatMetric", "waistMetric", "weightTrend",
    "fatTrend", "waistTrend"
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement("div")]));
  elements.get("backButton").classList.add("hidden");
  elements.get("detailView").classList.add("hidden");
  return {
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, new FakeElement("div"));
      return elements.get(id);
    },
    createElement: (tagName) => new FakeElement(tagName)
  };
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.textContent = "";
    this.type = "";
    this.className = "";
    this.style = {};
    this.classList = new FakeClassList();
  }

  set innerHTML(value) {
    this.children = [];
    this.textContent = value;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  appendChild(node) {
    this.children.push(node);
    return node;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  has(value) { return this.values.has(value); }
}

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

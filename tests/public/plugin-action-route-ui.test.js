const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("health UI executes every host plugin action route with data-present states", async () => {
  const cases = [
    ["record_metric", "\u8eab\u4f53\u6307\u6807", "\u4f53\u91cd"],
    ["trend", "\u8d8b\u52bf", "\u529b\u91cf\u8bad\u7ec3"],
    ["workout", "\u529b\u91cf\u8bad\u7ec3", "\u8bad\u7ec3\u660e\u7ec6"],
    ["report", "\u5065\u5eb7\u6982\u89c8", "Synthetic risk"],
    ["medication", "\u5f53\u524d\u7528\u836f", "Synthetic medication"],
    ["advice", "\u5065\u5eb7\u91cd\u70b9", "Synthetic risk"]
  ];
  for (const [route, title, expectedText] of cases) {
    const sandbox = runHealthUi({
      search: `?launch=launch-test&workspace_id=health:test&pluginRoute=${route}`,
      fetchJson: successPayloads({ empty: false })
    });
    await flushAsync();

    assert.equal(sandbox.document.getElementById("pageTitle").textContent, title, route);
    assert.equal(sandbox.document.getElementById("detailView").classList.has("hidden"), false, route);
    assert.match(collectText(sandbox.document.getElementById("detailView")), new RegExp(expectedText), route);
    assert.ok(sandbox.messages.some((message) => message.type === "health.plugin.navigation" && message.canGoBack === true), route);
  }
});

test("health UI renders explicit empty states for every host plugin action route", async () => {
  const cases = [
    ["record_metric", "\u8eab\u4f53\u6307\u6807", "\u6682\u65e0\u8eab\u4f53\u6307\u6807"],
    ["trend", "\u8d8b\u52bf", "\u6682\u65e0\u8d8b\u52bf\u6570\u636e"],
    ["workout", "\u529b\u91cf\u8bad\u7ec3", "\u6682\u65e0\u529b\u91cf\u8bad\u7ec3\u8bb0\u5f55"],
    ["report", "\u5065\u5eb7\u6982\u89c8", "\u6682\u65e0\u533b\u7597\u65f6\u95f4\u7ebf"],
    ["medication", "\u5f53\u524d\u7528\u836f", "\u6682\u65e0\u7528\u836f\u8bb0\u5f55"],
    ["advice", "\u5065\u5eb7\u91cd\u70b9", "\u6682\u65e0\u5065\u5eb7\u91cd\u70b9"]
  ];
  for (const [route, title, expectedText] of cases) {
    const sandbox = runHealthUi({
      search: `?launch=launch-test&workspace_id=health:test&pluginRoute=${route}`,
      fetchJson: successPayloads({ empty: true })
    });
    await flushAsync();

    assert.equal(sandbox.document.getElementById("pageTitle").textContent, title, route);
    assert.equal(sandbox.document.getElementById("detailView").classList.has("hidden"), false, route);
    assert.match(collectText(sandbox.document.getElementById("detailView")), new RegExp(expectedText), route);
  }
});

test("health UI host back message returns action route detail to home", async () => {
  const sandbox = runHealthUi({
    search: "?launch=launch-test&workspace_id=health:test&pluginRoute=medication",
    fetchJson: successPayloads({ empty: false })
  });
  await flushAsync();

  sandbox.dispatchMessage({ type: "hermes.plugin.back" });
  assert.ok(sandbox.messages.some((message) => message.type === "health.plugin.back_result" && message.handled === true));
  assert.equal(sandbox.document.getElementById("pageTitle").textContent, "\u5065\u5eb7");
});

test("health UI accepts host keyboard viewport state for embedded composer", async () => {
  const sandbox = runHealthUi({
    search: "?launch=launch-test&workspace_id=health:test",
    fetchJson: successPayloads({ empty: false })
  });
  await flushAsync();

  sandbox.dispatchMessage({
    type: "hermes.plugin.viewport",
    reason: "keyboard_visual_harness",
    viewport: { height: 414, layoutHeight: 714 },
    keyboard: { visible: true, bottomInset: 300, height: 300 },
    footer: { safeAreaBottom: 0 }
  });

  assert.equal(typeof sandbox.window.handleHermesPluginViewportMessage, "function");
  assert.equal(sandbox.document.documentElement.classList.has("keyboard-open"), true);
  assert.equal(sandbox.document.documentElement.style.getPropertyValue("--health-composer-bottom"), "300px");
  assert.equal(sandbox.document.documentElement.style.getPropertyValue("--app-height"), "414px");
  assert.deepEqual(plain(sandbox.window.__codexMobileVisualHarness.hostViewport().keyboard), {
    visible: true,
    bottomInset: 300,
    height: 300,
    offsetTop: 0
  });
  assert.equal(sandbox.window.__codexMobileVisualHarness.currentThreadId(), "health-plugin");
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

function successPayloads({ empty = false } = {}) {
  const payloads = {
    "/api/v1/dashboard": {
      workspace: { id: "health:test", hermesWorkspaceId: "test" },
      profile: {},
      medications: { activeCount: 1 },
      strength: { weeklyVolumeKg: empty ? 0 : 1200, chart: [] },
      appleHealth: {},
      body: { latest: empty ? {} : { weight: { value: 72.5, unit: "kg", measured_at: "2026-06-01" } } },
      medical: { counts: {} }
    },
    "/api/v1/strength/sessions": { sessions: empty ? [] : [{ started_at: "2026-06-01T12:00:00.000Z", source_type: "manual", sets: [] }] },
    "/api/v1/profile/medications": { medications: empty ? [] : [{ name: "Synthetic medication", status: "active" }] },
    "/api/v1/medical/risk-profiles": { records: empty ? [] : [{ risk_key: "synthetic", label: "Synthetic risk", status: "active", priority: 1 }] },
    "/api/v1/medical/lab-results": { records: empty ? [] : [{ test_name: "Synthetic lab", value: 1, unit: "u", observed_at: "2026-06-01" }] },
    "/api/v1/medical/clinical-events": { records: empty ? [] : [{ title: "Synthetic event", event_type: "checkup", event_date: "2026-06-01" }] },
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
    "fatTrend", "waistTrend", "composer", "messageInput", "composerSubmit"
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement("div")]));
  elements.get("backButton").classList.add("hidden");
  elements.get("detailView").classList.add("hidden");
  const documentElement = new FakeElement("html");
  return {
    documentElement,
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
    this.style = new FakeStyle();
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

  get firstChild() {
    return this.children[0] || null;
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
  toggle(value, force) {
    const next = force === undefined ? !this.values.has(value) : Boolean(force);
    if (next) this.values.add(value);
    else this.values.delete(value);
    return next;
  }
  has(value) { return this.values.has(value); }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.values.get(name) || "";
  }

  removeProperty(name) {
    this.values.delete(name);
  }
}

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectText(node) {
  return [node.textContent, ...node.children.map(collectText)].filter(Boolean).join(" ");
}

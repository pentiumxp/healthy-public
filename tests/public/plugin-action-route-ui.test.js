"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");

test("health UI consumes host plugin action routes", () => {
  const js = fs.readFileSync(path.join(root, "public", "health.js"), "utf8");
  assert.match(js, /params\.get\("pluginRoute"\)/);
  assert.match(js, /params\.get\("pluginActionId"\)/);
  assert.match(js, /function applyInitialPluginRoute\(\)/);
  assert.match(js, /initialPluginRoute === "medication"/);
  assert.match(js, /initialPluginRoute === "workout"/);
  assert.match(js, /initialPluginRoute === "report"/);
  assert.match(js, /initialPluginRoute === "trend"/);
  assert.match(js, /initialPluginRoute === "record_metric"/);
  assert.match(js, /initialPluginRoute === "advice"/);
});

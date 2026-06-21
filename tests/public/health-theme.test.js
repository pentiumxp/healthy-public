const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("health theme CSS exposes Finance-style dark default with light and system overrides", () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, "health.css"), "utf8");
  assert.match(css, /:root\s*\{/);
  assert.match(css, /color-scheme: dark/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /prefers-color-scheme: light/);
  assert.match(css, /:root\[data-theme="system"\]/);
  assert.match(css, /data-plugin-font-size="large"/);
  assert.match(css, /\.shell\s*\{[\s\S]*?max-width: 720px;[\s\S]*?margin: 0 auto;/);
  assert.match(css, /@media \(min-width: 700px\)/);
  assert.doesNotMatch(css, /max-width: 390px/);
});

test("health theme module applies host appearance and updates meta theme color", () => {
  const state = runThemeScript({
    appearance: { theme: "light", fontSize: "large" },
    storedTheme: "dark",
    storedFontSize: "compact",
    systemLight: false
  });
  assert.equal(state.dataset.theme, "light");
  assert.equal(state.dataset.pluginFontSize, "large");
  assert.equal(state.metaContent, "#f6f8f7");
  assert.equal(state.stored.hermesWebTheme, "dark");
  assert.equal(state.stored.healthPluginFontSize, "compact");
});

test("health theme module falls back to Hermes localStorage when host appearance is absent", () => {
  const state = runThemeScript({
    appearance: {},
    storedTheme: "system",
    storedFontSize: "xlarge",
    systemLight: true
  });
  assert.equal(state.dataset.theme, "system");
  assert.equal(state.dataset.pluginFontSize, "xlarge");
  assert.equal(state.metaContent, "#f6f8f7");
  assert.equal(state.stored.hermesWebTheme, "system");
  assert.equal(state.stored.healthPluginFontSize, "xlarge");
});

function runThemeScript({ appearance, storedTheme, storedFontSize, systemLight }) {
  const code = fs.readFileSync(path.join(PUBLIC_DIR, "health-theme.js"), "utf8");
  const stored = { hermesWebTheme: storedTheme, healthPluginFontSize: storedFontSize };
  const documentElement = { dataset: {} };
  const meta = { content: "", setAttribute(name, value) { if (name === "content") this.content = value; } };
  const sandbox = {
    window: {
      __HEALTH_PLUGIN_APPEARANCE__: appearance,
      matchMedia: () => ({ matches: systemLight })
    },
    document: {
      documentElement,
      querySelector: () => meta
    },
    localStorage: {
      getItem: (key) => stored[key],
      setItem: (key, value) => { stored[key] = value; }
    }
  };
  vm.runInNewContext(code, sandbox);
  return { dataset: documentElement.dataset, metaContent: meta.content, stored };
}

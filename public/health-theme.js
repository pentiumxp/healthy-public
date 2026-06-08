(function () {
  const hostAppearance = window.__HEALTH_PLUGIN_APPEARANCE__ || {};

  function initialTheme() {
    return hostAppearance.theme || localStorage.getItem("hermesWebTheme") || "dark";
  }

  function initialPluginFontSize() {
    return hostAppearance.fontSize || localStorage.getItem("healthPluginFontSize") || "normal";
  }

  function applyPluginFontSize(size) {
    const value = ["compact", "normal", "large", "xlarge"].includes(size) ? size : "normal";
    document.documentElement.dataset.pluginFontSize = value;
    if (!hostAppearance.fontSize) localStorage.setItem("healthPluginFontSize", value);
  }

  function applyTheme(mode) {
    const value = ["system", "light", "dark"].includes(mode) ? mode : "dark";
    document.documentElement.dataset.theme = value;
    if (!hostAppearance.theme) localStorage.setItem("hermesWebTheme", value);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const systemLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    if (metaTheme) metaTheme.setAttribute("content", effectiveLight(value, systemLight) ? "#f6f8f7" : "#000000");
  }

  function effectiveLight(value, systemLight) {
    return value === "light" || (value === "system" && systemLight);
  }

  applyTheme(initialTheme());
  applyPluginFontSize(initialPluginFontSize());
  window.HealthTheme = { applyPluginFontSize, applyTheme };
})();

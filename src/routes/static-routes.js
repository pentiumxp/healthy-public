const fs = require("node:fs");
const { publicPath, serveStatic } = require("./http-utils");

function handleStaticRoute(req, res, url, services = {}) {
  if (req.method !== "GET") return false;
  if (url.pathname === "/" || url.pathname === "/health.html") {
    return serveHealthHtml(res, url, services);
  }
  if (url.pathname === "/health.css") {
    return serveStatic(res, publicPath("health.css"), "text/css; charset=utf-8");
  }
  if (url.pathname === "/health.js") {
    return serveStatic(res, publicPath("health.js"), "application/javascript; charset=utf-8");
  }
  if (url.pathname === "/health-labels.js") {
    return serveStatic(res, publicPath("health-labels.js"), "application/javascript; charset=utf-8");
  }
  if (url.pathname === "/health-cardio.js") {
    return serveStatic(res, publicPath("health-cardio.js"), "application/javascript; charset=utf-8");
  }
  if (url.pathname === "/health-apple.js") {
    return serveStatic(res, publicPath("health-apple.js"), "application/javascript; charset=utf-8");
  }
  if (url.pathname === "/health-theme.js") {
    return serveStatic(res, publicPath("health-theme.js"), "application/javascript; charset=utf-8");
  }
  if (url.pathname === "/health-strength.js") {
    return serveStatic(res, publicPath("health-strength.js"), "application/javascript; charset=utf-8");
  }
  return false;
}

function serveHealthHtml(res, url, services) {
  const filePath = publicPath("health.html");
  if (!fs.existsSync(filePath)) return false;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(renderHealthHtml(fs.readFileSync(filePath, "utf8"), appearanceFromLaunch(url, services)));
  return true;
}

function renderHealthHtml(html, appearance = {}) {
  return html.replace(/    <script>\r?\n      \(function \(\) \{/, (match) => `${healthAppearanceBootstrap(appearance)}${match}`);
}

function healthAppearanceBootstrap(appearance = {}) {
  const theme = ["system", "light", "dark"].includes(appearance.theme) ? appearance.theme : "";
  const fontSize = ["compact", "normal", "large", "xlarge"].includes(appearance.fontSize) ? appearance.fontSize : "";
  const json = JSON.stringify({ ...(theme ? { theme } : {}), ...(fontSize ? { fontSize } : {}) }).replace(/</g, "\\u003c");
  return json === "{}" ? "" : `    <script>window.__HEALTH_PLUGIN_APPEARANCE__=${json};</script>\n`;
}

function appearanceFromLaunch(url, services) {
  const token = url.searchParams.get("launch");
  if (!token || !services.pluginService) return {};
  try {
    return services.pluginService.resolveLaunchToken(token).appearance || {};
  } catch {
    return {};
  }
}

module.exports = { handleStaticRoute, renderHealthHtml };

const { publicPath, serveStatic } = require("./http-utils");

function handleStaticRoute(req, res, url) {
  if (req.method !== "GET") return false;
  if (url.pathname === "/" || url.pathname === "/health.html") {
    return serveStatic(res, publicPath("health.html"), "text/html; charset=utf-8");
  }
  if (url.pathname === "/health.css") {
    return serveStatic(res, publicPath("health.css"), "text/css; charset=utf-8");
  }
  if (url.pathname === "/health.js") {
    return serveStatic(res, publicPath("health.js"), "application/javascript; charset=utf-8");
  }
  return false;
}

module.exports = { handleStaticRoute };


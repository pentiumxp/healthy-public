const http = require("node:http");
const { readEnv } = require("../config/env");
const { createServices } = require("./services");
const { sendError, sendJson } = require("../routes/http-utils");
const { handleHealthRoute } = require("../routes/health-routes");
const { handlePluginRoute } = require("../routes/plugin-routes");
const { handleStaticRoute } = require("../routes/static-routes");

function createServer(services) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (await handlePluginRoute(req, res, url, services)) return;
      if (await handleHealthRoute(req, res, url, services)) return;
      if (handleStaticRoute(req, res, url)) return;
      sendJson(res, 404, { ok: false, error: { code: "not_found" } });
    } catch (error) {
      sendError(res, error);
    }
  });
}

if (require.main === module) {
  const config = readEnv();
  const server = createServer(createServices(config));
  server.listen(config.port, () => {
    console.log(`Healthy listening on http://127.0.0.1:${config.port}`);
  });
}

module.exports = { createServer };


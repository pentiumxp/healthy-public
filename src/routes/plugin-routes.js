const { bearerFrom, readJson, sendJson } = require("./http-utils");

async function handlePluginRoute(req, res, url, services) {
  if (req.method === "GET" && url.pathname === "/api/v1/hermes/plugin/manifest") {
    sendJson(res, 200, services.pluginService.manifest());
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/hermes/plugin/workspaces") {
    const body = await readJson(req);
    sendJson(res, 200, services.pluginService.provision(body, bearerFrom(req.headers)));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/hermes/plugin/launch") {
    const body = await readJson(req);
    sendJson(res, 200, services.pluginService.launch(body, bearerFrom(req.headers)));
    return true;
  }
  return false;
}

module.exports = { handlePluginRoute };


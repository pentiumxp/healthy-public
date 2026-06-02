const { readJson, resolveAccess, sendJson } = require("./http-utils");

async function handleHealthRoute(req, res, url, services) {
  if (req.method === "GET" && url.pathname === "/api/v1/dashboard") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.dashboardService.getDashboard({ workspaceRef }));
    return true;
  }
  if (req.method === "PUT" && url.pathname === "/api/v1/profile") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.profileService.saveProfile({ workspaceRef, profile: body.profile || body }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/strength/sessions") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.strengthService.recordSession({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/strength/sessions") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, { sessions: services.strengthService.listSessions({ workspaceRef }) });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/body/measurements") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.bodyService.recordMeasurement({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/body/measurements") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, { measurements: services.bodyService.listMeasurements({ workspaceRef, metric: url.searchParams.get("metric") }) });
    return true;
  }
  return false;
}

module.exports = { handleHealthRoute };


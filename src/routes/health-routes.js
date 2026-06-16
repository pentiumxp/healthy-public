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
  if (req.method === "GET" && url.pathname === "/api/v1/profile") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.profileService.getProfile({ workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/profile/medications") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, { medications: services.profileService.listActiveMedications({ workspaceRef }) });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/profile/medications") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.profileService.addMedication({ workspaceRef, medication: body.medication || body }));
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
  if (req.method === "PATCH" && url.pathname.startsWith("/api/v1/strength/sessions/")) {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    const sessionId = url.pathname.split("/").pop();
    sendJson(res, 200, services.strengthService.updateSession({ ...body, workspaceRef, sessionId }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/cardio/sessions") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.cardioService.recordSession({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/cardio/sessions") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, { sessions: services.cardioService.listSessions({ workspaceRef }) });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/apple-health/daily-summaries") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.appleHealthService.recordDailySummary({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/apple-health/bulk-sync") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.appleHealthService.bulkSync({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/apple-health/daily-summaries/bulk") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.appleHealthService.recordDailySummaries({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/apple-health/daily-summaries") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.appleHealthService.listDailySummaries({ workspaceRef, limit: url.searchParams.get("limit") }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/apple-health/workouts") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.appleHealthService.recordWorkout({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/v1/apple-health/workouts/bulk") {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.appleHealthService.recordWorkouts({ ...body, workspaceRef }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/apple-health/workouts") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.appleHealthService.listWorkouts({ workspaceRef, limit: url.searchParams.get("limit"), workoutType: url.searchParams.get("workoutType") }));
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/v1/apple-health/ecg-records/by-external-id") {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.appleHealthService.getEcgRecord({ workspaceRef, externalId: url.searchParams.get("externalId") }));
    return true;
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/v1/apple-health/ecg-records/")) {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    const recordId = decodeURIComponent(url.pathname.split("/").pop());
    sendJson(res, 200, services.appleHealthService.getEcgRecord({ workspaceRef, recordId }));
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
  if (req.method === "PATCH" && url.pathname.startsWith("/api/v1/body/measurements/")) {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    const measurementId = url.pathname.split("/").pop();
    sendJson(res, 200, services.bodyService.updateMeasurement({ ...body, workspaceRef, measurementId }));
    return true;
  }
  return false;
}

module.exports = { handleHealthRoute };

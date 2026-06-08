const { readJson, resolveAccess, sendJson } = require("./http-utils");

const ROUTES = {
  "/api/v1/medical/source-documents": "sourceDocuments",
  "/api/v1/medical/lab-results": "labResults",
  "/api/v1/medical/clinical-events": "clinicalEvents",
  "/api/v1/medical/clinical-findings": "clinicalFindings",
  "/api/v1/medical/symptoms": "symptoms",
  "/api/v1/medical/recovery-sleep": "recoverySleepRecords",
  "/api/v1/medical/risk-profiles": "riskProfiles",
  "/api/v1/medical/followup-tasks": "followupTasks"
};

async function handleMedicalRoute(req, res, url, services) {
  const match = matchRoute(url.pathname);
  if (!match) return false;
  if (req.method === "GET" && !match.id) {
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url });
    sendJson(res, 200, services.medicalRecordsService.list(match.kind, { workspaceRef, ...Object.fromEntries(url.searchParams) }));
    return true;
  }
  if (req.method === "POST" && !match.id) {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.medicalRecordsService.record(match.kind, { ...body, workspaceRef }));
    return true;
  }
  if (req.method === "PATCH" && match.id) {
    const body = await readJson(req);
    const workspaceRef = resolveAccess({ pluginService: services.pluginService, req, url, body });
    sendJson(res, 200, services.medicalRecordsService.update(match.kind, { ...body, id: match.id, workspaceRef }));
    return true;
  }
  return false;
}

function matchRoute(pathname) {
  for (const [base, kind] of Object.entries(ROUTES)) {
    if (pathname === base) return { kind };
    if (pathname.startsWith(`${base}/`)) return { kind, id: decodeURIComponent(pathname.slice(base.length + 1)) };
  }
  return null;
}

module.exports = { handleMedicalRoute };

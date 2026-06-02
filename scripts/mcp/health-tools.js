const FORBIDDEN_ARGS = new Set([
  "access_key",
  "accessKey",
  "authorization",
  "bearer",
  "cookie",
  "cookies",
  "launch",
  "launch_token",
  "raw_key",
  "token",
  "workspace",
  "workspace_id",
  "workspaceId"
]);

const TOOLS = [
  tool("mcp_health_records_get_summary", "Return a bounded summary for the configured workspace.", {}),
  tool("mcp_health_profile_get", "Return the configured workspace profile.", {}),
  tool("mcp_health_profile_update", "Create or update profile fields for the configured workspace.", {
    birthDate: stringProp(),
    sex: stringProp(),
    heightValue: numberProp(),
    heightUnit: stringProp(),
    targetWeightValue: numberProp(),
    targetWeightUnit: stringProp(),
    trainingGoal: stringProp(),
    activityLevel: stringProp()
  }),
  tool("mcp_health_medications_list", "List active medications for the configured workspace.", {}),
  tool("mcp_health_medication_add", "Add one medication for the configured workspace.", {
    name: stringProp(true),
    doseValue: numberProp(),
    doseUnit: stringProp(),
    frequency: stringProp(),
    startedAt: stringProp(),
    endedAt: stringProp(),
    status: stringProp(),
    notes: stringProp()
  }, ["name"]),
  tool("mcp_health_strength_sessions_list", "List strength sessions for the configured workspace.", {}),
  tool("mcp_health_strength_session_record", "Record a strength training session.", {
    startedAt: stringProp(true),
    endedAt: stringProp(),
    durationMinutes: numberProp(),
    sessionRpe: numberProp(),
    location: stringProp(),
    notes: stringProp(),
    sourceType: stringProp(),
    sets: { type: "array", minItems: 1, items: { type: "object", additionalProperties: true } }
  }, ["startedAt", "sets"]),
  tool("mcp_health_strength_session_update", "Update strength session metadata.", {
    sessionId: stringProp(true),
    startedAt: stringProp(),
    endedAt: nullableStringProp(),
    durationMinutes: nullableNumberProp(),
    sessionRpe: nullableNumberProp(),
    location: nullableStringProp(),
    notes: nullableStringProp(),
    sourceType: stringProp()
  }, ["sessionId"]),
  tool("mcp_health_body_measurements_list", "List body measurements, optionally filtered by metric.", { metric: stringProp() }),
  tool("mcp_health_body_measurement_record", "Record one body measurement.", {
    measuredAt: stringProp(true),
    metric: stringProp(true),
    value: numberProp(true),
    unit: stringProp(),
    bodyPart: stringProp(),
    sourceType: stringProp(),
    confirmationStatus: stringProp(),
    confidence: numberProp(),
    notes: stringProp()
  }, ["measuredAt", "metric", "value"]),
  tool("mcp_health_body_measurement_update", "Update one body measurement.", {
    measurementId: stringProp(true),
    measuredAt: stringProp(),
    metric: stringProp(),
    value: numberProp(),
    unit: stringProp(),
    bodyPart: nullableStringProp(),
    sourceType: stringProp(),
    confirmationStatus: stringProp(),
    confidence: nullableNumberProp(),
    notes: nullableStringProp()
  }, ["measurementId"]),
  tool("mcp_health_metrics_trends", "Return bounded strength and body metric trend data.", { metric: stringProp() })
];

async function callTool(request, client) {
  const name = request.params && request.params.name;
  const args = (request.params && request.params.arguments) || {};
  if (!TOOLS.some((item) => item.name === name)) return error(request, -32602, "unknown tool");
  try {
    assertNoForbiddenArgs(args);
    const result = await dispatch(name, args, client);
    return ok(request, result);
  } catch (err) {
    return error(request, -32000, err.code || err.message || "health tool failed");
  }
}

async function dispatch(name, args, client) {
  if (name === "mcp_health_records_get_summary") return summarizeDashboard(await client.getDashboard());
  if (name === "mcp_health_profile_get") return boundProfile(await client.getProfile());
  if (name === "mcp_health_profile_update") return boundProfile(await client.updateProfile(args));
  if (name === "mcp_health_medications_list") return await client.listMedications();
  if (name === "mcp_health_medication_add") return await client.addMedication(args);
  if (name === "mcp_health_strength_sessions_list") return await client.listStrengthSessions();
  if (name === "mcp_health_strength_session_record") return await client.recordStrengthSession(args);
  if (name === "mcp_health_strength_session_update") {
    const { sessionId, ...patch } = args;
    return await client.updateStrengthSession(sessionId, patch);
  }
  if (name === "mcp_health_body_measurements_list") return await client.listBodyMeasurements(args);
  if (name === "mcp_health_body_measurement_record") return await client.recordBodyMeasurement(args);
  if (name === "mcp_health_body_measurement_update") {
    const { measurementId, ...patch } = args;
    return await client.updateBodyMeasurement(measurementId, patch);
  }
  if (name === "mcp_health_metrics_trends") return trends(await client.getDashboard(), await client.listBodyMeasurements(args));
  throw new Error("unknown tool");
}

function summarizeDashboard(data) {
  return {
    ok: true,
    workspace_id: data.workspace && data.workspace.id,
    summary: {
      strength_sessions: data.strength && data.strength.sessionCount,
      weekly_volume_kg: data.strength && data.strength.weeklyVolumeKg,
      latest_body_metrics: data.body && data.body.latest,
      pending_review: data.pendingReview
    },
    warnings: []
  };
}

function trends(dashboard, measurements) {
  return {
    ok: true,
    workspace_id: dashboard.workspace && dashboard.workspace.id,
    strength: dashboard.strength,
    body: { latest: dashboard.body && dashboard.body.latest, measurements: measurements.measurements || [] },
    warnings: []
  };
}

function boundProfile(data) {
  return { ok: true, workspace_id: data.user.workspace_ref, profile: data.profile };
}

function assertNoForbiddenArgs(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_ARGS.has(key)) throw Object.assign(new Error("workspace or credential override is not allowed"), { code: "forbidden_argument" });
    if (nested && typeof nested === "object") assertNoForbiddenArgs(nested);
  }
}

function ok(request, payload) {
  return { jsonrpc: "2.0", id: request.id, result: { content: [{ type: "text", text: JSON.stringify(payload) }] } };
}

function error(request, code, message) {
  return { jsonrpc: "2.0", id: request.id, error: { code, message } };
}

function tool(name, description, properties, required = []) {
  return { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false } };
}

function stringProp(required = false) {
  return required ? { type: "string", minLength: 1 } : { type: "string" };
}

function nullableStringProp() {
  return { type: ["string", "null"] };
}

function numberProp(required = false) {
  return required ? { type: "number" } : { type: "number" };
}

function nullableNumberProp() {
  return { type: ["number", "null"] };
}

module.exports = { TOOLS, callTool };

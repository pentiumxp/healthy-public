const { assertCleanText } = require("./text-integrity");
const { cardioActivityCatalog, strengthExerciseCatalog } = require("../../src/services/training/training-catalog");

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
  tool("mcp_health_strength_exercise_catalog_list", "List supported strength exercise canonical keys and aliases. Use this before writing OCR/model-parsed workout data.", {}),
  tool("mcp_health_strength_sessions_list", "List strength sessions for the configured workspace.", {}),
  tool("mcp_health_strength_session_record", "Record a strength training session. Use set.exercise.key when possible; recognized aliases are normalized, unknown exercises fail with unsupported_exercise.", {
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
  tool("mcp_health_cardio_activity_catalog_list", "List supported cardio activity canonical keys and aliases. Use this before writing OCR/model-parsed workout data.", {}),
  tool("mcp_health_cardio_sessions_list", "List cardio/aerobic workout sessions for the configured workspace.", {}),
  tool("mcp_health_cardio_session_record", "Record a cardio/aerobic workout session. Use this for indoor_walk, elliptical, run, cycling, rowing, and outdoor_walk instead of clinical_event.", cardioProps(), ["startedAt", "activityType"]),
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
  tool("mcp_health_metrics_trends", "Return bounded strength and body metric trend data.", { metric: stringProp() }),
  tool("mcp_health_source_document_record", "Record bounded source document metadata without raw report content.", {
    title: stringProp(true), documentType: stringProp(true), documentDate: stringProp(), sourceRef: stringProp(), sourceHash: stringProp(), privacyLevel: stringProp(), summary: stringProp(), metadata: objectProp()
  }, ["title", "documentType"]),
  tool("mcp_health_source_documents_list", "List source document metadata timeline.", { documentType: stringProp() }),
  tool("mcp_health_lab_result_record", "Record one lab result in the workspace timeline.", labProps(), ["observedAt", "testName"]),
  tool("mcp_health_lab_results_list", "List lab result timeline, optionally filtered by testName or panel.", { testName: stringProp(), panel: stringProp() }),
  tool("mcp_health_lab_result_update", "Update one lab result.", { id: stringProp(true), ...labProps() }, ["id"]),
  tool("mcp_health_clinical_event_record", "Record one clinical event such as a checkup or imaging exam. Do not use for strength or cardio workouts; use the training tools instead.", clinicalEventProps(), ["eventDate", "eventType", "title"]),
  tool("mcp_health_clinical_events_list", "List clinical event timeline.", { eventType: stringProp() }),
  tool("mcp_health_clinical_finding_record", "Record one structured clinical finding.", findingProps(), ["findingKey", "title"]),
  tool("mcp_health_clinical_findings_list", "List clinical finding timeline.", { findingKey: stringProp(), status: stringProp() }),
  tool("mcp_health_symptom_record", "Record one symptom observation.", symptomProps(), ["observedAt", "symptomKey"]),
  tool("mcp_health_symptoms_list", "List symptom timeline.", { symptomKey: stringProp(), status: stringProp() }),
  tool("mcp_health_recovery_sleep_record", "Record one sleep or recovery observation.", sleepProps(), ["sleepStart"]),
  tool("mcp_health_recovery_sleep_list", "List sleep and recovery timeline.", { sourceType: stringProp() }),
  tool("mcp_health_risk_profile_record", "Record one risk profile assessment without overwriting prior assessments.", riskProps(), ["assessedAt", "riskKey", "label"]),
  tool("mcp_health_risk_profiles_list", "List risk profile assessment timeline.", { riskKey: stringProp(), status: stringProp() }),
  tool("mcp_health_followup_task_create", "Create one follow-up task.", followupProps(), ["title"]),
  tool("mcp_health_followup_tasks_list", "List follow-up task timeline.", { status: stringProp(), category: stringProp() }),
  tool("mcp_health_followup_task_update", "Update one follow-up task.", { id: stringProp(true), ...followupProps() }, ["id"])
];

async function callTool(request, client) {
  const name = request.params && request.params.name;
  const args = (request.params && request.params.arguments) || {};
  if (!TOOLS.some((item) => item.name === name)) return error(request, -32602, "unknown tool");
  try {
    assertNoForbiddenArgs(args);
    assertCleanText(args, "tool.arguments");
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
  if (name === "mcp_health_strength_exercise_catalog_list") return { records: strengthExerciseCatalog() };
  if (name === "mcp_health_strength_sessions_list") return await client.listStrengthSessions();
  if (name === "mcp_health_strength_session_record") return await client.recordStrengthSession(args);
  if (name === "mcp_health_strength_session_update") {
    const { sessionId, ...patch } = args;
    return await client.updateStrengthSession(sessionId, patch);
  }
  if (name === "mcp_health_cardio_activity_catalog_list") return { records: cardioActivityCatalog() };
  if (name === "mcp_health_cardio_sessions_list") return await client.listCardioSessions();
  if (name === "mcp_health_cardio_session_record") return await client.createCardioSession(args);
  if (name === "mcp_health_body_measurements_list") return await client.listBodyMeasurements(args);
  if (name === "mcp_health_body_measurement_record") return await client.recordBodyMeasurement(args);
  if (name === "mcp_health_body_measurement_update") {
    const { measurementId, ...patch } = args;
    return await client.updateBodyMeasurement(measurementId, patch);
  }
  if (name === "mcp_health_metrics_trends") return trends(await client.getDashboard(), await client.listBodyMeasurements(args));
  const medical = medicalTool(name);
  if (medical && medical.action === "record") return await client.createMedicalRecord(medical.path, args);
  if (medical && medical.action === "list") return await client.listMedicalRecords(medical.path, args);
  if (medical && medical.action === "update") {
    const { id, ...patch } = args;
    return await client.updateMedicalRecord(medical.path, id, patch);
  }
  throw new Error("unknown tool");
}

function medicalTool(name) {
  const map = {
    mcp_health_source_document_record: ["source-documents", "record"],
    mcp_health_source_documents_list: ["source-documents", "list"],
    mcp_health_lab_result_record: ["lab-results", "record"],
    mcp_health_lab_results_list: ["lab-results", "list"],
    mcp_health_lab_result_update: ["lab-results", "update"],
    mcp_health_clinical_event_record: ["clinical-events", "record"],
    mcp_health_clinical_events_list: ["clinical-events", "list"],
    mcp_health_clinical_finding_record: ["clinical-findings", "record"],
    mcp_health_clinical_findings_list: ["clinical-findings", "list"],
    mcp_health_symptom_record: ["symptoms", "record"],
    mcp_health_symptoms_list: ["symptoms", "list"],
    mcp_health_recovery_sleep_record: ["recovery-sleep", "record"],
    mcp_health_recovery_sleep_list: ["recovery-sleep", "list"],
    mcp_health_risk_profile_record: ["risk-profiles", "record"],
    mcp_health_risk_profiles_list: ["risk-profiles", "list"],
    mcp_health_followup_task_create: ["followup-tasks", "record"],
    mcp_health_followup_tasks_list: ["followup-tasks", "list"],
    mcp_health_followup_task_update: ["followup-tasks", "update"]
  };
  return map[name] && { path: map[name][0], action: map[name][1] };
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

function objectProp() {
  return { type: "object", additionalProperties: true };
}

function labProps() {
  return { observedAt: stringProp(true), panel: stringProp(), testName: stringProp(true), testCode: stringProp(), value: numberProp(), unit: stringProp(), referenceLow: numberProp(), referenceHigh: numberProp(), referenceText: stringProp(), flag: stringProp(), sourceDocumentId: stringProp(), notes: stringProp() };
}

function cardioProps() {
  return { startedAt: stringProp(true), endedAt: stringProp(), activityType: stringProp(true), durationSeconds: numberProp(), distanceValue: numberProp(), distanceUnit: stringProp(), distanceKm: numberProp(), activeEnergyKcal: numberProp(), totalEnergyKcal: numberProp(), elevationGainM: numberProp(), averageHeartRateBpm: numberProp(), averagePaceSecondsPerKm: numberProp(), perceivedExertion: numberProp(), sourceType: stringProp(), sourceDocumentId: stringProp(), notes: stringProp() };
}

function clinicalEventProps() {
  return { eventDate: stringProp(true), eventType: stringProp(true), title: stringProp(true), institution: stringProp(), summary: stringProp(), sourceDocumentId: stringProp(), confidence: numberProp(), metadata: objectProp() };
}

function findingProps() {
  return { findingKey: stringProp(true), title: stringProp(true), status: stringProp(), severity: stringProp(), bodySite: stringProp(), onsetDate: stringProp(), observedAt: stringProp(), evidence: stringProp(), sourceEventId: stringProp(), sourceDocumentId: stringProp(), confidence: numberProp(), notes: stringProp() };
}

function symptomProps() {
  return { observedAt: stringProp(true), symptomKey: stringProp(true), severity: numberProp(), duration: stringProp(), frequency: stringProp(), status: stringProp(), notes: stringProp(), sourceDocumentId: stringProp() };
}

function sleepProps() {
  return { sleepStart: stringProp(true), sleepEnd: stringProp(), totalSleepMinutes: numberProp(), remMinutes: numberProp(), deepSleepMinutes: numberProp(), hrvMs: numberProp(), restingHeartRate: numberProp(), recoveryScore: numberProp(), sourceType: stringProp(), notes: stringProp() };
}

function riskProps() {
  return { assessedAt: stringProp(true), riskKey: stringProp(true), label: stringProp(true), priority: numberProp(), status: stringProp(), confidence: stringProp(), summary: stringProp(), evidence: stringProp() };
}

function followupProps() {
  return { title: stringProp(true), category: stringProp(), priority: numberProp(), status: stringProp(), dueDate: stringProp(), notes: stringProp(), sourceDocumentId: stringProp() };
}

module.exports = { TOOLS, callTool };

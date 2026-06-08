const { inputError } = require("../../utils/errors");
const { assertCleanText } = require("../../utils/text-integrity");

const DEFINITIONS = {
  sourceDocuments: {
    required: ["title", "documentType"],
    map: { documentType: "document_type", documentDate: "document_date", sourceRef: "source_ref", sourceHash: "source_hash", privacyLevel: "privacy_level", metadata: "metadata_json" }
  },
  labResults: {
    required: ["observedAt", "testName"],
    map: { observedAt: "observed_at", testName: "test_name", testCode: "test_code", referenceLow: "reference_low", referenceHigh: "reference_high", referenceText: "reference_text", sourceDocumentId: "source_document_id" }
  },
  clinicalEvents: {
    required: ["eventDate", "eventType", "title"],
    map: { eventDate: "event_date", eventType: "event_type", sourceDocumentId: "source_document_id", metadata: "metadata_json" }
  },
  clinicalFindings: {
    required: ["findingKey", "title"],
    map: { findingKey: "finding_key", bodySite: "body_site", onsetDate: "onset_date", observedAt: "observed_at", sourceEventId: "source_event_id", sourceDocumentId: "source_document_id" }
  },
  symptoms: {
    required: ["observedAt", "symptomKey"],
    map: { observedAt: "observed_at", symptomKey: "symptom_key", sourceDocumentId: "source_document_id" }
  },
  recoverySleepRecords: {
    required: ["sleepStart"],
    map: { sleepStart: "sleep_start", sleepEnd: "sleep_end", totalSleepMinutes: "total_sleep_minutes", remMinutes: "rem_minutes", deepSleepMinutes: "deep_sleep_minutes", hrvMs: "hrv_ms", restingHeartRate: "resting_heart_rate", recoveryScore: "recovery_score", sourceType: "source_type" }
  },
  riskProfiles: {
    required: ["assessedAt", "riskKey", "label"],
    map: { assessedAt: "assessed_at", riskKey: "risk_key" }
  },
  followupTasks: {
    required: ["title"],
    map: { dueDate: "due_date", sourceDocumentId: "source_document_id" }
  }
};

function createMedicalRecordsService({ profileService, medicalRecordsRepository }) {
  function record(kind, input) {
    assertCleanText(input, kind);
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const def = definition(kind);
    return medicalRecordsRepository.insert(medicalRecordsRepository.tables[kind], user.id, normalize(def, input));
  }

  function update(kind, input) {
    assertCleanText(input, kind);
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    if (!input.id) throw inputError("id is required");
    const row = medicalRecordsRepository.update(medicalRecordsRepository.tables[kind], user.id, input.id, normalize(definition(kind), input, true));
    if (!row) throw inputError("record is not found", "record_not_found");
    return row;
  }

  function list(kind, input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return { records: medicalRecordsRepository.list(medicalRecordsRepository.tables[kind], user.id, normalizeFilters(definition(kind), input)) };
  }

  function normalize(def, input, partial = false) {
    for (const key of partial ? [] : def.required) {
      if (input[key] == null || input[key] === "") throw inputError(`${key} is required`);
    }
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      if (["workspaceRef", "id"].includes(key) || value === undefined) continue;
      const column = def.map[key] || key;
      out[column] = column.endsWith("_json") ? JSON.stringify(value || {}) : value;
    }
    return out;
  }

  function normalizeFilters(def, input) {
    const filters = {};
    for (const [key, value] of Object.entries(input || {})) {
      if (["workspaceRef", "workspace_id", "workspaceId", "workspace", "launch", "embed", "id"].includes(key) || value == null || value === "") continue;
      filters[def.map[key] || key] = value;
    }
    return filters;
  }

  function definition(kind) {
    if (!DEFINITIONS[kind]) throw inputError("unsupported medical record kind", "unsupported_record_kind");
    return DEFINITIONS[kind];
  }

  return { list, record, update };
}

module.exports = { createMedicalRecordsService };

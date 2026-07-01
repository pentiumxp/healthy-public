function createHealthClient(context) {
  async function request(method, path, body, query = {}) {
    const url = new URL(path, context.baseUrl);
    url.searchParams.set("workspace_id", context.workspaceId);
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${context.accessKey}`,
        ...(body ? { "content-type": "application/json; charset=utf-8" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      const code = data.error && data.error.code ? data.error.code : "health_api_error";
      throw Object.assign(new Error(code), { code, data });
    }
    return data;
  }

  return {
    addMedication: (medication) => request("POST", "/api/v1/profile/medications", medication),
    bulkSyncAppleHealth: (payload) => request("POST", "/api/v1/apple-health/bulk-sync", payload),
    getAppleHealthGuardianStatus: () => request("GET", "/api/v1/apple-health/guardian-status"),
    getAppleHealthSyncState: () => request("GET", "/api/v1/apple-health/sync-state"),
    incrementalSyncAppleHealth: (payload) => request("POST", "/api/v1/apple-health/incremental-sync", payload),
    createAppleDailySummary: (record) => request("POST", "/api/v1/apple-health/daily-summaries", record),
    createAppleDailySummaries: (records) => request("POST", "/api/v1/apple-health/daily-summaries/bulk", records),
    createAppleWorkout: (record) => request("POST", "/api/v1/apple-health/workouts", record),
    createAppleWorkouts: (records) => request("POST", "/api/v1/apple-health/workouts/bulk", records),
    createCardioSession: (session) => request("POST", "/api/v1/cardio/sessions", session),
    createMedicalRecord: (kind, record) => request("POST", `/api/v1/medical/${kind}`, record),
    getAppleEcgRecord: (args) => args.recordId
      ? request("GET", `/api/v1/apple-health/ecg-records/${encodeURIComponent(args.recordId)}`)
      : request("GET", "/api/v1/apple-health/ecg-records/by-external-id", null, { externalId: args.externalId }),
    getDashboard: () => request("GET", "/api/v1/dashboard"),
    getProfile: () => request("GET", "/api/v1/profile"),
    listMedicalRecords: (kind, query) => request("GET", `/api/v1/medical/${kind}`, null, query),
    listBodyMeasurements: (args) => request("GET", "/api/v1/body/measurements", null, { metric: args.metric }),
    listCardioSessions: () => request("GET", "/api/v1/cardio/sessions"),
    listAppleDailySummaries: (args) => request("GET", "/api/v1/apple-health/daily-summaries", null, args),
    listAppleEcgRecords: (args) => request("GET", "/api/v1/apple-health/ecg-records", null, args),
    listAppleImportFiles: (args) => request("GET", "/api/v1/apple-health/import-files", null, args),
    listAppleObservations: (args) => request("GET", "/api/v1/apple-health/observations", null, args),
    listAppleRoutePoints: (args) => request("GET", "/api/v1/apple-health/route-points", null, args),
    listAppleSleepRecords: (args) => request("GET", "/api/v1/apple-health/sleep-records", null, args),
    listAppleWorkouts: (args) => request("GET", "/api/v1/apple-health/workouts", null, args),
    listMedications: () => request("GET", "/api/v1/profile/medications"),
    listStrengthSessions: () => request("GET", "/api/v1/strength/sessions"),
    recordBodyMeasurement: (measurement) => request("POST", "/api/v1/body/measurements", measurement),
    recordStrengthSession: (session) => request("POST", "/api/v1/strength/sessions", session),
    updateBodyMeasurement: (id, patch) => request("PATCH", `/api/v1/body/measurements/${encodeURIComponent(id)}`, patch),
    updateMedicalRecord: (kind, id, patch) => request("PATCH", `/api/v1/medical/${kind}/${encodeURIComponent(id)}`, patch),
    updateProfile: (profile) => request("PUT", "/api/v1/profile", { profile }),
    updateStrengthSession: (id, patch) => request("PATCH", `/api/v1/strength/sessions/${encodeURIComponent(id)}`, patch)
  };
}

module.exports = { createHealthClient };

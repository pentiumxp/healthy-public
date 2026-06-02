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
        ...(body ? { "content-type": "application/json" } : {})
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
    getDashboard: () => request("GET", "/api/v1/dashboard"),
    getProfile: () => request("GET", "/api/v1/profile"),
    listBodyMeasurements: (args) => request("GET", "/api/v1/body/measurements", null, { metric: args.metric }),
    listMedications: () => request("GET", "/api/v1/profile/medications"),
    listStrengthSessions: () => request("GET", "/api/v1/strength/sessions"),
    recordBodyMeasurement: (measurement) => request("POST", "/api/v1/body/measurements", measurement),
    recordStrengthSession: (session) => request("POST", "/api/v1/strength/sessions", session),
    updateBodyMeasurement: (id, patch) => request("PATCH", `/api/v1/body/measurements/${encodeURIComponent(id)}`, patch),
    updateProfile: (profile) => request("PUT", "/api/v1/profile", { profile }),
    updateStrengthSession: (id, patch) => request("PATCH", `/api/v1/strength/sessions/${encodeURIComponent(id)}`, patch)
  };
}

module.exports = { createHealthClient };

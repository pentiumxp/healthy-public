function createDashboardService({ profileService, strengthService, cardioService, bodyService, medicalRecordsService, appleHealthService }) {
  function getDashboard(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const strengthSessions = strengthService.listSessions({ workspaceRef: user.workspace_ref });
    const cardioSessions = cardioService ? cardioService.listSessions({ workspaceRef: user.workspace_ref }) : [];
    const bodyMeasurements = bodyService.listMeasurements({ workspaceRef: user.workspace_ref });
    const medications = profileService.listActiveMedications({ workspaceRef: user.workspace_ref });
    return {
      workspace: {
        id: user.workspace_ref,
        hermesWorkspaceId: user.hermes_user_ref,
        displayName: user.display_name || user.workspace_ref,
        isolated: true
      },
      profile: summarizeProfile(profileService, user),
      medications: { activeCount: medications.length },
      strength: summarizeStrength(strengthSessions),
      cardio: summarizeCardio(cardioSessions),
      appleHealth: appleHealthService ? summarizeAppleHealth(appleHealthService.getSnapshot({ workspaceRef: user.workspace_ref }), medicalRecordsService, user.workspace_ref) : {},
      body: summarizeBody(bodyMeasurements),
      medical: summarizeMedical(medicalRecordsService, user.workspace_ref),
      pendingReview: bodyMeasurements.filter((item) => item.confirmation_status === "pending").length
    };
  }

  return { getDashboard };
}

function summarizeAppleHealth(snapshot, medicalRecordsService, workspaceRef) {
  const sleep = medicalRecordsService ? medicalRecordsService.list("recoverySleepRecords", { workspaceRef }).records : [];
  return {
    latestDaily: snapshot.latestDaily,
    daily: snapshot.daily,
    workouts: snapshot.workouts,
    sleep: snapshot.sleep || sleep.slice(0, 8),
    latestSleep: snapshot.latestSleep || sleep[0] || null
  };
}

function summarizeCardio(sessions) {
  return {
    latestSession: sessions[0] || null,
    sessionCount: sessions.length,
    totalDistanceKm: round(sessions.reduce((total, session) => total + (session.distance_km || 0), 0), 2),
    totalDurationMinutes: Math.round(sessions.reduce((total, session) => total + (session.duration_seconds || 0), 0) / 60),
    recentSessions: sessions.slice(0, 6)
  };
}

function summarizeMedical(service, workspaceRef) {
  if (!service) return {};
  const labResults = service.list("labResults", { workspaceRef }).records;
  const clinicalEvents = service.list("clinicalEvents", { workspaceRef }).records;
  const clinicalFindings = service.list("clinicalFindings", { workspaceRef }).records;
  const riskProfiles = service.list("riskProfiles", { workspaceRef }).records;
  const followupTasks = service.list("followupTasks", { workspaceRef, status: "open" }).records;
  return {
    counts: {
      labResults: labResults.length,
      clinicalEvents: clinicalEvents.length,
      clinicalFindings: clinicalFindings.length,
      riskProfiles: riskProfiles.length,
      openFollowups: followupTasks.length
    },
    latestLabs: labResults.slice(0, 4).map((row) => ({
      observedAt: row.observed_at,
      testName: row.test_name,
      value: row.value,
      unit: row.unit,
      flag: row.flag
    })),
    topRisks: riskProfiles.slice(0, 4).map((row) => ({
      assessedAt: row.assessed_at,
      label: row.label,
      priority: row.priority,
      status: row.status
    }))
  };
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeProfile(profileService, user) {
  const { profile } = profileService.getProfile({ workspaceRef: user.workspace_ref });
  return profile || {};
}

function summarizeStrength(sessions) {
  const weeklyVolumeKg = sessions.reduce((total, session) => {
    return total + session.sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0);
  }, 0);
  return {
    latestSession: sessions[0] || null,
    sessionCount: sessions.length,
    weeklyVolumeKg: Math.round(weeklyVolumeKg),
    chart: sessions.slice(0, 6).reverse().map((session) => ({
      date: session.started_at.slice(5, 10),
      volumeKg: Math.round(session.sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0))
    }))
  };
}

function summarizeBody(measurements) {
  const latest = {};
  for (const item of measurements.filter((row) => row.confirmation_status === "confirmed")) {
    latest[item.metric] = item;
  }
  return {
    latest,
    trends: ["weight", "body_fat_percentage", "skeletal_muscle_mass"].map((metric) => ({
      metric,
      points: measurements.filter((item) => item.metric === metric).slice(-8).map((item) => ({
        date: item.measured_at.slice(5, 10),
        value: item.value,
        unit: item.unit
      }))
    }))
  };
}

module.exports = { createDashboardService };

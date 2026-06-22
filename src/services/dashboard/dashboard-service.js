function createDashboardService({ profileService, strengthService, cardioService, bodyService, medicalRecordsService, appleHealthService }) {
  function getDashboard(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const strengthSessions = strengthService.listSessions({ workspaceRef: user.workspace_ref });
    const cardioSessions = cardioService ? cardioService.listSessions({ workspaceRef: user.workspace_ref }) : [];
    const bodyMeasurements = bodyService.listMeasurements({ workspaceRef: user.workspace_ref });
    const medications = profileService.listActiveMedications({ workspaceRef: user.workspace_ref });
    const appleHealthSnapshot = appleHealthService ? appleHealthService.getSnapshot({ workspaceRef: user.workspace_ref }) : null;
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
      cardio: summarizeCardio(cardioSessions, appleHealthSnapshot ? appleHealthSnapshot.workouts : []),
      appleHealth: appleHealthSnapshot ? summarizeAppleHealth(appleHealthSnapshot, medicalRecordsService, user.workspace_ref) : {},
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
    latestSleep: snapshot.latestSleep || sleep[0] || null,
    ecg: snapshot.ecg || [],
    latestEcg: snapshot.latestEcg || null
  };
}

function summarizeCardio(sessions, appleWorkouts = []) {
  const manualSessions = sessions.map((session) => ({ ...session, record_domain: "cardio_session" }));
  const appleSessions = appleWorkouts.map(normalizeAppleWorkoutForCardio);
  const combined = [...manualSessions, ...appleSessions].sort((a, b) => String(b.started_at || "").localeCompare(String(a.started_at || "")));
  return {
    latestSession: combined[0] || null,
    sessionCount: combined.length,
    manualSessionCount: sessions.length,
    appleHealthWorkoutCount: appleSessions.length,
    sourceCounts: {
      manual_cardio_sessions: sessions.length,
      apple_health_workouts: appleSessions.length
    },
    totalDistanceKm: round(combined.reduce((total, session) => total + (session.distance_km || 0), 0), 2),
    totalDurationMinutes: Math.round(combined.reduce((total, session) => total + (session.duration_seconds || 0), 0) / 60),
    recentSessions: combined.slice(0, 8)
  };
}

function normalizeAppleWorkoutForCardio(workout) {
  return {
    id: workout.id,
    record_domain: "apple_health_workout",
    started_at: workout.started_at,
    ended_at: workout.ended_at,
    activity_type: workout.normalized_activity_type || workout.apple_activity_type || "other",
    apple_activity_type: workout.apple_activity_type,
    duration_seconds: workout.duration_seconds,
    distance_km: workout.distance_m == null ? null : workout.distance_m / 1000,
    active_energy_kcal: workout.active_energy_kcal,
    total_energy_kcal: workout.total_energy_kcal,
    average_heart_rate_bpm: workout.average_heart_rate_bpm || (workout.heart_rate_summary && workout.heart_rate_summary.average_heart_rate_bpm) || null,
    elevation_gain_m: workout.elevation_gain_m,
    elevation_loss_m: workout.elevation_loss_m,
    source_name: workout.source_name,
    source_bundle_identifier: workout.source_bundle_identifier,
    device_name: workout.device_name,
    device_manufacturer: workout.device_manufacturer,
    device_model: workout.device_model,
    heart_rate_summary: workout.heart_rate_summary || null,
    heart_rate_samples: workout.heart_rate_samples || []
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

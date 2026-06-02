function createDashboardService({ profileService, strengthService, bodyService }) {
  function getDashboard(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const strengthSessions = strengthService.listSessions({ workspaceRef: user.workspace_ref });
    const bodyMeasurements = bodyService.listMeasurements({ workspaceRef: user.workspace_ref });
    return {
      workspace: {
        id: user.workspace_ref,
        hermesWorkspaceId: user.hermes_user_ref,
        displayName: user.display_name || user.workspace_ref,
        isolated: true
      },
      profile: summarizeProfile(profileService, user),
      strength: summarizeStrength(strengthSessions),
      body: summarizeBody(bodyMeasurements),
      pendingReview: bodyMeasurements.filter((item) => item.confirmation_status === "pending").length
    };
  }

  return { getDashboard };
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

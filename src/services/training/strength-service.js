const { inputError } = require("../../utils/errors");
const { requireIsoDateTime } = require("../../utils/time");
const { normalizeWeight } = require("../../utils/units");

function createStrengthService({ profileService, trainingRepository, db }) {
  function recordSession(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const sets = input.sets || [];
    if (!Array.isArray(sets) || sets.length === 0) {
      throw inputError("sets are required");
    }
    const startedAt = requireIsoDateTime(input.startedAt, "startedAt");
    const tx = db.prepare("SELECT 1");
    tx.get();
    db.exec("BEGIN");
    try {
      const session = trainingRepository.createSession(user.id, {
        startedAt,
        endedAt: input.endedAt ? requireIsoDateTime(input.endedAt, "endedAt") : null,
        durationMinutes: input.durationMinutes,
        sessionRpe: input.sessionRpe,
        location: input.location,
        notes: input.notes,
        sourceType: input.sourceType || "manual"
      });
      const savedSets = sets.map((set, index) => saveSet(user.id, session.id, set, index + 1));
      db.exec("COMMIT");
      return { session, sets: savedSets };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function saveSet(userId, sessionId, set, defaultIndex) {
    if (!set.exercise || !set.exercise.name) {
      throw inputError("set.exercise.name is required");
    }
    const reps = Number(set.reps);
    if (!Number.isInteger(reps) || reps <= 0) throw inputError("reps must be a positive integer");
    const exercise = trainingRepository.ensureExercise(userId, set.exercise);
    return trainingRepository.addSet(sessionId, exercise.id, {
      setIndex: set.setIndex || defaultIndex,
      weightKg: normalizeWeight(set.weightValue ?? set.weightKg ?? 0, set.weightUnit || "kg"),
      reps,
      rpe: set.rpe,
      isWarmup: set.isWarmup,
      isFailure: set.isFailure,
      restSeconds: set.restSeconds,
      notes: set.notes
    });
  }

  function listSessions(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return trainingRepository.listSessions(user.id).map((session) => ({
      ...session,
      sets: trainingRepository.listSetsForSession(session.id)
    }));
  }

  function updateSession(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    if (!input.sessionId) throw inputError("sessionId is required");
    const patch = {};
    if (input.startedAt) patch.startedAt = requireIsoDateTime(input.startedAt, "startedAt");
    if (Object.hasOwn(input, "endedAt")) {
      patch.endedAt = input.endedAt ? requireIsoDateTime(input.endedAt, "endedAt") : null;
    }
    for (const key of ["durationMinutes", "sessionRpe", "location", "notes", "sourceType"]) {
      if (Object.hasOwn(input, key)) patch[key] = input[key];
    }
    const session = trainingRepository.updateSession(user.id, input.sessionId, patch);
    if (!session) throw inputError("strength session is not found", "record_not_found");
    return { session, sets: trainingRepository.listSetsForSession(session.id) };
  }

  return { listSessions, recordSession, updateSession };
}

module.exports = { createStrengthService };

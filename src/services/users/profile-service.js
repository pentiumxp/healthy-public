const { inputError } = require("../../utils/errors");
const { assertCleanText } = require("../../utils/text-integrity");
const { normalizeLength, normalizeWeight } = require("../../utils/units");
const { nowIso } = require("../../utils/time");

function createProfileService({ userRepository, clock }) {
  function requireWorkspaceRef(workspaceRef) {
    if (!workspaceRef || typeof workspaceRef !== "string") {
      throw inputError("workspaceRef is required", "missing_workspace_context");
    }
    return workspaceRef.trim();
  }

  function ensureProfile(input) {
    const workspaceRef = requireWorkspaceRef(input.workspaceRef);
    const user = userRepository.ensureUser({
      workspaceRef,
      hermesUserRef: input.hermesUserRef,
      displayName: input.displayName
    });
    const profile = input.profile ? saveProfileForUser(user.id, input.profile) : userRepository.getProfile(user.id);
    return { user, profile };
  }

  function saveProfile(input) {
    assertCleanText(input.profile, "profile");
    const user = getUserByWorkspace(input.workspaceRef);
    const profile = saveProfileForUser(user.id, input.profile || {});
    return { user, profile };
  }

  function getProfile(input) {
    const user = getUserByWorkspace(input.workspaceRef);
    return { user, profile: userRepository.getProfile(user.id) };
  }

  function saveProfileForUser(userId, profile) {
    const normalized = { ...profile };
    if (profile.heightValue != null) {
      normalized.heightCm = normalizeLength(profile.heightValue, profile.heightUnit || "cm").value;
    }
    if (profile.targetWeightValue != null) {
      normalized.targetWeightKg = normalizeWeight(profile.targetWeightValue, profile.targetWeightUnit || "kg");
    }
    return userRepository.upsertProfile(userId, normalized);
  }

  function addMedication(input) {
    assertCleanText(input.medication, "medication");
    const user = getUserByWorkspace(input.workspaceRef);
    const medication = input.medication || {};
    if (!medication.name || typeof medication.name !== "string") {
      throw inputError("medication.name is required");
    }
    return userRepository.addMedication(user.id, medication);
  }

  function listActiveMedications(input) {
    const user = getUserByWorkspace(input.workspaceRef);
    return userRepository.listActiveMedications(user.id, input.at || nowIso(clock));
  }

  function getUserByWorkspace(workspaceRef) {
    const user = userRepository.findByWorkspace(requireWorkspaceRef(workspaceRef));
    if (!user) throw inputError("workspace is not registered", "workspace_not_registered");
    return user;
  }

  return { addMedication, ensureProfile, getProfile, getUserByWorkspace, listActiveMedications, saveProfile };
}

module.exports = { createProfileService };

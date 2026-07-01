const { createMigratedDatabase } = require("../db/client");
const { createBodyRepository } = require("../repositories/body-repository");
const { createAppleHealthRepository } = require("../repositories/apple-health-repository");
const { createCardioRepository } = require("../repositories/cardio-repository");
const { createMedicalRecordsRepository } = require("../repositories/medical-records-repository");
const { createTrainingRepository } = require("../repositories/training-repository");
const { createUserRepository } = require("../repositories/user-repository");
const { createAppleHealthService } = require("../services/apple/apple-health-service");
const { createBodyService } = require("../services/body/body-service");
const { createDashboardService } = require("../services/dashboard/dashboard-service");
const { createPluginService } = require("../services/plugin/plugin-service");
const { createMedicalRecordsService } = require("../services/medical/medical-records-service");
const { createCardioService } = require("../services/training/cardio-service");
const { createStrengthService } = require("../services/training/strength-service");
const { createProfileService } = require("../services/users/profile-service");

function createServices(config = {}) {
  const db = config.db || createMigratedDatabase(config.databasePath);
  const userRepository = createUserRepository(db, config);
  const trainingRepository = createTrainingRepository(db, config);
  const cardioRepository = createCardioRepository(db, config);
  const appleHealthRepository = createAppleHealthRepository(db, config);
  const bodyRepository = createBodyRepository(db, config);
  const medicalRecordsRepository = createMedicalRecordsRepository(db, config);
  const profileService = createProfileService({ userRepository, clock: config.clock });
  const strengthService = createStrengthService({ profileService, trainingRepository, db });
  const cardioService = createCardioService({ profileService, cardioRepository });
  const bodyService = createBodyService({ profileService, bodyRepository });
  const medicalRecordsService = createMedicalRecordsService({ profileService, medicalRecordsRepository });
  const appleHealthService = createAppleHealthService({ profileService, appleHealthRepository, bodyService, clock: config.clock });
  const pluginService = createPluginService({
    userRepository,
    registrationKey: config.registrationKey,
    clock: config.clock
  });
  const dashboardService = createDashboardService({ profileService, strengthService, cardioService, bodyService, medicalRecordsService, appleHealthService });
  return { appleHealthService, bodyService, cardioService, dashboardService, db, medicalRecordsService, pluginService, profileService, strengthService };
}

module.exports = { createServices };

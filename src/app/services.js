const { createMigratedDatabase } = require("../db/client");
const { createBodyRepository } = require("../repositories/body-repository");
const { createTrainingRepository } = require("../repositories/training-repository");
const { createUserRepository } = require("../repositories/user-repository");
const { createBodyService } = require("../services/body/body-service");
const { createDashboardService } = require("../services/dashboard/dashboard-service");
const { createPluginService } = require("../services/plugin/plugin-service");
const { createStrengthService } = require("../services/training/strength-service");
const { createProfileService } = require("../services/users/profile-service");

function createServices(config = {}) {
  const db = config.db || createMigratedDatabase(config.databasePath);
  const userRepository = createUserRepository(db, config);
  const trainingRepository = createTrainingRepository(db, config);
  const bodyRepository = createBodyRepository(db, config);
  const profileService = createProfileService({ userRepository, clock: config.clock });
  const strengthService = createStrengthService({ profileService, trainingRepository, db });
  const bodyService = createBodyService({ profileService, bodyRepository });
  const pluginService = createPluginService({
    userRepository,
    registrationKey: config.registrationKey,
    clock: config.clock
  });
  const dashboardService = createDashboardService({ profileService, strengthService, bodyService });
  return { bodyService, dashboardService, db, pluginService, profileService, strengthService };
}

module.exports = { createServices };


function createAppleListService({ profileService, appleHealthRepository, limit }) {
  function listRecords(input, listFn, maxLimit = 30) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return { records: listFn(user.id, { ...input, limit: limit(input.limit, maxLimit) }) };
  }
  return {
    listEcgRecords: (input) => listRecords(input, appleHealthRepository.listEcgRecords),
    listImportFiles: (input) => listRecords(input, appleHealthRepository.listImportFiles, 100),
    listObservations: (input) => listRecords(input, appleHealthRepository.listObservations, 100),
    listRoutePoints: (input) => listRecords(input, appleHealthRepository.listRoutePoints, 1000),
    listSleepRecords: (input) => listRecords(input, appleHealthRepository.listSleepRecords)
  };
}

module.exports = { createAppleListService };

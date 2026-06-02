const { randomUUID } = require("node:crypto");

function newId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

module.exports = { newId };


function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function requireIsoDateTime(value, field) {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw Object.assign(new Error(`${field} must be an ISO date/time`), {
      code: "invalid_input"
    });
  }
  return new Date(value).toISOString();
}

module.exports = { nowIso, requireIsoDateTime };


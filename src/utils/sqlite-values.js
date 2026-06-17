function stringOrNull(value, maxLength = 512) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, maxLength);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch (_) {
    return String(value).slice(0, maxLength);
  }
}

module.exports = { stringOrNull };

function normalizeWeight(value, unit = "kg") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw Object.assign(new Error("weight must be a non-negative number"), {
      code: "invalid_input"
    });
  }
  if (unit === "kg") return round(numeric);
  if (unit === "lb" || unit === "lbs") return round(numeric * 0.45359237);
  throw Object.assign(new Error("unsupported weight unit"), {
    code: "unsupported_unit"
  });
}

function normalizeLength(value, unit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw Object.assign(new Error("length must be a non-negative number"), {
      code: "invalid_input"
    });
  }
  if (unit === "cm") return { value: round(numeric), unit: "cm" };
  if (unit === "m") return { value: round(numeric * 100), unit: "cm" };
  if (unit === "in") return { value: round(numeric * 2.54), unit: "cm" };
  throw Object.assign(new Error("unsupported length unit"), {
    code: "unsupported_unit"
  });
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

module.exports = { normalizeWeight, normalizeLength };


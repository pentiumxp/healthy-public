const { inputError } = require("./errors");

const MOJIBAKE_CODEPOINTS = new Set([0xfffd, 0x00c2, 0x00c3, 0x934b, 0x609d, 0x60cd]);

function assertCleanText(value, path = "input") {
  if (value == null) return;
  if (typeof value === "string") {
    if (isCorruptText(value)) {
      throw inputError(`${path} must be valid UTF-8 text; received mojibake or replacement characters`, "invalid_text_encoding");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertCleanText(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) assertCleanText(nested, `${path}.${key}`);
  }
}

function isCorruptText(value) {
  if (!value) return false;
  if (/[?]{2,}/.test(value)) return true;
  if (/^[?]$/.test(value.trim())) return true;
  return [...value].some((ch) => MOJIBAKE_CODEPOINTS.has(ch.codePointAt(0)));
}

module.exports = { assertCleanText, isCorruptText };

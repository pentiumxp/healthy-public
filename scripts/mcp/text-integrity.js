const MOJIBAKE_CODEPOINTS = new Set([0xfffd, 0x00c2, 0x00c3, 0x934b, 0x609d, 0x60cd]);

function assertCleanText(value) {
  if (value == null) return;
  if (typeof value === "string") {
    if (isCorruptText(value)) throw Object.assign(new Error("invalid_text_encoding"), { code: "invalid_text_encoding" });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertCleanText);
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach(assertCleanText);
  }
}

function isCorruptText(value) {
  if (!value) return false;
  if (/[?]{2,}/.test(value) || /^[?]$/.test(value.trim())) return true;
  return [...value].some((ch) => MOJIBAKE_CODEPOINTS.has(ch.codePointAt(0)));
}

module.exports = { assertCleanText, isCorruptText };

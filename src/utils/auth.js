const { createHash, timingSafeEqual } = require("node:crypto");

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerFrom(headers) {
  const value = headers.authorization || headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : "";
}

module.exports = { bearerFrom, safeEqual, sha256 };


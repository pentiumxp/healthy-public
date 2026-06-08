const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".sql"]);
const SKIP_DIRS = new Set([".git", ".codegraph", "data", "node_modules", "storage", "tmp", "uploads"]);
const MOJIBAKE_PATTERNS = [
  [0x934b],
  [0x9359],
  [0x93c4],
  [0x9428],
  [0x748b],
  [0x93c2],
  [0x7efe],
  [0x4e2e],
  [0x4e20],
  [0x4e41],
  [0x4e6d],
  [0xfffd],
  [0x00c3],
  [0x00e2, 0x20ac, 0x2122],
  [0x00e2, 0x20ac, 0x0153],
  [0x00e2, 0x20ac],
  [0x041d, 0x0401, 0x041f, 0x0415]
].map((codes) => String.fromCodePoint(...codes));

const failures = [];
for (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) continue;
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    failures.push(`${relative(file)} has UTF-8 BOM`);
  }
  const text = bytes.toString("utf8");
  for (const pattern of MOJIBAKE_PATTERNS) {
    if (text.includes(pattern)) {
      failures.push(`${relative(file)} contains suspicious mojibake pattern ${JSON.stringify(pattern)}`);
      break;
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") && entry.name !== ".gitattributes") {
      if (SKIP_DIRS.has(entry.name)) return [];
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return [];
      return walk(full);
    }
    return [full];
  });
}

function relative(file) {
  return path.relative(ROOT, file);
}

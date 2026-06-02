const fs = require("node:fs");
const path = require("node:path");
const { bearerFrom } = require("../utils/auth");
const { publicError } = require("../utils/errors");

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendError(res, error) {
  sendJson(res, error.code ? 400 : 500, publicError(error));
}

function routeKey(req, url) {
  return `${req.method} ${url.pathname}`;
}

function workspaceFrom(url, body = {}) {
  return body.workspace_id || body.workspaceRef || url.searchParams.get("workspace_id");
}

function resolveAccess({ pluginService, req, url, body }) {
  const workspaceRef = workspaceFrom(url, body);
  const launch = req.headers["x-healthy-launch-token"] || url.searchParams.get("launch");
  if (launch) return pluginService.resolveLaunchToken(launch, workspaceRef).workspaceRef;
  pluginService.verifyWorkspaceKey(workspaceRef, bearerFrom(req.headers));
  return workspaceRef;
}

function serveStatic(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) return false;
  res.writeHead(200, { "content-type": contentType });
  res.end(fs.readFileSync(filePath));
  return true;
}

function publicPath(fileName) {
  return path.join(process.cwd(), "public", fileName);
}

module.exports = { bearerFrom, publicPath, readJson, resolveAccess, routeKey, sendError, sendJson, serveStatic };


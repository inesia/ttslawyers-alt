/**
 * Local static + API server for CMS development.
 * Usage: node server.js
 * Then open http://127.0.0.1:8765/admin/
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadEnvFile } = require("./api/_lib/env");

loadEnvFile();

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8765);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

const apiRoutes = {
  "/api/auth/login": require("./api/auth/login"),
  "/api/auth/logout": require("./api/auth/logout"),
  "/api/auth/me": require("./api/auth/me"),
  "/api/content": require("./api/content/index"),
  "/api/content/save-draft": require("./api/content/save-draft"),
  "/api/content/publish": require("./api/content/publish"),
  "/api/content/status": require("./api/content/status"),
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, { "Content-Type": "text/plain" }, "Not Found");
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  send(res, 200, { "Content-Type": type }, fs.readFileSync(filePath));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
      const handler = apiRoutes[pathname];
      if (!handler) {
        return send(res, 404, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "API not found" }));
      }
      // Attach url with query for handlers that parse req.url
      req.url = pathname + url.search;
      return handler(req, res);
    }

    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      send(res, 500, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: err.message }));
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`TTS CMS local server: http://127.0.0.1:${PORT}/admin/`);
  console.log(`Password env loaded: ${process.env.CMS_ADMIN_PASSWORD ? "yes" : "NO — create .env"}`);
});

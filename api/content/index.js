const fs = require("fs");
const path = require("path");
const { sendJson, methodNotAllowed } = require("../_lib/http");
const { requireAuth } = require("../_lib/auth");
const { assertTarget, contentPath, draftPath, getFile } = require("../_lib/github");

function readLocal(relPath) {
  const full = path.join(process.cwd(), relPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const url = new URL(req.url, "http://localhost");
  const lang = url.searchParams.get("lang");
  const page = url.searchParams.get("page");
  const draft = url.searchParams.get("draft") === "1";

  try {
    assertTarget(lang, page);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }

  if (draft) {
    if (!requireAuth(req, res)) return;
    try {
      const file = await getFile(draftPath(lang, page));
      if (file) {
        return sendJson(res, 200, {
          ok: true,
          source: "draft",
          data: JSON.parse(file.content),
          sha: file.sha,
        });
      }
      const published = await getFile(contentPath(lang, page));
      if (published) {
        return sendJson(res, 200, {
          ok: true,
          source: "published-fallback",
          data: JSON.parse(published.content),
          sha: null,
        });
      }
      const local = readLocal(contentPath(lang, page));
      if (local) return sendJson(res, 200, { ok: true, source: "local", data: local, sha: null });
      return sendJson(res, 404, { ok: false, error: "Konten tidak ditemukan" });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // Public published content — prefer local file on Vercel deployment.
  const local = readLocal(contentPath(lang, page));
  if (local) return sendJson(res, 200, { ok: true, source: "local", data: local });

  try {
    const published = await getFile(contentPath(lang, page));
    if (!published) return sendJson(res, 404, { ok: false, error: "Konten tidak ditemukan" });
    return sendJson(res, 200, { ok: true, source: "github", data: JSON.parse(published.content) });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
};

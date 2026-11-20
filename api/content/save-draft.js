const fs = require("fs");
const path = require("path");
const { sendJson, readBody, methodNotAllowed } = require("../_lib/http");
const { requireAuth } = require("../_lib/auth");
const { assertTarget, draftPath, getFile, putFile, prettyJson } = require("../_lib/github");

function writeLocal(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!requireAuth(req, res)) return;

  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Body JSON tidak valid" });
  }

  const { lang, page, data } = body || {};
  try {
    assertTarget(lang, page);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }
  if (!data || typeof data !== "object") {
    return sendJson(res, 400, { ok: false, error: "Field data wajib diisi" });
  }

  const content = prettyJson(data);
  const target = draftPath(lang, page);

  if (!process.env.GITHUB_TOKEN) {
    try {
      writeLocal(target, content);
      return sendJson(res, 200, {
        ok: true,
        message: "Draft tersimpan lokal (tanpa GitHub token)",
        path: target,
        commit: null,
        source: "local",
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  try {
    const existing = await getFile(target);
    const result = await putFile(
      target,
      content,
      `cms(draft): save ${lang}/${page}.json`,
      existing?.sha
    );
    writeLocal(target, content);
    return sendJson(res, 200, {
      ok: true,
      message: "Draft tersimpan ke GitHub",
      path: target,
      commit: result.commit?.sha || null,
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
};

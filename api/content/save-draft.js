const { sendJson, readBody, methodNotAllowed } = require("../_lib/http");
const { requireAuth } = require("../_lib/auth");
const { assertTarget, draftPath, getFile, putFile, prettyJson } = require("../_lib/github");

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

  if (!process.env.GITHUB_TOKEN) {
    return sendJson(res, 500, {
      ok: false,
      error:
        "GITHUB_TOKEN belum di-set di environment Vercel. Simpan Draft tidak bisa menulis ke GitHub.",
    });
  }

  try {
    const target = draftPath(lang, page);
    const existing = await getFile(target);
    const content = prettyJson(data);
    const result = await putFile(
      target,
      content,
      `cms(draft): save ${lang}/${page}.json`,
      existing?.sha
    );
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

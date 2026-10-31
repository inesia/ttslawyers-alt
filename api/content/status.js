const { sendJson, methodNotAllowed } = require("../_lib/http");
const { requireAuth } = require("../_lib/auth");
const { assertTarget, contentPath, draftPath, getFile } = require("../_lib/github");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!requireAuth(req, res)) return;

  const url = new URL(req.url, "http://localhost");
  const lang = url.searchParams.get("lang");
  const page = url.searchParams.get("page");

  try {
    assertTarget(lang, page);
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: err.message });
  }

  try {
    const [published, draft] = await Promise.all([
      getFile(contentPath(lang, page)),
      getFile(draftPath(lang, page)),
    ]);
    return sendJson(res, 200, {
      ok: true,
      published: published
        ? { exists: true, sha: published.sha, path: published.path }
        : { exists: false },
      draft: draft
        ? { exists: true, sha: draft.sha, path: draft.path }
        : { exists: false },
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
};

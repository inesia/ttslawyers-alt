const { sendJson, readBody, methodNotAllowed } = require("../_lib/http");
const { requireAuth } = require("../_lib/auth");
const {
  assertTarget,
  contentPath,
  draftPath,
  getFile,
  putFile,
  prettyJson,
} = require("../_lib/github");

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

  try {
    const publishedPath = contentPath(lang, page);
    const draftTarget = draftPath(lang, page);
    const content = prettyJson(data);

    const published = await getFile(publishedPath);
    const publishResult = await putFile(
      publishedPath,
      content,
      `cms(publish): update ${lang}/${page}.json`,
      published?.sha
    );

    // Keep draft in sync with published content.
    const draft = await getFile(draftTarget);
    await putFile(
      draftTarget,
      content,
      `cms(draft): sync after publish ${lang}/${page}.json`,
      draft?.sha
    );

    return sendJson(res, 200, {
      ok: true,
      message: "Published to GitHub — Vercel deployment in progress",
      path: publishedPath,
      commit: publishResult.commit?.sha || null,
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
};

const fs = require("fs");
const path = require("path");
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

  const publishedPath = contentPath(lang, page);
  const draftTarget = draftPath(lang, page);
  const content = prettyJson(data);

  if (!process.env.GITHUB_TOKEN) {
    try {
      writeLocal(publishedPath, content);
      writeLocal(draftTarget, content);
      return sendJson(res, 200, {
        ok: true,
        message: "Published lokal (content + draft) tanpa GitHub token",
        path: publishedPath,
        commit: null,
        source: "local",
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  try {
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

    writeLocal(publishedPath, content);
    writeLocal(draftTarget, content);

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

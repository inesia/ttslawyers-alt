const { sendJson, readBody, methodNotAllowed } = require("../_lib/http");
const {
  checkLoginRateLimit,
  verifyPassword,
  createSessionToken,
  sessionCookie,
} = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const rate = checkLoginRateLimit(req);
  if (!rate.ok) return sendJson(res, 429, { ok: false, error: rate.error });

  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Body JSON tidak valid" });
  }

  try {
    if (!verifyPassword(body.password)) {
      return sendJson(res, 401, { ok: false, error: "Password salah" });
    }
    const token = createSessionToken();
    res.setHeader("Set-Cookie", sessionCookie(token));
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendJson(res, 500, {
      ok: false,
      error: err.message || "Login gagal. Periksa CMS_ADMIN_PASSWORD dan CMS_SESSION_SECRET.",
    });
  }
};

const { sendJson, methodNotAllowed } = require("../_lib/http");
const { clearSessionCookie } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  res.setHeader("Set-Cookie", clearSessionCookie());
  return sendJson(res, 200, { ok: true });
};

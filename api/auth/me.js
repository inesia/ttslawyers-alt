const { sendJson, methodNotAllowed } = require("../_lib/http");
const { verifySession } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const session = verifySession(req);
  if (!session) return sendJson(res, 401, { ok: false, authenticated: false });
  return sendJson(res, 200, { ok: true, authenticated: true, exp: session.exp });
};

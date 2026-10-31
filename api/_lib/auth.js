const crypto = require("crypto");
const { getClientIp } = require("./http");
const { loadEnvFile } = require("./env");

loadEnvFile();

const COOKIE_NAME = "cms_session";
const MAX_AGE_SEC = 60 * 60 * 8; // 8 hours
const loginAttempts = new Map();

function requireEnv(name) {
  loadEnvFile();
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return String(value).trim();
}

function timingSafeEqualStr(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function sign(payloadB64) {
  const secret = requireEnv("CMS_SESSION_SECRET");
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function createSessionToken() {
  const payload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return payloadB64 + "." + sign(payloadB64);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function verifySession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  if (!timingSafeEqualStr(sig, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || payload.role !== "admin" || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function sessionCookie(token) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SEC}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function checkLoginRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, start: now };
  if (now - entry.start > 15 * 60 * 1000) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  if (entry.count > 20) {
    return { ok: false, error: "Terlalu banyak percobaan login. Coba lagi nanti." };
  }
  return { ok: true };
}

function verifyPassword(password) {
  const expected = requireEnv("CMS_ADMIN_PASSWORD");
  return timingSafeEqualStr(password || "", expected);
}

function requireAuth(req, res) {
  const session = verifySession(req);
  if (!session) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    return null;
  }
  return session;
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  verifySession,
  sessionCookie,
  clearSessionCookie,
  checkLoginRateLimit,
  verifyPassword,
  requireAuth,
};

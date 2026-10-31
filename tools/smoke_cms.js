const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE = process.env.CMS_BASE || "http://127.0.0.1:8765";
const PASSWORD = process.env.CMS_ADMIN_PASSWORD || "Tt5L4wyers!";

function request(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text,
            json,
            cookie: res.headers["set-cookie"],
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const out = [];
  const home = await request("GET", "/index.html");
  out.push(["home", home.status]);
  const admin = await request("GET", "/admin/");
  out.push(["admin", admin.status, String(admin.text).includes("Admin CMS")]);

  const login = await request("POST", "/api/auth/login", { password: PASSWORD });
  out.push(["login", login.status, login.json]);
  const cookie = (login.cookie || []).map((c) => c.split(";")[0]).join("; ");

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "content", "id", "home.json"), "utf8")
  );
  data.hero.title = data.hero.title; // no wording change

  const draft = await request(
    "POST",
    "/api/content/save-draft",
    { lang: "id", page: "home", data },
    cookie
  );
  out.push(["save-draft", draft.status, draft.json]);

  const preview = await request(
    "GET",
    "/api/content?lang=id&page=home&draft=1",
    null,
    cookie
  );
  out.push(["preview-draft", preview.status, preview.json && preview.json.source]);

  const publish = await request(
    "POST",
    "/api/content/publish",
    { lang: "id", page: "home", data },
    cookie
  );
  out.push(["publish", publish.status, publish.json]);

  console.log(JSON.stringify(out, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

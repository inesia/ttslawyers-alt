const ALLOWED_PAGES = new Set([
  "home",
  "about",
  "founder",
  "team",
  "practice-areas",
  "track-record",
  "vision",
  "contact",
  "site",
]);

const ALLOWED_LANGS = new Set(["id", "en"]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function assertTarget(lang, page) {
  if (!ALLOWED_LANGS.has(lang)) throw new Error("Invalid language");
  if (!ALLOWED_PAGES.has(page)) throw new Error("Invalid page");
}

function contentPath(lang, page) {
  assertTarget(lang, page);
  return `content/${lang}/${page}.json`;
}

function draftPath(lang, page) {
  assertTarget(lang, page);
  return `drafts/${lang}/${page}.json`;
}

async function githubRequest(pathname, options = {}) {
  const token = requireEnv("GITHUB_TOKEN");
  const owner = requireEnv("GITHUB_OWNER");
  const repo = requireEnv("GITHUB_REPO");
  const url = `https://api.github.com/repos/${owner}/${repo}${pathname}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tts-law-cms",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.message || text || res.statusText;
    const err = new Error(`GitHub API error (${res.status}): ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function getFile(path) {
  const branch = requireEnv("GITHUB_BRANCH");
  try {
    const data = await githubRequest(
      `/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`
    );
    const content = Buffer.from(data.content || "", "base64").toString("utf8");
    return { sha: data.sha, content, path: data.path };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function putFile(path, content, message, sha) {
  const branch = requireEnv("GITHUB_BRANCH");
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;
  return githubRequest(`/contents/${encodeURI(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prettyJson(data) {
  return JSON.stringify(data, null, 2) + "\n";
}

module.exports = {
  ALLOWED_PAGES,
  ALLOWED_LANGS,
  contentPath,
  draftPath,
  getFile,
  putFile,
  prettyJson,
  assertTarget,
};

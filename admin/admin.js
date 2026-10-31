(function () {
  "use strict";

  const PAGES = [
    { id: "home", label: "Beranda", preview: { id: "index.html", en: "en-index.html" } },
    { id: "about", label: "Tentang Kami", preview: { id: "firma-hukum.html", en: "en-firma-hukum.html" } },
    { id: "founder", label: "Pendiri", preview: { id: "pendiri.html", en: "en-pendiri.html" } },
    { id: "team", label: "Tim", preview: { id: "partners.html", en: "en-partners.html" } },
    { id: "practice-areas", label: "Bidang Praktik", preview: { id: "pendiri.html#jasa", en: "en-pendiri.html#jasa" } },
    { id: "track-record", label: "Rekam Jejak", preview: { id: "pendiri.html#pengalaman", en: "en-pendiri.html#pengalaman" } },
    { id: "vision", label: "Visi", preview: { id: "firma-hukum.html#visi", en: "en-firma-hukum.html#visi" } },
    { id: "contact", label: "Kontak", preview: { id: "kontak.html", en: "en-kontak.html" } },
  ];

  const state = {
    authenticated: false,
    lang: "id",
    page: "home",
    data: null,
    dirty: false,
  };

  const els = {
    loginView: document.getElementById("login-view"),
    appView: document.getElementById("app-view"),
    loginForm: document.getElementById("login-form"),
    loginError: document.getElementById("login-error"),
    nav: document.getElementById("page-nav"),
    lang: document.getElementById("lang-select"),
    title: document.getElementById("editor-title"),
    notice: document.getElementById("notice"),
    editor: document.getElementById("editor"),
    btnSave: document.getElementById("btn-save"),
    btnPublish: document.getElementById("btn-publish"),
    btnPreview: document.getElementById("btn-preview"),
    btnLogout: document.getElementById("btn-logout"),
    statusLine: document.getElementById("status-line"),
  };

  async function api(url, options) {
    let res;
    try {
      res = await fetch(url, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
        ...options,
      });
    } catch (networkErr) {
      throw new Error(
        "Tidak bisa menghubungi API. Jalankan `node server.js` (lokal) atau pakai domain Vercel, bukan python http.server."
      );
    }
    let json = null;
    const text = await res.text();
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      let message = (json && json.error) || "Permintaan gagal (" + res.status + ")";
      if (res.status === 501 || res.status === 404 || (text && text.indexOf("<!DOCTYPE") === 0)) {
        message =
          "Endpoint /api tidak aktif di server ini. Untuk lokal jalankan: node server.js — untuk production pastikan env Vercel sudah di-set lalu Redeploy.";
      }
      const err = new Error(message);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  function showNotice(type, message) {
    els.notice.className = "notice show " + type;
    els.notice.textContent = message;
  }

  function clearNotice() {
    els.notice.className = "notice";
    els.notice.textContent = "";
  }

  function field(label, key, value, multiline, tall) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (tall ? " tall" : "");
    const lab = document.createElement("label");
    lab.textContent = label;
    let input;
    if (multiline) {
      input = document.createElement("textarea");
      input.value = Array.isArray(value) ? value.join("\n\n") : value || "";
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = value == null ? "" : String(value);
    }
    input.dataset.key = key;
    input.addEventListener("input", function () {
      state.dirty = true;
    });
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function readFields(root) {
    const out = {};
    root.querySelectorAll("[data-key]").forEach(function (el) {
      out[el.dataset.key] = el.value;
    });
    return out;
  }

  function paragraphsFromTextarea(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map(function (p) {
        return p.replace(/\r/g, "").trimEnd();
      })
      .filter(function (p) {
        return p.length > 0;
      });
  }

  function linesFromTextarea(text) {
    return String(text || "")
      .split(/\n/)
      .map(function (l) {
        return l.replace(/\r/g, "");
      })
      .filter(function (l) {
        return l.trim().length > 0;
      });
  }

  function renderEditor() {
    const data = state.data || {};
    const page = state.page;
    els.editor.innerHTML = "";
    const card = document.createElement("div");
    card.className = "card";
    card.id = "editor-card";

    const meta = document.createElement("h2");
    meta.textContent = "Konten";
    card.appendChild(meta);

    if (page === "home") {
      card.appendChild(field("Judul hero", "hero.title", data.hero?.title));
      card.appendChild(field("Eyebrow hero", "hero.eyebrow", data.hero?.eyebrow));
      card.appendChild(field("Label tombol", "hero.ctaLabel", data.hero?.ctaLabel));
      card.appendChild(field("Tautan tombol", "hero.ctaHref", data.hero?.ctaHref));
      card.appendChild(field("Gambar desktop", "hero.desktopImage", data.hero?.desktopImage));
      card.appendChild(field("Gambar mobile", "hero.mobileImage", data.hero?.mobileImage));
      card.appendChild(field("Alt gambar", "hero.alt", data.hero?.alt));
      card.appendChild(field("Footer brand", "footer.brand", data.footer?.brand));
      card.appendChild(field("Footer label kontak", "footer.contactLabel", data.footer?.contactLabel));
      card.appendChild(field("Footer tautan kontak", "footer.contactHref", data.footer?.contactHref));
    } else if (page === "about") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      card.appendChild(field("Kicker", "kicker", data.kicker));
      card.appendChild(field("Lead", "lead", data.lead, true));
      card.appendChild(field("Paragraf (pisahkan dengan baris kosong)", "paragraphs", (data.paragraphs || []).join("\n\n"), true, true));
      card.appendChild(field("Path foto", "photo.src", data.photo?.src));
      card.appendChild(field("Alt foto", "photo.alt", data.photo?.alt));
    } else if (page === "vision") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(field("Kicker (satu baris per baris)", "kickerLines", (data.kickerLines || []).join("\n"), true));
      card.appendChild(field("Paragraf", "paragraphs", (data.paragraphs || []).join("\n\n"), true, true));
      card.appendChild(field("Pernyataan warisan", "legacyParagraphs", (data.legacyParagraphs || []).join("\n\n"), true, true));
    } else if (page === "founder") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      card.appendChild(field("Kicker", "kicker", data.kicker));
      card.appendChild(field("Perkara / catatan", "casesParagraphs", (data.casesParagraphs || []).join("\n\n"), true, true));
      card.appendChild(field("Biografi", "bioParagraphs", (data.bioParagraphs || []).join("\n\n"), true, true));
    } else if (page === "practice-areas") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(field("Lead", "lead", data.lead, true));
      card.appendChild(field("Item praktik (satu per baris)", "items", (data.items || []).join("\n"), true, true));
    } else if (page === "track-record") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(field("Kicker", "kicker", data.kicker));
      (data.cases || []).forEach(function (c, i) {
        const block = document.createElement("div");
        block.className = "case-block";
        block.appendChild(field("Kasus " + (i + 1) + " — judul", "case." + i + ".title", c.title));
        block.appendChild(field("Kasus " + (i + 1) + " — isi", "case." + i + ".body", c.body, true));
        card.appendChild(block);
      });
    } else if (page === "team") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      (data.members || []).forEach(function (m, i) {
        const block = document.createElement("div");
        block.className = "member-block";
        block.appendChild(field("Anggota " + (i + 1) + " — nama", "member." + i + ".name", m.name));
        block.appendChild(field("Anggota " + (i + 1) + " — foto", "member." + i + ".photo.src", m.photo?.src));
        block.appendChild(field("Anggota " + (i + 1) + " — alt", "member." + i + ".photo.alt", m.photo?.alt));
        block.appendChild(
          field(
            "Anggota " + (i + 1) + " — paragraf",
            "member." + i + ".paragraphs",
            (m.paragraphs || []).join("\n\n"),
            true,
            true
          )
        );
        card.appendChild(block);
      });
    } else if (page === "contact") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      card.appendChild(field("Kicker pesan", "messageKicker", data.messageKicker));
      card.appendChild(field("Pesan", "message", data.message, true));
      card.appendChild(field("Motto", "motto", data.motto));
      card.appendChild(field("Kicker kartu", "cardKicker", data.cardKicker));
      (data.fields || []).forEach(function (f, i) {
        const block = document.createElement("div");
        block.className = "case-block";
        block.appendChild(field("Field " + (i + 1) + " — label", "field." + i + ".label", f.label));
        const flat = (f.values || [])
          .map(function (v) {
            return v.href ? v.text + " | " + v.href : v.text;
          })
          .join("\n");
        block.appendChild(
          field(
            "Field " + (i + 1) + " — nilai (teks | url, satu per baris)",
            "field." + i + ".values",
            flat,
            true
          )
        );
        card.appendChild(block);
      });
    }

    els.editor.appendChild(card);
    els.title.textContent = PAGES.find(function (p) {
      return p.id === page;
    }).label;
  }

  function collectData() {
    const raw = readFields(els.editor);
    const data = JSON.parse(JSON.stringify(state.data || {}));
    const page = state.page;

    function setPath(obj, path, value) {
      const parts = path.split(".");
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
        cur = cur[key];
      }
      cur[parts[parts.length - 1]] = value;
    }

    if (page === "home") {
      Object.keys(raw).forEach(function (k) {
        setPath(data, k, raw[k]);
      });
    } else if (page === "about") {
      data.eyebrow = raw.eyebrow;
      data.pageTitle = raw.pageTitle;
      data.kicker = raw.kicker;
      data.lead = raw.lead;
      data.paragraphs = paragraphsFromTextarea(raw.paragraphs);
      data.photo = data.photo || {};
      data.photo.src = raw["photo.src"];
      data.photo.alt = raw["photo.alt"];
    } else if (page === "vision") {
      data.heading = raw.heading;
      data.kickerLines = linesFromTextarea(raw.kickerLines);
      data.paragraphs = paragraphsFromTextarea(raw.paragraphs);
      data.legacyParagraphs = paragraphsFromTextarea(raw.legacyParagraphs);
    } else if (page === "founder") {
      data.eyebrow = raw.eyebrow;
      data.pageTitle = raw.pageTitle;
      data.kicker = raw.kicker;
      data.casesParagraphs = paragraphsFromTextarea(raw.casesParagraphs);
      data.bioParagraphs = paragraphsFromTextarea(raw.bioParagraphs);
    } else if (page === "practice-areas") {
      data.heading = raw.heading;
      data.lead = raw.lead;
      data.items = linesFromTextarea(raw.items);
    } else if (page === "track-record") {
      data.heading = raw.heading;
      data.kicker = raw.kicker;
      data.cases = (data.cases || []).map(function (c, i) {
        return {
          title: raw["case." + i + ".title"] || c.title,
          body: raw["case." + i + ".body"] || c.body,
        };
      });
    } else if (page === "team") {
      data.eyebrow = raw.eyebrow;
      data.pageTitle = raw.pageTitle;
      data.members = (data.members || []).map(function (m, i) {
        return {
          name: raw["member." + i + ".name"] || m.name,
          photo: {
            src: raw["member." + i + ".photo.src"] || m.photo?.src,
            alt: raw["member." + i + ".photo.alt"] || m.photo?.alt,
          },
          paragraphs: paragraphsFromTextarea(raw["member." + i + ".paragraphs"]),
        };
      });
    } else if (page === "contact") {
      data.eyebrow = raw.eyebrow;
      data.pageTitle = raw.pageTitle;
      data.messageKicker = raw.messageKicker;
      data.message = raw.message;
      data.motto = raw.motto;
      data.cardKicker = raw.cardKicker;
      data.fields = (data.fields || []).map(function (f, i) {
        const lines = linesFromTextarea(raw["field." + i + ".values"]);
        return {
          label: raw["field." + i + ".label"] || f.label,
          values: lines.map(function (line) {
            const parts = line.split("|");
            if (parts.length >= 2) {
              return { text: parts[0].trim(), href: parts.slice(1).join("|").trim() };
            }
            return { text: line.trim() };
          }),
        };
      });
    }

    return data;
  }

  async function loadCurrent() {
    clearNotice();
    els.statusLine.textContent = "Memuat...";
    try {
      const result = await api(
        "/api/content?lang=" + encodeURIComponent(state.lang) + "&page=" + encodeURIComponent(state.page) + "&draft=1"
      );
      state.data = result.data;
      state.dirty = false;
      renderEditor();
      els.statusLine.textContent = "Sumber: " + (result.source || "unknown");
      refreshStatus();
    } catch (err) {
      // Fallback to published local JSON for offline/local use.
      try {
        const res = await fetch("../content/" + state.lang + "/" + state.page + ".json", { cache: "no-store" });
        if (!res.ok) throw err;
        state.data = await res.json();
        state.dirty = false;
        renderEditor();
        els.statusLine.textContent = "Sumber lokal (API draft belum tersedia)";
        showNotice("err", "API draft tidak tersedia. Menampilkan konten lokal. Simpan/Publish membutuhkan Vercel + GitHub.");
      } catch (e2) {
        showNotice("err", err.message);
        els.statusLine.textContent = "";
      }
    }
  }

  async function refreshStatus() {
    try {
      const st = await api(
        "/api/content/status?lang=" + encodeURIComponent(state.lang) + "&page=" + encodeURIComponent(state.page)
      );
      const draft = st.draft?.exists ? "draft ada" : "draft belum ada";
      const pub = st.published?.exists ? "published ada" : "published belum ada";
      els.statusLine.textContent = pub + " · " + draft;
    } catch {
      /* ignore on local */
    }
  }

  function buildNav() {
    els.nav.innerHTML = "";
    PAGES.forEach(function (p) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-item" + (p.id === state.page ? " active" : "");
      btn.textContent = p.label;
      btn.addEventListener("click", async function () {
        if (state.dirty && !confirm("Ada perubahan belum disimpan. Pindah halaman?")) return;
        state.page = p.id;
        buildNav();
        await loadCurrent();
      });
      els.nav.appendChild(btn);
    });
  }

  async function ensureAuth() {
    try {
      const me = await api("/api/auth/me");
      state.authenticated = !!me.authenticated;
    } catch {
      state.authenticated = false;
    }
    els.loginView.classList.toggle("hidden", state.authenticated);
    els.appView.classList.toggle("hidden", !state.authenticated);
    if (state.authenticated) {
      buildNav();
      await loadCurrent();
    }
  }

  els.loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    els.loginError.textContent = "";
    const password = document.getElementById("password").value;
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password: password }) });
      state.authenticated = true;
      await ensureAuth();
    } catch (err) {
      els.loginError.textContent = err.message;
    }
  });

  els.btnLogout.addEventListener("click", async function () {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {
      /* ignore */
    }
    state.authenticated = false;
    location.reload();
  });

  els.lang.addEventListener("change", async function () {
    if (state.dirty && !confirm("Ada perubahan belum disimpan. Ganti bahasa?")) {
      els.lang.value = state.lang;
      return;
    }
    state.lang = els.lang.value;
    await loadCurrent();
  });

  els.btnSave.addEventListener("click", async function () {
    clearNotice();
    try {
      const data = collectData();
      const result = await api("/api/content/save-draft", {
        method: "POST",
        body: JSON.stringify({ lang: state.lang, page: state.page, data: data }),
      });
      state.data = data;
      state.dirty = false;
      showNotice("ok", result.message || "Draft tersimpan ke GitHub");
      refreshStatus();
    } catch (err) {
      showNotice("err", err.message);
    }
  });

  els.btnPublish.addEventListener("click", async function () {
    clearNotice();
    if (!confirm("Publikasikan konten ini ke GitHub? Vercel akan redeploy setelah commit.")) return;
    try {
      const data = collectData();
      const result = await api("/api/content/publish", {
        method: "POST",
        body: JSON.stringify({ lang: state.lang, page: state.page, data: data }),
      });
      state.data = data;
      state.dirty = false;
      showNotice("ok", result.message || "Published to GitHub — Vercel deployment in progress");
      refreshStatus();
    } catch (err) {
      showNotice("err", err.message);
    }
  });

  els.btnPreview.addEventListener("click", function () {
    const meta = PAGES.find(function (p) {
      return p.id === state.page;
    });
    const target = meta.preview[state.lang];
    const url = "../" + target + (target.includes("?") ? "&" : target.includes("#") ? "" : "?") ;
    // Keep hash if present.
    let href;
    if (target.includes("#")) {
      const parts = target.split("#");
      href = "../" + parts[0] + "?preview=1#" + parts[1];
    } else {
      href = "../" + target + "?preview=1";
    }
    window.open(href, "_blank", "noopener");
  });

  ensureAuth();
})();

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
    btnPublish: document.getElementById("btn-publish"),
    btnSaveDraft: document.getElementById("btn-save-draft"),
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

  const RICH_COLORS = {
    white: { className: "cms-color-white", hex: "#ffffff", label: "Putih" },
    black: { className: "cms-color-black", hex: "#111111", label: "Hitam" },
    gold: { className: "cms-color-gold", hex: "#C5A059", label: "Emas" },
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function markdownToEditorHtml(text) {
    var s = String(text == null ? "" : text);
    if (/<\/?(?:strong|b|em|span|br|p)\b/i.test(s)) return s;
    return escapeHtml(s)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function colorClassFromStyle(style) {
    var m = String(style || "").match(/color\s*:\s*([^;]+)/i);
    if (!m) return "";
    var c = m[1].replace(/\s+/g, "").toLowerCase();
    if (c === "#fff" || c === "#ffffff" || c === "white" || c === "rgb(255,255,255)") return "cms-color-white";
    if (c === "#000" || c === "#000000" || c === "#111" || c === "#111111" || c === "black" || c === "rgb(0,0,0)" || c === "rgb(17,17,17)") return "cms-color-black";
    if (c === "#c5a059" || c === "#f5cb68" || c.indexOf("197,160,89") !== -1) return "cms-color-gold";
    return "";
  }

  function normalizeRichNode(node) {
    if (node.nodeType === 3) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    var out = null;
    if (tag === "br") return document.createElement("br");
    if (tag === "strong" || tag === "b") out = document.createElement("strong");
    else if (tag === "em" || tag === "i") out = document.createElement("em");
    else if (tag === "span" || tag === "font") {
      var cls = "";
      var className = String(node.getAttribute("class") || "");
      if (/\bcms-color-white\b|\btext-white\b/.test(className)) cls = "cms-color-white";
      else if (/\bcms-color-black\b|\btext-black\b/.test(className)) cls = "cms-color-black";
      else if (/\bcms-color-gold\b|\btext-gold\b/.test(className)) cls = "cms-color-gold";
      else cls = colorClassFromStyle(node.getAttribute("style"));
      if (!cls && tag === "font") {
        var faceColor = String(node.getAttribute("color") || "").replace(/\s+/g, "").toLowerCase();
        if (faceColor === "#fff" || faceColor === "#ffffff" || faceColor === "white") cls = "cms-color-white";
        else if (faceColor === "#000" || faceColor === "#000000" || faceColor === "#111111" || faceColor === "black") cls = "cms-color-black";
        else if (faceColor === "#c5a059" || faceColor === "#f5cb68") cls = "cms-color-gold";
      }
      if (!cls) {
        var frag = document.createDocumentFragment();
        Array.prototype.forEach.call(node.childNodes, function (child) {
          var w = normalizeRichNode(child);
          if (w) frag.appendChild(w);
        });
        return frag;
      }
      out = document.createElement("span");
      out.className = cls;
    } else if (tag === "p" || tag === "div") {
      out = document.createElement("p");
    } else {
      var passthrough = document.createDocumentFragment();
      Array.prototype.forEach.call(node.childNodes, function (child) {
        var w = normalizeRichNode(child);
        if (w) passthrough.appendChild(w);
      });
      return passthrough;
    }
    Array.prototype.forEach.call(node.childNodes, function (child) {
      var w = normalizeRichNode(child);
      if (w) out.appendChild(w);
    });
    return out;
  }

  function normalizeRichHtml(html, asParagraphs) {
    var root = document.createElement("div");
    root.innerHTML = String(html || "");
    var clean = document.createElement("div");
    Array.prototype.forEach.call(root.childNodes, function (child) {
      var w = normalizeRichNode(child);
      if (w) clean.appendChild(w);
    });
    if (!asParagraphs) {
      return clean.innerHTML
        .replace(/<\/?p>/gi, function (m) {
          return m.toLowerCase() === "<p>" ? "" : "<br><br>";
        })
        .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>")
        .replace(/^(?:<br\s*\/?>)+|(?:<br\s*\/?>)+$/gi, "")
        .trim();
    }
    var parts = [];
    var blocks = clean.querySelectorAll("p");
    if (blocks.length) {
      Array.prototype.forEach.call(blocks, function (p) {
        var inner = p.innerHTML.trim();
        if (inner) parts.push(inner);
      });
    } else {
      var raw = clean.innerHTML.trim();
      if (raw) {
        raw.split(/(?:<br\s*\/?>\s*){2,}/i).forEach(function (chunk) {
          var t = chunk.replace(/^(?:<br\s*\/?>)+|(?:<br\s*\/?>)+$/gi, "").trim();
          if (t) parts.push(t);
        });
      }
    }
    return parts;
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

  function richField(label, key, value, options) {
    options = options || {};
    const asParagraphs = !!options.paragraphs;
    const tall = !!options.tall;
    const wrap = document.createElement("div");
    wrap.className = "field" + (tall ? " tall" : "");
    const lab = document.createElement("label");
    lab.textContent = label;
    wrap.appendChild(lab);

    const box = document.createElement("div");
    box.className = "wysiwyg";

    const toolbar = document.createElement("div");
    toolbar.className = "wysiwyg-toolbar";

    function toolButton(html, title, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = title;
      btn.innerHTML = html;
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
      });
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        editor.focus();
        onClick();
        state.dirty = true;
      });
      toolbar.appendChild(btn);
      return btn;
    }

    toolButton("<strong>B</strong>", "Bold", function () {
      document.execCommand("bold", false, null);
    });

    const sep = document.createElement("span");
    sep.className = "wysiwyg-sep";
    toolbar.appendChild(sep);

    Object.keys(RICH_COLORS).forEach(function (name) {
      const meta = RICH_COLORS[name];
      toolButton(
        '<span class="wysiwyg-swatch ' + name + '"></span>' + meta.label,
        "Warna " + meta.label,
        function () {
          document.execCommand("styleWithCSS", false, true);
          document.execCommand("foreColor", false, meta.hex);
        }
      );
    });

    const editor = document.createElement("div");
    editor.className = "wysiwyg-editor";
    editor.contentEditable = "true";
    editor.dataset.key = key;
    editor.dataset.rich = "1";
    if (asParagraphs) editor.dataset.paragraphs = "1";

    if (asParagraphs) {
      const list = Array.isArray(value)
        ? value
        : String(value || "")
            .split(/\n\s*\n/)
            .map(function (p) {
              return p.trim();
            })
            .filter(Boolean);
      editor.innerHTML = list.length
        ? list.map(function (p) {
            return "<p>" + markdownToEditorHtml(p) + "</p>";
          }).join("")
        : "<p><br></p>";
    } else {
      const html = markdownToEditorHtml(value);
      editor.innerHTML = html || "<br>";
    }

    editor.addEventListener("input", function () {
      state.dirty = true;
    });

    box.appendChild(toolbar);
    box.appendChild(editor);
    wrap.appendChild(box);

    const hint = document.createElement("div");
    hint.className = "wysiwyg-hint";
    hint.textContent = "Blok teks: Bold + warna Putih / Hitam / Emas. Blok seleksi dulu, lalu klik tombol.";
    wrap.appendChild(hint);
    return wrap;
  }

  function readFields(root) {
    const out = {};
    root.querySelectorAll("[data-key]").forEach(function (el) {
      if (el.dataset.rich === "1") {
        out[el.dataset.key] = normalizeRichHtml(el.innerHTML, el.dataset.paragraphs === "1");
      } else {
        out[el.dataset.key] = el.value;
      }
    });
    return out;
  }

  function paragraphsFromTextarea(text) {
    if (Array.isArray(text)) {
      return text
        .map(function (p) {
          return String(p || "").trim();
        })
        .filter(Boolean);
    }
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
      card.appendChild(richField("Lead", "lead", data.lead, { tall: true }));
      card.appendChild(
        richField(
          "Paragraf firma",
          "firmParagraphs",
          data.firmParagraphs || (data.paragraphs || []).slice(0, 2),
          { paragraphs: true, tall: true }
        )
      );
      card.appendChild(field("Officium — judul", "officiumNobile.title", data.officiumNobile?.title));
      card.appendChild(richField("Officium — isi", "officiumNobile.body", data.officiumNobile?.body, { tall: true }));
      card.appendChild(field("Kesaksian — judul", "kesaksian.title", data.kesaksian?.title));
      card.appendChild(
        field(
          "Kesaksian — trilogi (satu baris per item)",
          "kesaksian.trilogy",
          (data.kesaksian?.trilogy || []).join("\n"),
          true
        )
      );
      card.appendChild(richField("Kesaksian — isi", "kesaksian.body", data.kesaksian?.body, { tall: true }));
      card.appendChild(
        richField(
          "Paragraf pilar / filosofi",
          "pillarsParagraphs",
          data.pillarsParagraphs || (data.paragraphs || []).slice(2),
          { paragraphs: true, tall: true }
        )
      );
      card.appendChild(field("Path foto", "photo.src", data.photo?.src));
      card.appendChild(field("Alt foto", "photo.alt", data.photo?.alt));
      card.appendChild(field("Footer brand", "footer.brand", data.footer?.brand));
      card.appendChild(field("Footer label kontak", "footer.contactLabel", data.footer?.contactLabel));
      card.appendChild(field("Footer tautan kontak", "footer.contactHref", data.footer?.contactHref));
    } else if (page === "vision") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(field("Kicker (satu baris per baris)", "kickerLines", (data.kickerLines || []).join("\n"), true));
      card.appendChild(richField("Paragraf", "paragraphs", data.paragraphs || [], { paragraphs: true, tall: true }));
      card.appendChild(
        richField("Pernyataan warisan", "legacyParagraphs", data.legacyParagraphs || [], {
          paragraphs: true,
          tall: true,
        })
      );
    } else if (page === "founder") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      card.appendChild(field("Kicker", "kicker", data.kicker));
      card.appendChild(richField("Lead / nama pendiri", "lead", data.lead, { tall: true }));
      card.appendChild(
        richField("Perkara / catatan", "casesParagraphs", data.casesParagraphs || [], {
          paragraphs: true,
          tall: true,
        })
      );
      card.appendChild(
        richField("Biografi", "bioParagraphs", data.bioParagraphs || [], { paragraphs: true, tall: true })
      );
      card.appendChild(field("Footer brand", "footer.brand", data.footer?.brand));
      card.appendChild(field("Footer label kontak", "footer.contactLabel", data.footer?.contactLabel));
      card.appendChild(field("Footer tautan kontak", "footer.contactHref", data.footer?.contactHref));
    } else if (page === "practice-areas") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(richField("Lead", "lead", data.lead));
      card.appendChild(field("Item praktik (satu per baris)", "items", (data.items || []).join("\n"), true, true));
    } else if (page === "track-record") {
      card.appendChild(field("Judul", "heading", data.heading));
      card.appendChild(field("Kicker", "kicker", data.kicker));
      (data.cases || []).forEach(function (c, i) {
        const block = document.createElement("div");
        block.className = "case-block";
        block.appendChild(field("Kasus " + (i + 1) + " — judul", "case." + i + ".title", c.title));
        block.appendChild(richField("Kasus " + (i + 1) + " — isi", "case." + i + ".body", c.body));
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
          richField("Anggota " + (i + 1) + " — paragraf", "member." + i + ".paragraphs", m.paragraphs || [], {
            paragraphs: true,
            tall: true,
          })
        );
        card.appendChild(block);
      });
    } else if (page === "contact") {
      card.appendChild(field("Eyebrow", "eyebrow", data.eyebrow));
      card.appendChild(field("Judul halaman", "pageTitle", data.pageTitle));
      card.appendChild(field("Kicker pesan", "messageKicker", data.messageKicker));
      card.appendChild(richField("Pesan", "message", data.message, { tall: true }));
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
      data.firmParagraphs = paragraphsFromTextarea(raw.firmParagraphs);
      data.pillarsParagraphs = paragraphsFromTextarea(raw.pillarsParagraphs);
      data.paragraphs = [].concat(data.firmParagraphs || [], data.pillarsParagraphs || []);
      data.officiumNobile = data.officiumNobile || {};
      data.officiumNobile.title = raw["officiumNobile.title"];
      data.officiumNobile.body = raw["officiumNobile.body"];
      data.kesaksian = data.kesaksian || {};
      data.kesaksian.title = raw["kesaksian.title"];
      data.kesaksian.trilogy = linesFromTextarea(raw["kesaksian.trilogy"]);
      data.kesaksian.body = raw["kesaksian.body"];
      data.photo = data.photo || {};
      data.photo.src = raw["photo.src"];
      data.photo.alt = raw["photo.alt"];
      data.footer = data.footer || {};
      data.footer.brand = raw["footer.brand"];
      data.footer.contactLabel = raw["footer.contactLabel"];
      data.footer.contactHref = raw["footer.contactHref"];
    } else if (page === "vision") {
      data.heading = raw.heading;
      data.kickerLines = linesFromTextarea(raw.kickerLines);
      data.paragraphs = paragraphsFromTextarea(raw.paragraphs);
      data.legacyParagraphs = paragraphsFromTextarea(raw.legacyParagraphs);
    } else if (page === "founder") {
      data.eyebrow = raw.eyebrow;
      data.pageTitle = raw.pageTitle;
      data.kicker = raw.kicker;
      data.lead = raw.lead;
      data.casesParagraphs = paragraphsFromTextarea(raw.casesParagraphs);
      data.bioParagraphs = paragraphsFromTextarea(raw.bioParagraphs);
      data.footer = data.footer || {};
      data.footer.brand = raw["footer.brand"];
      data.footer.contactLabel = raw["footer.contactLabel"];
      data.footer.contactHref = raw["footer.contactHref"];
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
        showNotice("err", "API belum tersedia. Menampilkan konten lokal. Publish membutuhkan Vercel + GitHub.");
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

  els.btnPublish.addEventListener("click", async function () {
    clearNotice();
    if (!confirm("Publikasikan konten ini ke situs?")) return;

    const btn = els.btnPublish;
    const prevLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Memproses...";
    showNotice(
      "ok",
      "Sedang memproses publish. Mohon tunggu — situs biasanya siap dalam kurang lebih 5 menit."
    );

    try {
      const data = collectData();
      await api("/api/content/publish", {
        method: "POST",
        body: JSON.stringify({ lang: state.lang, page: state.page, data: data }),
      });
      state.data = data;
      state.dirty = false;
      showNotice(
        "ok",
        "Publish berhasil dikirim. Perubahan sedang diproses di server. Mohon tunggu kurang lebih 5 menit, lalu refresh halaman situs untuk melihat hasilnya."
      );
      refreshStatus();
    } catch (err) {
      showNotice("err", err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  });

  if (els.btnSaveDraft) {
    els.btnSaveDraft.addEventListener("click", async function () {
      clearNotice();
      const btn = els.btnSaveDraft;
      const prevLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Menyimpan...";
      try {
        const data = collectData();
        await api("/api/content/save-draft", {
          method: "POST",
          body: JSON.stringify({ lang: state.lang, page: state.page, data: data }),
        });
        state.data = data;
        state.dirty = false;
        showNotice("ok", "Draft berhasil disimpan.");
        refreshStatus();
      } catch (err) {
        showNotice("err", err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = prevLabel;
      }
    });
  }

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

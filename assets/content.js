(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function paragraphsToHtml(paragraphs) {
    if (!Array.isArray(paragraphs)) return "";
    return paragraphs
      .map(function (p) {
        return escapeHtml(p).replace(/\n/g, "<br>");
      })
      .join("<br><br>");
  }

  function getByPath(obj, path) {
    return String(path)
      .split(".")
      .reduce(function (acc, key) {
        if (acc == null) return undefined;
        return acc[key];
      }, obj);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) throw new Error("Gagal memuat " + url + " (" + res.status + ")");
    const json = await res.json();
    if (json && typeof json === "object" && Object.prototype.hasOwnProperty.call(json, "data")) {
      return json.data;
    }
    return json;
  }

  function contentUrl(lang, page, preview) {
    if (preview) return "/api/content?lang=" + encodeURIComponent(lang) + "&page=" + encodeURIComponent(page) + "&draft=1";
    return "content/" + lang + "/" + page + ".json";
  }

  async function loadPages(lang, pages, preview) {
    const out = {};
    for (const page of pages) {
      out[page] = await fetchJson(contentUrl(lang, page, preview));
    }
    return out;
  }

  function setText(el, value) {
    if (el && value != null) el.textContent = value;
  }

  function setAttr(el, name, value) {
    if (el && value != null) el.setAttribute(name, value);
  }

  function fillSimple(root, data) {
    root.querySelectorAll("[data-cms]").forEach(function (el) {
      const path = el.getAttribute("data-cms");
      const value = getByPath(data, path);
      if (value == null) return;
      if (el.tagName === "SOURCE") {
        setAttr(el, "srcset", value);
        return;
      }
      if (el.tagName === "IMG") {
        setAttr(el, "src", value);
        return;
      }
      if (el.tagName === "A" && el.hasAttribute("data-cms-href")) {
        setText(el, value);
        return;
      }
      setText(el, value);
    });

    root.querySelectorAll("[data-cms-href]").forEach(function (el) {
      const path = el.getAttribute("data-cms-href");
      const value = getByPath(data, path);
      if (value != null) setAttr(el, "href", value);
    });

    root.querySelectorAll("[data-cms-src]").forEach(function (el) {
      const path = el.getAttribute("data-cms-src");
      const value = getByPath(data, path);
      if (value != null) setAttr(el, "src", value);
    });

    root.querySelectorAll("[data-cms-alt]").forEach(function (el) {
      const path = el.getAttribute("data-cms-alt");
      const value = getByPath(data, path);
      if (value != null) setAttr(el, "alt", value);
    });

    root.querySelectorAll("[data-cms-html]").forEach(function (el) {
      const path = el.getAttribute("data-cms-html");
      const value = getByPath(data, path);
      if (Array.isArray(value)) el.innerHTML = paragraphsToHtml(value);
      else if (typeof value === "string") el.innerHTML = escapeHtml(value).replace(/\n/g, "<br>");
    });

    root.querySelectorAll("[data-cms-lines]").forEach(function (el) {
      const path = el.getAttribute("data-cms-lines");
      const value = getByPath(data, path);
      if (Array.isArray(value)) el.innerHTML = value.map(escapeHtml).join("<br>");
    });
  }

  function renderPractice(container, data) {
    if (!container || !data || !Array.isArray(data.items)) return;
    container.innerHTML = data.items
      .map(function (item) {
        return '<div class="practice-item">' + escapeHtml(item) + "</div>";
      })
      .join("");
  }

  function renderCases(container, data) {
    if (!container || !data || !Array.isArray(data.cases)) return;
    container.innerHTML = data.cases
      .map(function (item) {
        return (
          '<div class="case-card"><strong>' +
          escapeHtml(item.title) +
          "</strong><span>" +
          escapeHtml(item.body) +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderTeam(container, data) {
    if (!container || !data || !Array.isArray(data.members)) return;
    container.innerHTML = data.members
      .map(function (m) {
        const photo = m.photo || {};
        return (
          '<article class="partner-card">' +
          '<div class="partner-photo">' +
          '<img alt="' +
          escapeHtml(photo.alt || "") +
          '" loading="lazy" src="' +
          escapeHtml(photo.src || "") +
          '"/>' +
          "</div>" +
          '<div class="partner-copy">' +
          '<h2 class="partner-name">' +
          escapeHtml(m.name || "") +
          "</h2>" +
          '<div class="about-body">' +
          paragraphsToHtml(m.paragraphs || []) +
          "</div></div></article>"
        );
      })
      .join("");
  }

  function renderContactFields(container, data) {
    if (!container || !data || !Array.isArray(data.fields)) return;
    container.innerHTML = data.fields
      .map(function (field) {
        const values = (field.values || [])
          .map(function (v) {
            if (v.href) {
              return (
                '<a href="' +
                escapeHtml(v.href) +
                '"' +
                (String(v.href).startsWith("http") ? ' target="_blank" rel="noopener"' : "") +
                ">" +
                escapeHtml(v.text || "") +
                "</a>"
              );
            }
            return escapeHtml(v.text || "");
          })
          .join("");
        return "<div><dt>" + escapeHtml(field.label || "") + "</dt><dd>" + values + "</dd></div>";
      })
      .join("");
  }

  function applyMeta(data) {
    if (!data || !data.meta) return;
    if (data.meta.title) document.title = data.meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && data.meta.description) desc.setAttribute("content", data.meta.description);
  }

  async function applyNav(lang, preview) {
    try {
      const site = await fetchJson(contentUrl(lang, "site", preview));
      if (!site || !Array.isArray(site.nav)) return;
      const nav = document.querySelector("header.topbar nav");
      if (!nav) return;
      const links = nav.querySelectorAll("a");
      site.nav.forEach(function (item, i) {
        if (!links[i] || !item) return;
        if (item.label) links[i].textContent = item.label;
        if (item.href) links[i].setAttribute("href", item.href);
      });
    } catch (err) {
      /* keep hardcoded nav labels */
    }
  }

  async function boot() {
    const cfg = document.body.dataset;
    const lang = cfg.lang || "id";
    const pages = String(cfg.content || "")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!pages.length) return;

    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview") === "1";

    try {
      await applyNav(lang, preview);
      const bag = await loadPages(lang, pages, preview);
      const primary = bag[pages[0]] || {};
      applyMeta(primary);

      pages.forEach(function (page) {
        const data = bag[page];
        if (!data) return;
        const scope = document.querySelector('[data-cms-scope="' + page + '"]') || document;
        fillSimple(scope, data);

        if (page === "practice-areas") renderPractice(scope.querySelector("[data-cms-practice]") || document.querySelector("[data-cms-practice]"), data);
        if (page === "track-record") renderCases(scope.querySelector("[data-cms-cases]") || document.querySelector("[data-cms-cases]"), data);
        if (page === "team") renderTeam(scope.querySelector("[data-cms-team]") || document.querySelector("[data-cms-team]"), data);
        if (page === "contact") renderContactFields(scope.querySelector("[data-cms-contact-fields]") || document.querySelector("[data-cms-contact-fields]"), data);
      });

      // Apply footer from the first content pack that defines it.
      const footerSource = pages.map(function (p) { return bag[p]; }).find(function (d) { return d && d.footer; });
      const footer = document.querySelector("footer");
      if (footerSource && footer) fillSimple(footer, footerSource);

      if (preview) {
        document.documentElement.classList.add("cms-preview");
        const bar = document.createElement("div");
        bar.className = "cms-preview-bar";
        bar.textContent = "Mode pratinjau draft — belum dipublikasikan";
        document.body.prepend(bar);
      }
    } catch (err) {
      console.error(err);
      const note = document.createElement("div");
      note.className = "cms-load-error";
      note.textContent = "Konten JSON tidak dapat dimuat. Menampilkan salinan bawaan halaman.";
      document.body.prepend(note);
    }
  }

  window.TTSContent = {
    escapeHtml: escapeHtml,
    paragraphsToHtml: paragraphsToHtml,
    loadPages: loadPages,
    boot: boot,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

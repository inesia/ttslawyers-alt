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

  function looksLikeRichHtml(s) {
    return /<\/?(?:strong|b|em|span|br|p)\b/i.test(String(s || ""));
  }

  function sanitizeRichHtml(html) {
    var root = document.createElement("div");
    root.innerHTML = String(html || "");

    function colorClassFromStyle(style) {
      var m = String(style || "").match(/color\s*:\s*([^;]+)/i);
      if (!m) return "";
      var c = m[1].replace(/\s+/g, "").toLowerCase();
      if (c === "#fff" || c === "#ffffff" || c === "white" || c === "rgb(255,255,255)") return "cms-color-white";
      if (c === "#000" || c === "#000000" || c === "#111" || c === "#111111" || c === "black" || c === "rgb(0,0,0)" || c === "rgb(17,17,17)") return "cms-color-black";
      if (c === "#c5a059" || c === "#f5cb68" || c.indexOf("197,160,89") !== -1) return "cms-color-gold";
      return "";
    }

    function walk(node) {
      if (node.nodeType === 3) return document.createTextNode(node.nodeValue);
      if (node.nodeType !== 1) return null;
      var tag = node.tagName.toLowerCase();
      var out = null;
      if (tag === "br") return document.createElement("br");
      if (tag === "strong" || tag === "b") {
        out = document.createElement("strong");
      } else if (tag === "em" || tag === "i") {
        out = document.createElement("em");
      } else if (tag === "span" || tag === "font") {
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
            var w = walk(child);
            if (w) frag.appendChild(w);
          });
          return frag;
        }
        out = document.createElement("span");
        out.className = cls;
      } else if (tag === "p" || tag === "div") {
        out = document.createElement("span");
      } else {
        var passthrough = document.createDocumentFragment();
        Array.prototype.forEach.call(node.childNodes, function (child) {
          var w = walk(child);
          if (w) passthrough.appendChild(w);
        });
        return passthrough;
      }
      Array.prototype.forEach.call(node.childNodes, function (child) {
        var w = walk(child);
        if (w) out.appendChild(w);
      });
      return out;
    }

    var clean = document.createElement("div");
    Array.prototype.forEach.call(root.childNodes, function (child) {
      var w = walk(child);
      if (w) clean.appendChild(w);
    });
    return clean.innerHTML;
  }

  function formatParagraph(p) {
    if (!p) return "";
    var s = String(p).trim();

    if (looksLikeRichHtml(s)) {
      var rich = sanitizeRichHtml(s);
      rich = rich.replace(
        /<(strong|span)([^>]*)>(TESTIMONI EMAS MURNI|PURE GOLD TESTIMONI)<\/\1>/gi,
        '<strong class="text-white">$3</strong>'
      );
      return rich;
    }

    var isWholeBold = false;
    if (s.startsWith("**") && s.endsWith("**") && s.length > 4) {
      s = s.slice(2, -2).trim();
      isWholeBold = true;
    }

    var escaped = escapeHtml(s).replace(/\n/g, "<br>");

    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(
      /<strong>(TESTIMONI EMAS MURNI|PURE GOLD TESTIMONI)<\/strong>/g,
      '<strong class="text-white">$1</strong>'
    );

    escaped = escaped.replace(
      /^((?:TUJUAN PENDIRIAN|FILOSOFI|Purpose|Philosophy[^\:\<]*|Founder&#39;s Experience|Methodology)\s*[:\-]\s*)/i,
      "<strong>$1</strong>"
    );

    var isKnownTitle = (
      isWholeBold ||
      s === "VISI" ||
      s === "TRACK RECORDS" ||
      s === "REVOLUSI PEMBAHARUAN HUKUM DUNIA" ||
      s === "REVOLUSI PEMBAHARUAN HUKUM DI DUNIA" ||
      s === "REVOLUTIONARY LEGAL REFORM IN THE WORLD" ||
      s === "“UNSECURED CREDITOR” - “KREDITOR TIDAK TERJAMIN” DIGANTI MENJADI “KREDITOR UMUM”" ||
      s === "“UNSECURED CREDITOR” BE REPLACED BY “GENERAL CREDITOR”" ||
      s.indexOf("PENYELESAIAN DI LUAR DAN DI DALAM") === 0 ||
      s === "Methodology:"
    );

    if (isKnownTitle) {
      return '<strong class="sub-title-block">' + escaped + "</strong>";
    }

    return escaped;
  }

  function paragraphsToHtml(paragraphs) {
    if (!Array.isArray(paragraphs)) return "";
    return paragraphs
      .map(function (p) {
        var formatted = formatParagraph(p);
        if (formatted.indexOf('class="sub-title-block"') !== -1) {
          return formatted
            .replace(/^<strong class="sub-title-block">/, '<div class="sub-title-block">')
            .replace(/<\/strong>$/, "</div>");
        }
        return "<p>" + formatted + "</p>";
      })
      .join("");
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
      if (Array.isArray(value)) {
        el.innerHTML = paragraphsToHtml(value);
      } else if (typeof value === "string") {
        var html = formatParagraph(value);
        if (el.tagName === "P" || el.tagName === "SPAN" || el.tagName === "A" || el.tagName === "STRONG") {
          el.innerHTML = html;
        } else {
          el.innerHTML = "<p>" + html + "</p>";
        }
      }
    });

    root.querySelectorAll("[data-cms-lines]").forEach(function (el) {
      const path = el.getAttribute("data-cms-lines");
      const value = getByPath(data, path);
      if (Array.isArray(value)) {
        el.innerHTML = value
          .map(function (line) {
            return "<div>" + formatParagraph(line) + "</div>";
          })
          .join("");
      }
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

  function renderCaseBody(body) {
    if (looksLikeRichHtml(body)) {
      return "<span>" + formatParagraph(body) + "</span>";
    }
    var lines = String(body || "").split(/\n/);
    var bullets = [];
    var plain = [];
    lines.forEach(function (line) {
      var s = line.trim();
      if (!s) return;
      if (/^[•\-\u2022]\s*/.test(s)) {
        bullets.push(s.replace(/^[•\-\u2022]\s*/, ""));
      } else {
        plain.push(s);
      }
    });
    if (bullets.length && !plain.length) {
      return (
        '<ul class="case-sub-list">' +
        bullets
          .map(function (b) {
            return "<li>" + escapeHtml(b) + "</li>";
          })
          .join("") +
        "</ul>"
      );
    }
    return (
      "<span>" +
      escapeHtml(body || "").replace(/\n/g, "<br>") +
      "</span>"
    );
  }

  function renderCases(container, data) {
    if (!container || !data || !Array.isArray(data.cases)) return;
    container.innerHTML = data.cases
      .map(function (item) {
        return (
          '<div class="case-card"><strong>' +
          escapeHtml(item.title) +
          "</strong>" +
          renderCaseBody(item.body) +
          "</div>"
        );
      })
      .join("");
  }

  function renderFounder(scope, data) {
    if (!scope || !data) return;
    var lead = scope.querySelector("[data-cms-founder-lead]");
    if (lead && data.lead) {
      lead.innerHTML = "<strong>" + escapeHtml(data.lead) + "</strong>";
    }
    var cases = scope.querySelector("[data-cms-founder-cases]");
    if (cases && Array.isArray(data.casesParagraphs)) {
      cases.innerHTML = data.casesParagraphs
        .map(function (p) {
          return "<p>" + formatParagraph(p) + "</p>";
        })
        .join("");
    }
    var bio = scope.querySelector("[data-cms-founder-bio]");
    if (bio && Array.isArray(data.bioParagraphs)) {
      var title = "";
      var bullets = [];
      var after = [];
      var inBullets = false;
      data.bioParagraphs.forEach(function (p) {
        var s = String(p || "").trim();
        if (/^[•\-\u2022]\s*/.test(s)) {
          inBullets = true;
          bullets.push(s.replace(/^[•\-\u2022]\s*/, ""));
        } else if (!inBullets) {
          title = s;
        } else {
          after.push(s);
        }
      });
      bio.innerHTML =
        (title ? "<p>" + formatParagraph(title) + "</p>" : "") +
        (bullets.length
          ? '<ul class="exp-bullet-list">' +
            bullets
              .map(function (b) {
                return "<li>" + escapeHtml(b) + "</li>";
              })
              .join("") +
            "</ul>"
          : "") +
        after
          .map(function (p) {
            return "<p>" + formatParagraph(p) + "</p>";
          })
          .join("");
    }
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
          (m.paragraphs || [])
            .map(function (p) {
              var s = String(p).trim();
              if (s.startsWith("“") || s.startsWith('"')) {
                return '<div class="partner-quote">' + escapeHtml(s) + '</div>';
              }
              return '<p>' + formatParagraph(p) + '</p>';
            })
            .join("") +
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
        const scopes = document.querySelectorAll('[data-cms-scope="' + page + '"]');
        if (scopes.length > 0) {
          scopes.forEach(function (scope) {
            fillSimple(scope, data);
          });
        } else {
          fillSimple(document, data);
        }

        const primaryScope = scopes[0] || document;
        if (page === "founder") renderFounder(primaryScope, data);
        if (page === "practice-areas") {
          renderPractice(primaryScope.querySelector("[data-cms-practice]") || document.querySelector("[data-cms-practice]"), data);
        }
        if (page === "track-record") {
          renderCases(primaryScope.querySelector("[data-cms-cases]") || document.querySelector("[data-cms-cases]"), data);
        }
        if (page === "team") renderTeam(primaryScope.querySelector("[data-cms-team]") || document.querySelector("[data-cms-team]"), data);
        if (page === "contact") renderContactFields(primaryScope.querySelector("[data-cms-contact-fields]") || document.querySelector("[data-cms-contact-fields]"), data);
        if (page === "vision") {
          var visionBody = primaryScope.querySelector("[data-cms-vision-body]");
          if (visionBody) {
            var parts = []
              .concat(Array.isArray(data.paragraphs) ? data.paragraphs : [])
              .concat(Array.isArray(data.legacyParagraphs) ? data.legacyParagraphs : []);
            visionBody.innerHTML = paragraphsToHtml(parts);
          }
        }
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

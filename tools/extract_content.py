# -*- coding: utf-8 -*-
"""Extract exact page content into /content JSON files."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def decode(s: str) -> str:
    return html.unescape(s)


def split_paras(raw: str) -> list[str]:
    raw = raw.replace("<br/>", "<br>").replace("<br />", "<br>")
    parts = re.split(r"(?:<br>\s*){2,}", raw)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        p = re.sub(r"<br>\s*", "\n", p)
        out.append(decode(p))
    return out


def write(lang: str, name: str, data: dict) -> None:
    d = ROOT / "content" / lang
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{name}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


def extract_between(html_text: str, start_marker: str, end_marker: str) -> str:
    i = html_text.find(start_marker)
    if i < 0:
        raise SystemExit(f"missing start {start_marker!r}")
    i += len(start_marker)
    j = html_text.find(end_marker, i)
    if j < 0:
        raise SystemExit(f"missing end {end_marker!r}")
    return html_text[i:j]


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def main() -> None:
    # HOME
    write(
        "id",
        "home",
        {
            "meta": {
                "title": "Home | TTS Law Firm",
                "description": "TTS Law Firm — Timotius & Partners",
            },
            "hero": {
                "eyebrow": "TTS LAW FIRM · TIMOTIUS & PARTNERS",
                "title": "Dengan Hukum, Bisnis Anda Terjamin.",
                "ctaLabel": "Jelajahi Profil Firma ↗",
                "ctaHref": "firma-hukum.html",
                "desktopImage": "assets/hero.jpg",
                "mobileImage": "assets/hero.jpg",
                "alt": "Timotius & Partners — TTS Law Firm",
            },
            "footer": {
                "brand": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                "contactLabel": "HUBUNGI KAMI",
                "contactHref": "kontak.html",
            },
        },
    )
    write(
        "en",
        "home",
        {
            "meta": {
                "title": "Home | TTS Law Firm",
                "description": "TTS Law Firm — Timotius & Partners",
            },
            "hero": {
                "eyebrow": "TTS LAW FIRM · TIMOTIUS & PARTNERS",
                "title": "With Law, Your Business Is Secured.",
                "ctaLabel": "Explore Our Firm ↗",
                "ctaHref": "en-firma-hukum.html",
                "desktopImage": "assets/hero.jpg",
                "mobileImage": "assets/hero.jpg",
                "alt": "Timotius & Partners — TTS Law Firm",
            },
            "footer": {
                "brand": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                "contactLabel": "CONTACT",
                "contactHref": "en-kontak.html",
            },
        },
    )

    # ABOUT from HTML
    for lang, page in (("id", "firma-hukum.html"), ("en", "en-firma-hukum.html")):
        t = read(page)
        kicker = decode(re.search(r'about-kicker">(.*?)</div>', t, re.S).group(1).strip())
        lead = decode(re.search(r'about-lead">(.*?)</div>', t, re.S).group(1).strip())
        body = re.search(r'about-body">(.*?)</div>', t, re.S).group(1)
        photo = re.search(r'about-photo">\s*<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"', t, re.S)
        if not photo:
            photo = re.search(r'about-photo">\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"', t, re.S)
            alt, src = photo.group(2), photo.group(1)
        else:
            alt, src = photo.group(1), photo.group(2)
        footer_brand = decode(re.search(r"<footer>\s*<div>(.*?)</div>", t, re.S).group(1).strip())
        footer_a = re.search(r"<footer>.*?<a href=\"([^\"]+)\">(.*?)</a>", t, re.S)
        write(
            lang,
            "about",
            {
                "meta": {
                    "title": "About | TTS Law Firm",
                    "description": "TTS Law Firm — Timotius & Partners",
                },
                "eyebrow": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                "pageTitle": "About",
                "kicker": kicker,
                "lead": lead,
                "paragraphs": split_paras(body),
                "photo": {"src": src, "alt": decode(alt)},
                "footer": {
                    "brand": footer_brand,
                    "contactLabel": decode(footer_a.group(2).strip()),
                    "contactHref": footer_a.group(1),
                },
            },
        )

    # VISION from about pages
    for lang, page in (("id", "firma-hukum.html"), ("en", "en-firma-hukum.html")):
        t = read(page)
        heading = decode(re.search(r'id="visi">(.*?)</h2>', t, re.S).group(1).strip())
        kick = re.search(r'about-vision[\s\S]*?about-kicker">(.*?)</div>', t, re.S).group(1)
        body = re.search(r'about-vision[\s\S]*?about-body">(.*?)</div>', t, re.S).group(1)
        legacy = re.search(r'about-legacy[\s\S]*?about-body">(.*?)</div>', t, re.S).group(1)
        write(
            lang,
            "vision",
            {
                "meta": {
                    "title": "About | TTS Law Firm",
                    "description": "TTS Law Firm — Timotius & Partners",
                },
                "heading": heading,
                "kickerLines": [decode(x) for x in re.split(r"<br\s*/?>", kick) if x.strip()],
                "paragraphs": split_paras(body),
                "legacyParagraphs": split_paras(legacy),
            },
        )

    # FOUNDER / PRACTICE / TRACK from expertise pages
    for lang, page in (("id", "pendiri.html"), ("en", "en-pendiri.html")):
        t = read(page)
        page_title = decode(re.search(r"<h1>(.*?)</h1>", t, re.S).group(1).strip())
        eyebrow = decode(re.search(r'page-intro">\s*<div class="eyebrow">(.*?)</div>', t, re.S).group(1).strip())
        kicker = decode(re.search(r'exp-founder">\s*<div class="source-block about-kicker">(.*?)</div>', t, re.S).group(1).strip())
        cases = re.search(r'exp-founder-grid">\s*<div class="source-block about-body">(.*?)</div>', t, re.S).group(1)
        bio = re.search(r'exp-founder-bio">(.*?)</div>', t, re.S).group(1)
        footer_a = re.search(r"<footer>.*?<a href=\"([^\"]+)\">(.*?)</a>", t, re.S)
        write(
            lang,
            "founder",
            {
                "meta": {
                    "title": "Expertise | TTS Law Firm",
                    "description": "TTS Law Firm — Timotius & Partners",
                },
                "eyebrow": eyebrow,
                "pageTitle": page_title,
                "kicker": kicker,
                "casesParagraphs": split_paras(cases),
                "bioParagraphs": split_paras(bio),
                "footer": {
                    "brand": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                    "contactLabel": decode(footer_a.group(2).strip()),
                    "contactHref": footer_a.group(1),
                },
            },
        )

        prac_heading = decode(re.search(r'id="jasa">(.*?)</h2>', t, re.S).group(1).strip())
        prac_lead = decode(re.search(r'exp-practice">\s*<div class="source-block about-lead">(.*?)</div>', t, re.S).group(1).strip())
        items = [decode(x) for x in re.findall(r'class="practice-item">(.*?)</div>', t, re.S)]
        write(
            lang,
            "practice-areas",
            {
                "heading": prac_heading,
                "lead": prac_lead,
                "items": items,
            },
        )

        track_heading = decode(re.search(r'id="pengalaman">(.*?)</h2>', t, re.S).group(1).strip())
        track_kicker = decode(
            re.search(r'exp-experience-wrap">[\s\S]*?about-kicker">(.*?)</div>', t, re.S).group(1).strip()
        )
        cards = []
        for m in re.finditer(r'class="case-card"><strong>(.*?)</strong><span>(.*?)</span></div>', t, re.S):
            cards.append({"title": decode(m.group(1).strip()), "body": decode(m.group(2).strip())})
        write(
            lang,
            "track-record",
            {
                "heading": track_heading,
                "kicker": track_kicker,
                "cases": cards,
            },
        )

    # TEAM / PARTNERS
    for lang, page in (("id", "partners.html"), ("en", "en-partners.html")):
        t = read(page)
        page_title = decode(re.search(r"<h1>(.*?)</h1>", t, re.S).group(1).strip())
        eyebrow = decode(re.search(r'page-intro">\s*<div class="eyebrow">(.*?)</div>', t, re.S).group(1).strip())
        members = []
        for m in re.finditer(
            r'partner-card">\s*<div class="partner-photo">\s*<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>\s*</div>\s*<div class="partner-copy">\s*<h2 class="partner-name">(.*?)</h2>\s*<div class="about-body">(.*?)</div>',
            t,
            re.S,
        ):
            members.append(
                {
                    "name": decode(m.group(3).strip()),
                    "photo": {"src": m.group(2), "alt": decode(m.group(1))},
                    "paragraphs": split_paras(m.group(4)),
                }
            )
        if not members:
            # alt attribute order
            for m in re.finditer(
                r'partner-card">\s*<div class="partner-photo">\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>\s*</div>\s*<div class="partner-copy">\s*<h2 class="partner-name">(.*?)</h2>\s*<div class="about-body">(.*?)</div>',
                t,
                re.S,
            ):
                members.append(
                    {
                        "name": decode(m.group(3).strip()),
                        "photo": {"src": m.group(1), "alt": decode(m.group(2))},
                        "paragraphs": split_paras(m.group(4)),
                    }
                )
        footer_a = re.search(r"<footer>.*?<a href=\"([^\"]+)\">(.*?)</a>", t, re.S)
        write(
            lang,
            "team",
            {
                "meta": {
                    "title": "Partners | TTS Law Firm",
                    "description": "TTS Law Firm — Timotius & Partners",
                },
                "eyebrow": eyebrow,
                "pageTitle": page_title,
                "members": members,
                "footer": {
                    "brand": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                    "contactLabel": decode(footer_a.group(2).strip()),
                    "contactHref": footer_a.group(1),
                },
            },
        )

    # CONTACT
    for lang, page in (("id", "kontak.html"), ("en", "en-kontak.html")):
        t = read(page)
        page_title = decode(re.search(r"<h1>(.*?)</h1>", t, re.S).group(1).strip())
        eyebrow = decode(re.search(r'page-intro">\s*<div class="eyebrow">(.*?)</div>', t, re.S).group(1).strip())
        msg_kicker = decode(re.search(r'contact-message">\s*<div class="source-block about-kicker">(.*?)</div>', t, re.S).group(1).strip())
        message = decode(re.search(r'contact-message">[\s\S]*?about-lead">(.*?)</p>', t, re.S).group(1).strip())
        motto = decode(re.search(r'contact-motto">(.*?)</p>', t, re.S).group(1).strip())
        card_kicker = decode(re.search(r'contact-card">\s*<div class="source-block about-kicker">(.*?)</div>', t, re.S).group(1).strip())
        fields = []
        for m in re.finditer(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", t, re.S):
            label = decode(m.group(1).strip())
            dd = m.group(2)
            links = re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', dd, re.S)
            if links:
                fields.append(
                    {
                        "label": label,
                        "values": [{"href": href, "text": decode(text.strip())} for href, text in links],
                    }
                )
            else:
                fields.append({"label": label, "values": [{"text": decode(re.sub(r"<[^>]+>", "", dd).strip())}]})
        footer_a = re.search(r"<footer>.*?<a href=\"([^\"]+)\">(.*?)</a>", t, re.S)
        write(
            lang,
            "contact",
            {
                "meta": {
                    "title": "Contact | TTS Law Firm",
                    "description": "TTS Law Firm — Timotius & Partners",
                },
                "eyebrow": eyebrow,
                "pageTitle": page_title,
                "messageKicker": msg_kicker,
                "message": message,
                "motto": motto,
                "cardKicker": card_kicker,
                "fields": fields,
                "footer": {
                    "brand": "TTS LAW FIRM — TIMOTIUS & PARTNERS",
                    "contactLabel": decode(footer_a.group(2).strip()),
                    "contactHref": footer_a.group(1),
                },
            },
        )

    # shared site chrome (nav labels kept as current English menu for both)
    write(
        "id",
        "site",
        {
            "brandMark": "TTS",
            "brandName": "TIMOTIUS & PARTNERS",
            "brandSub": "LAW FIRM",
            "nav": [
                {"label": "Home", "href": "index.html"},
                {"label": "About", "href": "firma-hukum.html"},
                {"label": "Expertise", "href": "pendiri.html"},
                {"label": "Partners", "href": "partners.html"},
                {"label": "Contact", "href": "kontak.html"},
            ],
        },
    )
    write(
        "en",
        "site",
        {
            "brandMark": "TTS",
            "brandName": "TIMOTIUS & PARTNERS",
            "brandSub": "LAW FIRM",
            "nav": [
                {"label": "Home", "href": "en-index.html"},
                {"label": "About", "href": "en-firma-hukum.html"},
                {"label": "Expertise", "href": "en-pendiri.html"},
                {"label": "Partners", "href": "en-partners.html"},
                {"label": "Contact", "href": "en-kontak.html"},
            ],
        },
    )

    print("done")


if __name__ == "__main__":
    main()

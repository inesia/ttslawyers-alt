# -*- coding: utf-8 -*-
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = [
    ("id", "about", "lead", "Didirikan Oleh Dr. (Commerce) Timotius Tumbur Simbolon"),
    ("id", "about", "kicker", "FIRMA HUKUM KAMI"),
    ("en", "about", "kicker", "OUR FIRM"),
    ("id", "vision", "heading", "Visi & Pembaharuan Hukum"),
    ("en", "vision", "heading", "Vision & Legal Reform"),
    ("id", "founder", "kicker", "KEAHLIAN - PENDIRI"),
    ("en", "home", "hero.title", "With Law, Your Business Is Secured."),
    ("id", "home", "hero.title", "Dengan Hukum, Bisnis Anda Terjamin."),
    ("id", "contact", "motto", "“Dengan Hukum, Bisnis Anda Terjamin.”"),
    ("en", "contact", "motto", "“With Law, Your Business Is Secured.”"),
]


def get(obj, path):
    cur = obj
    for part in path.split("."):
        cur = cur[part]
    return cur


def main():
    for lang, page, path, needle in checks:
        data = json.loads((ROOT / "content" / lang / f"{page}.json").read_text(encoding="utf-8"))
        value = get(data, path)
        assert needle in value, (lang, page, path, value)
        print("OK", lang, page, path)
    team = json.loads((ROOT / "content/id/team.json").read_text(encoding="utf-8"))
    assert len(team["members"]) == 4
    track = json.loads((ROOT / "content/id/track-record.json").read_text(encoding="utf-8"))
    assert len(track["cases"]) == 11
    prac = json.loads((ROOT / "content/id/practice-areas.json").read_text(encoding="utf-8"))
    assert len(prac["items"]) == 10
    print("counts OK")


if __name__ == "__main__":
    main()

from pathlib import Path
from pypdf import PdfReader
import re
import json
import html as htmlmod

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / ".doc" / "1-HITAM - EXECUTIVE FIRM PROFILE - ENGLISH LETAK SESUAI WEB TERBARU.docx.pdf"


def pdf_text(path: Path) -> str:
    r = PdfReader(str(path))
    parts = []
    for page in r.pages:
        t = page.extract_text() or ""
        toks = [tok.strip() for tok in re.split(r"\s+", t) if tok.strip()]
        if toks and re.fullmatch(r"\d{1,2}", toks[-1]):
            toks = toks[:-1]
        s = " ".join(toks)
        s = re.sub(r"\s+([,.;:!?])", r"\1", s)
        s = re.sub(r"\(\s+", "(", s)
        s = re.sub(r"\s+\)", ")", s)
        s = re.sub(r"\s*/\s*", "/", s)
        s = re.sub(r"(\w)-\s+(\w)", r"\1-\2", s)
        parts.append(s)
    return "\n\n".join(parts)


def strip_fmt(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("**", "")
    s = htmlmod.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


pdf = pdf_text(PDF)
(ROOT / ".doc" / "_en_pdf_norm.txt").write_text(pdf, encoding="utf-8")

about = json.loads((ROOT / "content/en/about.json").read_text(encoding="utf-8"))
founder = json.loads((ROOT / "content/en/founder.json").read_text(encoding="utf-8"))
vision = json.loads((ROOT / "content/en/vision.json").read_text(encoding="utf-8"))
contact = json.loads((ROOT / "content/en/contact.json").read_text(encoding="utf-8"))

key_pdf = [
    "legal services",
    "charter party",
    'proven right as true "Pure Gold" in the PURE GOLD TESTIMONI',
    "FOUNDER PURE GOLD TESTIMONI",
    "he served as Head of Legal",
    "Landmark Matters Won Under Founder's Counsel",
    "He advised the government",
    "simbolonlaw@ttslawyers.com",
    "DO NOT CHASE POWER - CHASE THE PURPOSE",
    'replaced by "General Creditor(s)"',
    "replaced by “General Creditor(s)”",
]

print("=== KEY PDF PHRASES ===")
for k in key_pdf:
    print(("OK  " if k in pdf else "MISS"), k)

print("\n=== CURRENT SITE FLAGS ===")
print("lead has practices:", "legal practices" in about["lead"])
print("lead has services:", "legal services" in about["lead"])
print("about charterparty:", "charterparty" in json.dumps(about))
print("about charter party:", "charter party" in json.dumps(about))
print("officium portals:", "digital media" in about["officiumNobile"]["body"].lower())
print("kesaksian title:", about["kesaksian"]["title"])
print("rockefeller in pillars:", "ROCKEFELLER" in json.dumps(about.get("pillarsParagraphs")))
print("rockefeller in vision:", "ROCKEFELLER" in json.dumps(vision))
print("founder para0:", founder["casesParagraphs"][0][:90])
print("founder bio0:", founder["bioParagraphs"][0])
adv = [p for p in founder["bioParagraphs"] if "advis" in p.lower()]
print("founder advis*:", adv[0][:100] if adv else None)
print("contact fields:")
for f in contact["fields"]:
    print(" -", f["label"], "=>", f["values"])

print("\n=== PDF SNIPPETS ===")
for label, needle in [
    ("officium", "OFFICIUM NOBILE"),
    ("rockefeller", "DO NOT CHASE"),
    ("expertise", "EXPERTISE"),
    ("contact", "MESSAGE FROM"),
    ("unsecured", "UNSECURED CREDITOR"),
]:
    idx = pdf.find(needle)
    print("\n---", label, "---")
    print(pdf[idx : idx + 420] if idx >= 0 else "NOT FOUND")

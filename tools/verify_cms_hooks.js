const fs = require("fs");

const checks = [
  ["firma-hukum.html", 'data-content="about,vision"'],
  ["firma-hukum.html", 'data-cms-html="firmParagraphs"'],
  ["firma-hukum.html", 'data-cms-html="pillarsParagraphs"'],
  ["firma-hukum.html", "data-cms-vision-body"],
  ["firma-hukum.html", 'data-cms-lines="kesaksian.trilogy"'],
  ["pendiri.html", 'data-content="founder,practice-areas,track-record"'],
  ["pendiri.html", "data-cms-founder-lead"],
  ["pendiri.html", "data-cms-founder-cases"],
  ["pendiri.html", "data-cms-founder-bio"],
  ["pendiri.html", "data-cms-practice"],
  ["pendiri.html", "data-cms-cases"],
  ["partners.html", 'data-content="team"'],
  ["partners.html", "data-cms-team"],
  ["kontak.html", 'data-content="contact"'],
  ["kontak.html", "data-cms-contact-fields"],
  ["en-firma-hukum.html", 'data-cms-html="firmParagraphs"'],
  ["en-pendiri.html", 'data-content="founder,practice-areas,track-record"'],
  ["en-partners.html", "data-cms-team"],
  ["en-kontak.html", 'data-content="contact"'],
  ["index.html", 'data-content="home"'],
];

let ok = true;
for (const [file, needle] of checks) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes(needle)) {
    console.log("FAIL", file, needle);
    ok = false;
  } else {
    console.log("OK", file, needle);
  }
}

const about = JSON.parse(fs.readFileSync("content/id/about.json", "utf8"));
for (const k of ["firmParagraphs", "pillarsParagraphs", "officiumNobile", "kesaksian"]) {
  if (!(k in about)) {
    console.log("JSON missing", k);
    ok = false;
  } else console.log("JSON OK", k);
}

const founder = JSON.parse(fs.readFileSync("content/id/founder.json", "utf8"));
for (const k of ["lead", "casesParagraphs", "bioParagraphs"]) {
  if (!(k in founder)) {
    console.log("founder missing", k);
    ok = false;
  } else console.log("founder OK", k);
}

const admin = fs.readFileSync("admin/admin.js", "utf8");
for (const needle of ["firmParagraphs", "pillarsParagraphs", "officiumNobile.body", "kesaksian.trilogy", 'field("Lead / nama pendiri"']) {
  if (!admin.includes(needle)) {
    console.log("ADMIN FAIL", needle);
    ok = false;
  } else console.log("ADMIN OK", needle);
}

console.log(ok ? "ALL HOOKS OK" : "SOME FAILED");
process.exit(ok ? 0 : 1);

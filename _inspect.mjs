import fs from "fs";
const h = fs.readFileSync("src/lib/bible/fixtures/golden/csb-luk-23.html", "utf8");
const i = h.indexOf('LUK 23:38');
// print a wide slice from v38 marker
console.log(JSON.stringify(h.slice(i, i + 620)));

/**
 * Probe Commons for Doré New Testament plates (not in the numbered category).
 * Slow + rate-limit aware. Prints, for each scene title, the best verified
 * Doré-looking Commons file whose thumbnail URL resolves (HTTP 200).
 */
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "yourbible-plate-discovery/1.0 (dev script)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// scene title -> search phrase (a few tuned for Doré's actual Commons titles)
const targets = [
  ["The Annunciation", "Dore Annunciation"],
  ["The Nativity", "Dore Nativity Bible"],
  ["The Star of Bethlehem", "Dore Star of Bethlehem"],
  ["The Flight into Egypt", "Dore Flight into Egypt"],
  ["The Baptism of Jesus", "Dore Baptism of Jesus"],
  ["The Sermon on the Mount", "Dore Sermon on the Mount"],
  ["Jesus Stilling the Tempest", "Dore Jesus Tempest"],
  ["The Transfiguration", "Dore Transfiguration"],
  ["The Good Samaritan", "Dore Good Samaritan"],
  ["The Prodigal Son", "Dore Prodigal Son"],
  ["The Resurrection of Lazarus", "Dore Lazarus"],
  ["The Last Supper", "Dore Last Supper"],
  ["The Agony in the Garden", "Dore Agony Garden"],
  ["The Judas Kiss", "Dore Judas"],
  ["Peter Denying Christ", "Dore Peter Denying"],
  ["The Descent from the Cross", "Dore Descent from the Cross"],
  ["The Burial of Jesus", "Dore Burial of Jesus"],
  ["The Resurrection", "Dore Resurrection of Christ"],
  ["The Journey to Emmaus", "Dore Emmaus"],
  ["The Ascension", "Dore Ascension"],
  ["The Descent of the Holy Spirit", "Dore Pentecost"],
  ["The Martyrdom of St Stephen", "Dore Stephen"],
  ["The Conversion of St Paul", "Dore Conversion Saul"],
  ["St Paul at Ephesus", "Dore Paul Ephesus"],
  ["St Paul Shipwrecked", "Dore Paul Shipwreck"],
];

async function apiJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(u, { headers: { "User-Agent": UA } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(2500 * (attempt + 1));
    }
  }
  return {};
}

function filePathUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=960`;
}

async function resolves(filename) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(filePathUrl(filename), {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    if (res.status === 429) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    return res.status === 200;
  }
  return false;
}

for (const [title, phrase] of targets) {
  const j = await apiJson({
    action: "query",
    list: "search",
    srsearch: phrase,
    srnamespace: "6",
    srlimit: "12",
  });
  const hits = (j.query?.search ?? [])
    .map((x) => x.title.replace(/^File:/, ""))
    .filter((n) => /\.jpe?g$/i.test(n) && /dor/i.test(n));
  let picked = null;
  for (const h of hits) {
    if (await resolves(h)) {
      picked = h;
      break;
    }
    await sleep(600);
  }
  console.log(`${picked ? "OK " : "-- "}${title}  =>  ${picked ?? "(none) " + JSON.stringify(hits.slice(0, 3))}`);
  await sleep(900);
}

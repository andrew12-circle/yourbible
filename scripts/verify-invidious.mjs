/**
 * Smoke-test Invidious caption fetch (same path as edge function).
 * Run: node scripts/verify-invidious.mjs [videoId]
 */
const videoId = process.argv[2] ?? "dQw4w9WgXcQ";
const instances = ["https://invidious.io", "https://yewtu.be", "https://inv.nadeko.net"];

for (const base of instances) {
  try {
    const listRes = await fetch(`${base}/api/v1/captions/${videoId}`);
    if (!listRes.ok) {
      console.log(`${base}: list HTTP ${listRes.status}`);
      continue;
    }
    const list = await listRes.json();
    const en = list.captions?.find((c) => /^en/i.test(c.languageCode ?? "")) ?? list.captions?.[0];
    if (!en) {
      console.log(`${base}: no captions`);
      continue;
    }
    const url = en.url?.startsWith("http") ? en.url : `${base}${en.url}`;
    const vttRes = await fetch(url);
    if (!vttRes.ok) {
      console.log(`${base}: vtt HTTP ${vttRes.status}`);
      continue;
    }
    const vtt = await vttRes.text();
    const lines = vtt.split("\n").filter((l) => l.trim() && !l.startsWith("WEBVTT") && !l.includes("-->"));
    console.log(`${base}: OK — ${lines.length} cue lines, first: ${lines[0]?.slice(0, 60)}`);
    process.exit(0);
  } catch (e) {
    console.log(`${base}: ${e.message}`);
  }
}
console.error("All Invidious instances failed");
process.exit(1);

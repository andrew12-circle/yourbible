/** Smoke-test youtube-transcript-plus (edge tier). Run: node scripts/verify-transcript-plus.mjs [videoId] */
import { fetchTranscript } from "youtube-transcript-plus";

const videoId = process.argv[2] ?? "dQw4w9WgXcQ";
const segments = await fetchTranscript(videoId, { lang: "en" });
console.log(`OK — ${segments.length} segments`);
console.log("First:", segments[0]?.text?.slice(0, 80));

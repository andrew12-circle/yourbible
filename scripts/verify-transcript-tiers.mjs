/**
 * Smoke-test transcript tiers after deploy (reads keys from .env).
 * Run: node scripts/verify-transcript-tiers.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(name) {
  const text = readFileSync(resolve(root, ".env"), "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) return null;
  let v = line.slice(name.length + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v || null;
}

const GEMINI_MODEL = "gemini-2.5-flash";
const TEST_VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function testGeminiClip() {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) {
    console.log("Gemini: SKIP — GEMINI_API_KEY not in .env");
    return false;
  }

  const body = {
    contents: [{
      role: "user",
      parts: [
        {
          file_data: { file_uri: TEST_VIDEO },
          video_metadata: { start_offset: "0s", end_offset: "30s" },
        },
        { text: "Transcribe spoken words from 0:00 to 0:30. Return transcript text only." },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 65536 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    if (text.includes("media_resolution") || text.includes("mediaResolution")) {
      console.error("Gemini: FAIL — media_resolution error still present");
    } else {
      console.error(`Gemini: FAIL — HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return false;
  }

  const json = JSON.parse(text);
  const out = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(" ") ?? "";
  console.log(`Gemini: OK — ${out.trim().slice(0, 80)}${out.length > 80 ? "…" : ""}`);
  return true;
}

async function testDeepgram() {
  const apiKey = readEnv("DEEPGRAM_API_KEY");
  if (!apiKey) {
    console.log("Deepgram: SKIP — DEEPGRAM_API_KEY not in .env");
    return false;
  }

  const res = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: TEST_VIDEO }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`Deepgram: FAIL — HTTP ${res.status}: ${text.slice(0, 200)}`);
    return false;
  }

  const json = JSON.parse(text);
  const transcript = json?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  console.log(`Deepgram: OK — ${transcript.slice(0, 80)}${transcript.length > 80 ? "…" : ""}`);
  return true;
}

const geminiOk = await testGeminiClip();
const deepgramOk = await testDeepgram();

if (!geminiOk && !deepgramOk) {
  console.error("\nNo tier passed. Add ASSEMBLYAI_API_KEY for best no-caption coverage.");
  process.exit(1);
}

console.log("\nTranscript tier smoke tests passed.");

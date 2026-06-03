import { toast } from "@/hooks/use-toast";
import type { Passage } from "@/lib/bible/api";

export function formatShareText(reference: string, verses: { number: number; text: string }[]): string {
  const body = verses.map((v) => `${v.number} ${v.text}`).join(" ");
  return `${reference}\n\n${body}`;
}

export async function copyVerseText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareVerseText(text: string, title?: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: title ?? "Scripture", text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }

  const copied = await copyVerseText(text);
  return copied ? "copied" : "failed";
}

export async function sharePassageSelection(
  reference: string,
  passage: Passage | null,
  verseNumbers: number[],
): Promise<void> {
  const verses =
    verseNumbers.length > 0
      ? (passage?.verses ?? []).filter((v) => verseNumbers.includes(v.number))
      : (passage?.verses ?? []);

  if (verses.length === 0) {
    toast({ variant: "destructive", title: "Nothing to share", description: "Select a verse first." });
    return;
  }

  const ref =
    verses.length === 1
      ? `${reference.split(":")[0]?.trim() ?? reference}:${verses[0].number}`
      : reference;

  const text = formatShareText(ref, verses);
  const result = await shareVerseText(text, ref);

  if (result === "shared") {
    toast({ title: "Shared" });
  } else if (result === "copied") {
    toast({ title: "Copied to clipboard" });
  } else {
    toast({ variant: "destructive", title: "Could not share", description: "Try copying manually." });
  }
}

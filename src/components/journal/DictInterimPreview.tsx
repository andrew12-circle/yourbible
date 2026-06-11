import { useDictInterimBlurClass } from "@/lib/journal/dictInterimBlur";

type Props = {
  text: string;
  className?: string;
};

/** Live speech-to-text preview while dictating; blurred when privacy blur mode is on. */
export function DictInterimPreview({ text, className }: Props) {
  const blurClass = useDictInterimBlurClass(className);
  if (!text.trim()) return null;
  return (
    <p className={blurClass} aria-live="polite">
      {text}
    </p>
  );
}

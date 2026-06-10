import { motion } from "framer-motion";
import { scriptureFontFamily } from "@/lib/bible/fontChoices";

type Props = {
  bookName: string;
  chapter: number;
  fontFamily?: string;
};

function OrnamentLine() {
  return (
    <span className="chapter-ornament-line" aria-hidden>
      <svg viewBox="0 0 120 12" className="chapter-ornament-svg" role="presentation">
        <path
          d="M0 6 H38 M82 6 H120 M48 6 C52 2, 56 2, 60 6 C64 10, 68 10, 72 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="60" cy="6" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function ChapterOrnamentHeader({ bookName, chapter, fontFamily }: Props) {
  const headerFont = fontFamily ?? scriptureFontFamily("serif");

  return (
    <header
      className="chapter-ornament-header text-center mb-6"
      style={{ fontFamily: headerFont }}
      aria-label={`${bookName}, chapter ${chapter}`}
    >
      <OrnamentLine />
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="chapter-ornament-book font-display text-2xl sm:text-3xl ink-text font-semibold tracking-tight mb-1"
      >
        {bookName}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="chapter-ornament-chapter"
      >
        <span className="chapter-ornament-chapter-label">Chapter</span>
        <span className="chapter-ornament-chapter-num font-display">{chapter}</span>
      </motion.div>
      <OrnamentLine />
    </header>
  );
}

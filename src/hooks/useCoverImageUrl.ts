import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { generateCoverIllustration } from "@/lib/children-books/generateIllustration";
import {
  CHILDREN_BOOK_IMAGE_EVENT,
  resolveCoverImageUrl,
  type ChildrenBookImageEventDetail,
} from "@/lib/children-books/pageImages";
import type { ChildrenBook } from "@/lib/children-books/storybook";

export function useCoverImageUrl(book: ChildrenBook): string | undefined {
  const [url, setUrl] = useState(() => resolveCoverImageUrl(book));

  useEffect(() => {
    setUrl(resolveCoverImageUrl(book));
  }, [book]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ChildrenBookImageEventDetail>).detail;
      if (detail?.bookSlug !== book.slug) return;
      if ("kind" in detail && detail.kind === "cover") {
        setUrl(resolveCoverImageUrl(book));
      }
    };
    window.addEventListener(CHILDREN_BOOK_IMAGE_EVENT, handler);
    return () => window.removeEventListener(CHILDREN_BOOK_IMAGE_EVENT, handler);
  }, [book]);

  return url;
}

type UseGenerateCoverIllustrationOptions = {
  auto?: boolean;
};

export function useGenerateCoverIllustration(
  book: ChildrenBook,
  options: UseGenerateCoverIllustrationOptions = {},
) {
  const imageUrl = useCoverImageUrl(book);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const autoAttempted = useRef(false);

  const generate = useCallback(
    async (force = false) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setGenerating(true);
      setError(null);

      try {
        const result = await generateCoverIllustration({ book, force });
        if (!result.cached) {
          toast({ title: "Cover ready", description: `${book.title} cover was painted.` });
        }
        return result.imageUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast({
          title: "Could not generate cover",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setGenerating(false);
        inFlight.current = false;
      }
    },
    [book],
  );

  useEffect(() => {
    autoAttempted.current = false;
  }, [book.slug]);

  useEffect(() => {
    if (!options.auto || imageUrl || generating || error || autoAttempted.current) return;
    autoAttempted.current = true;
    void generate(false);
  }, [options.auto, imageUrl, generating, error, generate]);

  return { imageUrl, generating, error, generate };
}

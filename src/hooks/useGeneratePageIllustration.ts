import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { generatePageIllustration } from "@/lib/children-books/generateIllustration";
import { usePageImageUrl } from "@/hooks/usePageImageUrl";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";

type UseGeneratePageIllustrationOptions = {
  auto?: boolean;
};

export function useGeneratePageIllustration(
  book: ChildrenBook,
  page: ChildrenBookPage,
  pageNumber: number,
  options: UseGeneratePageIllustrationOptions = {},
) {
  const imageUrl = usePageImageUrl(book, page, pageNumber);
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
        const result = await generatePageIllustration({ book, page, pageNumber, force });
        if (!result.cached) {
          toast({ title: "Illustration ready", description: `Page ${pageNumber} was painted.` });
        }
        return result.imageUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast({
          title: "Could not generate illustration",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setGenerating(false);
        inFlight.current = false;
      }
    },
    [book, page, pageNumber],
  );

  useEffect(() => {
    autoAttempted.current = false;
  }, [book.slug, pageNumber]);

  useEffect(() => {
    if (!options.auto || imageUrl || generating || error || autoAttempted.current) return;
    autoAttempted.current = true;
    void generate(false);
  }, [options.auto, imageUrl, generating, error, generate]);

  return { imageUrl, generating, error, generate };
}

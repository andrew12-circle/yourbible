import { useEffect, useState } from "react";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";
import {
  CHILDREN_BOOK_IMAGE_EVENT,
  preloadImageUrl,
  resolvePageImageUrl,
} from "@/lib/children-books/pageImages";

export function usePageImageUrl(
  book: ChildrenBook,
  page: ChildrenBookPage,
  pageNumber: number,
): string | undefined {
  const [url, setUrl] = useState(() => resolvePageImageUrl(book, page, pageNumber));

  useEffect(() => {
    const next = resolvePageImageUrl(book, page, pageNumber);
    setUrl(next);
    if (next) preloadImageUrl(next, "high");
  }, [book, page, pageNumber]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ bookSlug: string; pageNumber: number }>).detail;
      if (detail?.bookSlug === book.slug && detail?.pageNumber === pageNumber) {
        setUrl(resolvePageImageUrl(book, page, pageNumber));
      }
    };
    window.addEventListener(CHILDREN_BOOK_IMAGE_EVENT, handler);
    return () => window.removeEventListener(CHILDREN_BOOK_IMAGE_EVENT, handler);
  }, [book, page, pageNumber]);

  return url;
}

export function usePageImageLoaded(imageUrl: string | undefined): {
  loaded: boolean;
  failed: boolean;
  onLoad: () => void;
  onError: () => void;
} {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setLoaded(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setFailed(false);

    preloadImageUrl(imageUrl, "high");

    const img = new Image();
    img.decoding = "async";
    if ("fetchPriority" in img) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    }

    img.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = imageUrl;

    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return {
    loaded,
    failed,
    onLoad: () => setLoaded(true),
    onError: () => setFailed(true),
  };
}

import { useMemo, useState } from "react";
import { Copy, ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGeneratePageIllustration } from "@/hooks/useGeneratePageIllustration";
import { buildPageIllustrationPrompt } from "@/lib/children-books/illustrationPrompt";
import {
  defaultPageImagePath,
  getStoredPageImageUrl,
  setStoredPageImageUrl,
} from "@/lib/children-books/pageImages";
import type { ChildrenBook, ChildrenBookPage } from "@/lib/children-books/storybook";

type PageIllustrationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: ChildrenBook;
  page: ChildrenBookPage;
  pageNumber: number;
};

export function PageIllustrationSheet({
  open,
  onOpenChange,
  book,
  page,
  pageNumber,
}: PageIllustrationSheetProps) {
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState(() => getStoredPageImageUrl(book.slug, pageNumber) ?? "");
  const { imageUrl: resolvedUrl, generating, generate } = useGeneratePageIllustration(
    book,
    page,
    pageNumber,
  );

  const prompt = useMemo(
    () => buildPageIllustrationPrompt({ book, page, pageNumber }),
    [book, page, pageNumber],
  );

  const assetPath = defaultPageImagePath(book.slug, pageNumber);
  const previewUrl = resolvedUrl ?? (imageUrl.trim() || undefined);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const saveImageUrl = () => {
    setStoredPageImageUrl(book.slug, pageNumber, imageUrl.trim() || null);
  };

  const clearImageUrl = () => {
    setImageUrl("");
    setStoredPageImageUrl(book.slug, pageNumber, null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" aria-hidden />
            Page {pageNumber} illustration
          </SheetTitle>
          <SheetDescription>
            OpenAI paints each page from Storybook Illustration System Prompt v1.0.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          <section className="space-y-3 rounded-xl border bg-muted/30 p-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={generating}
                onClick={() => void generate(false)}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                )}
                {generating ? "Generating…" : "Generate with OpenAI"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={generating}
                onClick={() => void generate(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Regenerate
              </Button>
            </div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt={page.title}
                className="aspect-[2/3] w-full rounded-lg border object-cover"
              />
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Prompt</h3>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void copyPrompt()}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/40 p-3 text-[11px] leading-relaxed">
              {prompt}
            </pre>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Manual URL override</h3>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://… or /children-books/kingdom-invitation/01.webp"
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveImageUrl}>
                Save to this page
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearImageUrl}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Clear
              </Button>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-dashed p-3">
            <h3 className="text-sm font-semibold">Ship static files</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Or save images at{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">public{assetPath}</code>{" "}
              and set <code className="rounded bg-muted px-1 py-0.5 text-[11px]">useDefaultImagePath: true</code>.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

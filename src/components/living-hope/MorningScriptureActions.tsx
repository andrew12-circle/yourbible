import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { morningFormulaReaderHref, morningFormulaReaderState, persistReaderReturn } from "@/lib/bible/readerNavigation";
import { lh } from "@/lib/livingHope/themeClasses";

export function MorningScriptureActions({ readerHref }: { readerHref: string }) {
  const [blocked, setBlocked] = useState(false);
  const href = morningFormulaReaderHref(readerHref);
  const popoutHref = morningFormulaReaderHref(readerHref, true);
  return (
    <div className="space-y-3">
      <p className={lh.bodySm}>Read this passage in your physical Bible, or open the app Bible alongside your morning.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => {
          // Synchronous user gesture: do not await a request before opening the window.
          const child = window.open(popoutHref, "ybMorningFormulaBible", "popup,width=1000,height=900,resizable=yes,scrollbars=yes");
          setBlocked(!child);
          if (child) { child.opener = null; child.focus(); }
        }}><ExternalLink className="h-4 w-4 mr-2" />Pop out Bible</Button>
        <Button variant="outline" asChild><Link to={href} state={morningFormulaReaderState()} onClick={() => persistReaderReturn(morningFormulaReaderState())}><BookOpen className="h-4 w-4 mr-2" />Read in this tab</Link></Button>
      </div>
      <p className={lh.footnote}>Move the Bible window to another screen. Morning Formula stays on this step.</p>
      {blocked && <p role="status" className="text-sm">Your browser blocked the window. <a className="underline" href={popoutHref} target="_blank" rel="noopener noreferrer">Open the Bible in a new tab</a>.</p>}
    </div>
  );
}

import { Link } from "react-router-dom";
import { Eye, EyeOff, Moon, Settings, BookmarkPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BibleEntry } from "@/lib/bible/api";
import { useState } from "react";

interface Props {
  reference: string;
  collapsed: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
  bibleId: string;
  bibles: BibleEntry[];
  onChangeBible: (id: string) => void;
  onBookmark: () => void;
}

export function TopBar({ reference, collapsed, focusMode, onToggleFocus, bibleId, bibles, onChangeBible, onBookmark }: Props) {
  const current = bibles.find(b => b.id === bibleId);
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Tiny pull-down handle, always visible at top edge */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show header"
          className="fixed top-0 left-1/2 -translate-x-1/2 z-30 mt-1 px-4 py-1 rounded-full bg-paper/60 backdrop-blur-sm text-leather/60 hover:text-leather hover:bg-paper/80 transition-all"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-500 py-3 bg-paper/80 backdrop-blur-md border-b border-paper-edge ${
          open ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-leather hover:text-leather-deep transition-colors">
              <span className="font-display text-lg transition-all">{reference}</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
            {bibles.length === 0 && <DropdownMenuItem disabled>Loading translations…</DropdownMenuItem>}
            {bibles.map(b => (
              <DropdownMenuItem key={b.id} onClick={() => onChangeBible(b.id)} className={bibleId === b.id ? "font-semibold" : ""}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{b.abbreviation}</span>{b.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          {!focusMode && (
            <>
              <Button variant="ghost" size="icon" onClick={onBookmark} title="Bookmark this page" className="text-leather/80 hover:text-leather">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
              <Link to="/sleep">
                <Button variant="ghost" size="icon" title="Sleep mode" className="text-leather/80 hover:text-leather">
                  <Moon className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon" title="Settings" className="text-leather/80 hover:text-leather">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleFocus} title={focusMode ? "Exit focus mode" : "Enter Secret Place (focus)"} className="text-leather/80 hover:text-leather">
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} title="Hide header" className="text-leather/80 hover:text-leather">
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
        </div>
        {current && (
          <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{current.name}</div>
        )}
      </header>
    </>
  );
}

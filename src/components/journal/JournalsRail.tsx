import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar as CalIcon,
  Lightbulb,
  Sparkles,
  Plus,
  Layers,
  MessageCircle,
  Settings,
  BookHeart,
  Flame,
  FileUp,
} from "lucide-react";
import { Journal, JOURNAL_COLORS, createJournal } from "@/lib/journal/journals";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  journals: Journal[];
  onChange: () => void;
  /** Currently scoped journal id, or null for "All entries". */
  activeJournalId: string | null;
  /** When set, the rail is rendered in a sheet/drawer (mobile). */
  inSheet?: boolean;
  onImportDayOne?: () => void;
}

export default function JournalsRail({ journals, onChange, activeJournalId, inSheet, onImportDayOne }: Props) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(JOURNAL_COLORS[0].value);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    const j = await createJournal(user.id, { name: name.trim(), color });
    setCreating(false);
    setOpen(false);
    setName("");
    onChange();
    if (j) window.location.href = `/journal/j/${j.id}`;
  };

  return (
    <aside
      className={`${inSheet ? "" : "hidden md:flex"} flex-col w-full h-full overflow-y-auto`}
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <Link
          to="/settings"
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
        <Link to="/home" className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Home
        </Link>
      </div>

      <nav className="px-2 pb-4 space-y-0.5">
        <RailItem
          to="/journal/today"
          icon={<CalIcon className="w-4 h-4" />}
          label="Today"
          active={pathname.startsWith("/journal/today")}
          accent="142 71% 45%"
        />
        <RailItem
          to="/journal/chat"
          icon={<MessageCircle className="w-4 h-4" />}
          label="Chat journal"
          active={pathname.startsWith("/journal/chat")}
          accent="172 66% 40%"
        />
        <RailItem
          to="/framework/chat"
          icon={<MessageCircle className="w-4 h-4" />}
          label="Daily Chat"
          active={pathname.startsWith("/framework/chat")}
          accent="211 100% 50%"
        />
        <RailItem
          to="/journal/prompts"
          icon={<Lightbulb className="w-4 h-4" />}
          label="Prompts"
          active={pathname.startsWith("/journal/prompts")}
          accent="38 92% 50%"
        />
        <RailItem
          to="/journal/life"
          icon={<BookHeart className="w-4 h-4" />}
          label="Faith journal"
          active={pathname.startsWith("/journal/life")}
          accent="330 75% 52%"
        />
        <RailItem
          to="/journal/vent"
          icon={<Flame className="w-4 h-4" />}
          label="Vent space"
          active={pathname.startsWith("/journal/vent")}
          accent="0 70% 50%"
        />
        <RailItem
          to="/journal"
          icon={<Layers className="w-4 h-4" />}
          label="All Entries"
          active={pathname === "/journal" && !activeJournalId}
          accent="220 9% 46%"
        />
        <RailItem
          to="/journal/mirror"
          icon={<Sparkles className="w-4 h-4" />}
          label="Worldview Mirror"
          active={pathname.startsWith("/journal/mirror")}
          accent="265 83% 58%"
        />
      </nav>

      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Personal
        </h3>
        <button
          onClick={() => setOpen(true)}
          className="text-primary hover:bg-muted rounded-md p-1"
          title="New journal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <nav className="px-2 pb-2 space-y-0.5">
        {journals.map((j) => (
          <RailItem
            key={j.id}
            to={`/journal/j/${j.id}`}
            icon={
              <span
                className="w-4 h-4 rounded-md"
                style={{ background: `hsl(${j.color})` }}
              />
            }
            label={j.name}
            active={activeJournalId === j.id}
            accent={j.color}
          />
        ))}
        {journals.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">
            No personal journals yet.
          </p>
        )}
        {onImportDayOne && (
          <button
            type="button"
            onClick={onImportDayOne}
            className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[14px] text-muted-foreground hover:bg-muted/50 hover:text-foreground mt-1"
          >
            <FileUp className="w-4 h-4" />
            Import from Day One
          </button>
        )}
      </nav>

      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Shared
        </h3>
      </div>
      <nav className="px-2 pb-6 space-y-0.5">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[14px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          New Shared Journal
        </button>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New journal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family, Work, Prayers"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-foreground">Color</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {JOURNAL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-9 h-9 rounded-xl ring-offset-2 transition ${
                      color === c.value ? "ring-2 ring-foreground" : ""
                    }`}
                    style={{ background: `hsl(${c.value})` }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!name.trim() || creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function RailItem({
  to,
  icon,
  label,
  active,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 h-9 rounded-lg text-[14px] transition-colors ${
        active
          ? "bg-background shadow-sm font-semibold"
          : "hover:bg-muted/50 text-foreground/85"
      }`}
      style={active ? { color: `hsl(${accent})` } : undefined}
    >
      <span className="flex items-center justify-center w-5">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
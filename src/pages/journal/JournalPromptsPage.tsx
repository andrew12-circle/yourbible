import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Lightbulb, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";
import { Input } from "@/components/ui/input";

interface Prompt {
  id: string;
  text: string;
  category: string;
}

export default function JournalPromptsPage() {
  const { user, loading } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("journal_prompts")
      .select("id,text,category")
      .order("category")
      .then(({ data }) => setPrompts((data as Prompt[]) ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return prompts;
    const n = q.toLowerCase();
    return prompts.filter(
      (p) => p.text.toLowerCase().includes(n) || p.category.toLowerCase().includes(n),
    );
  }, [prompts, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalLayout title="Prompts" back="/journal">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search prompts"
          className="pl-9 h-10 rounded-xl bg-muted border-0"
        />
      </div>

      {grouped.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No prompts found.</p>
      )}

      <div className="space-y-8">
        {grouped.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              {cat}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((p) => (
                <Link
                  key={p.id}
                  to={`/journal/new?promptId=${p.id}&prompt=${encodeURIComponent(p.text)}`}
                  className="group flex gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-foreground/30 hover:shadow-md transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[15px] leading-snug font-medium text-foreground/90 group-hover:text-foreground">
                    {p.text}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </JournalLayout>
  );
}
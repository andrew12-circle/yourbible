import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { readerPath } from "@/lib/bible/reference";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

interface Reading {
  id: string;
  date: string;
  reference: string;
  passage: string;
  reason: string;
  prompt: string;
  belief_id: string | null;
}

export default function DailyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const autoStarted = useRef(false);

  const today = new Date().toISOString().slice(0, 10);

  const openInReader = useCallback((r: Reading, replace = false) => {
    navigate(readerPath(r.reference), {
      replace,
      state: { dailyPrompt: r.prompt, dailyReason: r.reason },
    });
  }, [navigate]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return null;
    }
    setLoading(true);
    const { data } = await supabase
      .from("daily_readings")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    const row = data as Reading | null;
    setReading(row);
    setLoading(false);
    return row;
  }, [user, today]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = useCallback(async (opts?: { redirect?: boolean }) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("framework-daily", { body: {} });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }
      const row = await load();
      if (row && opts?.redirect !== false) {
        openInReader(row, true);
      } else if (row) {
        toast({ title: "Today's reading is ready" });
      }
    } catch (e: unknown) {
      toast({
        title: "Couldn't generate reading",
        description: await edgeFunctionErrorMessage("framework-daily", e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [load, openInReader]);

  useEffect(() => {
    if (authLoading || loading || reading || generating || autoStarted.current || !user) return;
    autoStarted.current = true;
    generate({ redirect: true });
  }, [authLoading, loading, reading, generating, user, generate]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const busy = loading || generating;

  return (
    <FrameworkLayout title="Daily reading" back="/">
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        A verse and reflection tied to your framework — opened in your Bible so you can read and study in context.
      </p>

      {busy && !reading ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">
            {generating ? "Choosing today's passage…" : "Loading…"}
          </p>
        </div>
      ) : !reading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">No reading for today yet.</p>
          <Button onClick={() => generate({ redirect: true })} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate today's reading
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">{reading.date}</div>
            <h2 className="text-xl font-semibold">{reading.reference}</h2>
          </div>
          <blockquote className="border-l-2 border-primary pl-4 italic whitespace-pre-wrap text-sm">
            {reading.passage}
          </blockquote>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Why this, today</div>
            <p className="text-sm">{reading.reason}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Reflection</div>
            <p>{reading.prompt}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => openInReader(reading)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Read in Bible
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (reading) {
                  await supabase.from("daily_readings").delete().eq("id", reading.id);
                  setReading(null);
                }
                generate({ redirect: false });
              }}
              disabled={generating}
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
            {reading.belief_id && (
              <Button variant="ghost" asChild>
                <Link to={`/framework/beliefs/${reading.belief_id}`}>Related belief</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </FrameworkLayout>
  );
}

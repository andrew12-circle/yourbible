import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("daily_readings")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    setReading(data as Reading | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("framework-daily", { body: {} });
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily reading</h1>
        <p className="text-muted-foreground">A verse + prompt tied to where your framework is moving.</p>
      </div>

      {!reading ? (
        <Card className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">No reading for today yet.</p>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate today's reading
          </Button>
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">{reading.date}</div>
            <h2 className="text-xl font-semibold">{reading.reference}</h2>
          </div>
          <blockquote className="border-l-2 border-primary pl-4 italic whitespace-pre-wrap">
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
        </Card>
      )}
    </div>
  );
}
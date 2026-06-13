import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import ClaimResearchWorkspace from "@/components/journal/ClaimResearchWorkspace";
import {
  buildClaimResearchJournalTitle,
  buildClaimResearchMarkdown,
} from "@/lib/framework/artifactDetailPageHelpers";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { cn } from "@/lib/utils";

type ClaimRow = {
  id: string;
  claim: string;
  artifact_id: string;
  matched_belief_id: string | null;
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  tone: string | null;
  doctrine_tags: string[];
  bias_flags: string[];
};

type BeliefRow = {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
};

type ArtifactRow = {
  id: string;
  title: string | null;
  url: string | null;
};

export default function ClaimResearchWorkspacePage() {
  const { id: artifactId, claimId } = useParams<{ id: string; claimId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [artifact, setArtifact] = useState<ArtifactRow | null>(null);
  const [belief, setBelief] = useState<BeliefRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !artifactId || !claimId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: cRow, error: cErr }, { data: aRow }] = await Promise.all([
        supabase
          .from("artifact_claims")
          .select(
            "id,claim,artifact_id,matched_belief_id,scripture_supports,scripture_challenges,match_relation,tone,doctrine_tags,bias_flags",
          )
          .eq("id", claimId)
          .eq("user_id", user.id)
          .eq("artifact_id", artifactId)
          .maybeSingle(),
        supabase.from("artifacts").select("id,title,url").eq("id", artifactId).eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (cErr || !cRow) {
        setClaim(null);
        setArtifact(aRow as ArtifactRow | null);
        setLoading(false);
        return;
      }
      setClaim(cRow as ClaimRow);
      setArtifact(aRow as ArtifactRow | null);
      const mbId = (cRow as ClaimRow).matched_belief_id;
      if (mbId) {
        const { data: bRow } = await supabase
          .from("belief_nodes")
          .select("id,topic,statement,answer,confidence")
          .eq("id", mbId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setBelief((bRow as BeliefRow) ?? null);
      } else {
        setBelief(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, artifactId, claimId]);

  const researchHandoff = useMemo(() => {
    if (!claim || !artifact || !user) return null;
    const beliefForMd = belief
      ? {
          id: belief.id,
          topic: belief.topic,
          statement: belief.statement,
          answer: belief.answer,
          confidence: belief.confidence,
        }
      : undefined;
    const claimForMd = {
      id: claim.id,
      claim: claim.claim,
      tone: claim.tone,
      doctrine_tags: claim.doctrine_tags,
      scripture_supports: claim.scripture_supports,
      scripture_challenges: claim.scripture_challenges,
      match_relation: claim.match_relation,
      matched_belief_id: claim.matched_belief_id,
      bias_flags: claim.bias_flags,
      verdict: null,
      deferred_at: null,
      user_note: null,
    };
    return {
      claimId: claim.id,
      artifactId: artifact.id,
      claimMarkdown: buildClaimResearchMarkdown(artifact.title, claimForMd, null, beliefForMd),
      journalTitle: buildClaimResearchJournalTitle(artifact.title, claimForMd),
      initialTab: "chat" as const,
      claimPreview: claim.claim.trim().slice(0, 220) || "Claim",
      matchedBeliefId: claim.matched_belief_id,
      artifactTitle: artifact.title,
    };
  }, [claim, artifact, belief, user]);

  useEffect(() => {
    if (researchHandoff) {
      useFloatingJournalStore.getState().setFloatingClaimResearch(researchHandoff);
    }
    return () => {
      useFloatingJournalStore.getState().setFloatingClaimResearch(null);
    };
  }, [researchHandoff]);

  const researchLayoutProps = {
    immersive: true as const,
    immersiveMobileMinimal: true as const,
    immersiveCompactTitle: "Research",
    back: `/framework/artifacts/${artifactId ?? ""}`,
    contentClassName: "max-w-none px-0",
    headerContentClassName: "max-w-none",
  };

  if (authLoading) {
    return (
      <FrameworkLayout title="Research" {...researchLayoutProps}>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </FrameworkLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!artifactId || !claimId) {
    return <Navigate to="/framework/artifacts" replace />;
  }

  if (!loading && !claim) {
    return (
      <FrameworkLayout title="Research" {...researchLayoutProps}>
        <p className="px-4 py-12 text-sm text-muted-foreground">
          Claim not found.{" "}
          <Link to={`/framework/artifacts/${artifactId}`} className="font-medium text-foreground underline">
            Back to artifact
          </Link>
        </p>
      </FrameworkLayout>
    );
  }

  return (
    <FrameworkLayout title="Research" {...researchLayoutProps}>
      <div className="flex min-h-0 flex-1 flex-col max-lg:h-full">
        <div className="shrink-0 px-3 pt-[calc(var(--safe-area-inset-top)+0.5rem)] sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={() => navigate(`/framework/artifacts/${artifactId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to video
          </Button>
        </div>
        {loading || !researchHandoff ? (
          <div className="flex flex-1 justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ClaimResearchWorkspace userId={user.id} research={researchHandoff} className="min-h-0 flex-1" />
        )}
      </div>
    </FrameworkLayout>
  );
}

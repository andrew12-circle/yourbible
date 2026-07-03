import { Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestForm from "@/components/prayer/PrayerRequestForm";
import { toast } from "@/hooks/use-toast";
import { createPrayerRequest } from "@/lib/prayer/api";

export default function PrayerRequestNewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="New request" back="/prayer/requests" hideTabs>
      <PrayerRequestForm
        busy={busy}
        submitLabel="Add request"
        onSubmit={async (values) => {
          setBusy(true);
          try {
            const row = await createPrayerRequest(user.id, {
              title: values.title,
              prayerText: values.prayerText,
              purpose: values.purpose,
              category: values.category,
              requestedAt: values.requestedAt,
              deadline: values.deadline || null,
              amountRequested: values.amountRequestedNum,
              scriptureRefs: values.scriptureRefs,
              privateNotes: values.privateNotes,
            });
            if (row) {
              toast({ title: "Request recorded" });
              navigate(`/prayer/requests/${row.id}`);
            }
          } catch (e) {
            toast({ title: "Could not save", description: String(e), variant: "destructive" });
          } finally {
            setBusy(false);
          }
        }}
      />
    </PrayerShell>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeDashboard } from "@/contexts/HomeDashboardContext";
import { User } from "lucide-react";

export function HubTopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profilePhoto, displayName } = useHomeDashboard();

  const profileInitial = (displayName || user?.email || "U").trim()[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 flex h-11 w-full items-center justify-end px-3 shrink-0 border-b border-border/30 gap-3 bg-background">
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="w-8 h-8 rounded-full bg-muted border border-border/50 overflow-hidden flex items-center justify-center text-foreground font-semibold text-sm hover:bg-muted/80 transition"
        aria-label="Open settings"
      >
        {profilePhoto ? (
          <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center">
            {profileInitial || <User className="w-4 h-4" />}
          </span>
        )}
      </button>
    </header>
  );
}

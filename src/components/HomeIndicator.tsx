import { useLocation, useNavigate } from "react-router-dom";
import { useAppShellMode } from "@/hooks/useAppShellMode";

/**
 * iOS-style home indicator pill, fixed to the bottom of the screen.
 * Tapping it navigates back to /home. Hidden on home, auth, onboarding, hub shell, and artifact detail.
 */
export default function HomeIndicator() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { showHubShell } = useAppShellMode();

  const isArtifactDetail =
    /^\/framework\/artifacts\/[^/]+$/.test(pathname) &&
    pathname !== "/framework/artifacts/new" &&
    pathname !== "/framework/artifacts/live";

  const hidden =
    showHubShell ||
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    isArtifactDetail;

  if (hidden) return null;

  return (
    <button
      type="button"
      aria-label="Go to home screen"
      onClick={() => navigate("/home")}
      className="fixed bottom-safe-2 left-1/2 -translate-x-1/2 z-[100] p-3 -m-3 group"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="block w-[134px] h-[5px] rounded-full bg-foreground/70 group-hover:bg-foreground transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
    </button>
  );
}
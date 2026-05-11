import { useLocation, useNavigate } from "react-router-dom";

/**
 * iOS-style home indicator pill, fixed to the bottom of the screen.
 * Tapping it navigates back to /home. Hidden on the home, auth, and onboarding routes.
 */
export default function HomeIndicator() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const hidden =
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  if (hidden) return null;

  return (
    <button
      type="button"
      aria-label="Go to home screen"
      onClick={() => navigate("/home")}
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[100] p-3 -m-3 group"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="block w-[134px] h-[5px] rounded-full bg-foreground/70 group-hover:bg-foreground transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
    </button>
  );
}
import { useEffect } from "react";
import { preloadLikelyAppRoutes } from "@/lib/pwa/preloadAppRoutes";

export function AppRoutePreloader() {
  useEffect(() => preloadLikelyAppRoutes(), []);
  return null;
}

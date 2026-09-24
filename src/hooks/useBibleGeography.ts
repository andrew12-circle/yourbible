import { useQuery } from "@tanstack/react-query";
import { geographyAtlasSchema } from "@/lib/bible/geography";

export function useBibleGeography() {
  return useQuery({
    queryKey: ["bible-geography", "v1", "7eb18a5"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/bible-geography/atlas-v1.json", { signal });
      if (!response.ok) throw new Error("The Bible atlas could not be loaded. Please retry.");
      const parsed = geographyAtlasSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.places.length < 1000) throw new Error("The Bible atlas is unavailable or incomplete. Please retry after refreshing the app.");
      return parsed.data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

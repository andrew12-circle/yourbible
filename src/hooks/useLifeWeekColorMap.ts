import { useMemo } from "react";
import { buildLifeWeekColorMap, lifeWeekColorSeed } from "@/lib/lifeWeekCellColors";

type Options = {
  birthDate: string | null | undefined;
  totalCells: number;
  cols?: number;
  scope?: string;
};

export function useLifeWeekColorMap({
  birthDate,
  totalCells,
  cols = 52,
  scope = "life-weeks",
}: Options): Uint8Array | null {
  return useMemo(() => {
    if (!birthDate?.trim()) return null;
    return buildLifeWeekColorMap(lifeWeekColorSeed(birthDate, scope), totalCells, cols);
  }, [birthDate, totalCells, cols, scope]);
}

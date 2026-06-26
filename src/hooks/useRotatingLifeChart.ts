import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  computeLifePhaseStats,
  computeLifeWeekIndex,
  type LifePhaseStats,
  type LifeWeekIndexResult,
} from "@/lib/lifeWeeks";
import {
  advanceChartSlot,
  chartSlotLabel,
  readStoredChartSlot,
  writeStoredChartSlot,
  type LifeChartSlot,
} from "@/lib/lifeChartRotation";
import {
  familyMemberById,
  parseFamilyFromLayout,
  patchLayoutWithFamily,
  type FamilyMember,
  type FamilyMemberId,
} from "@/lib/lifeWeeksFamily";

export type LifeChartKind = "life-weeks" | "blink";

export type ActiveLifeChart = {
  slot: LifeChartSlot;
  kind: LifeChartKind;
  name: string;
  birthDate: string | null;
  indexState: LifeWeekIndexResult | null;
  phaseStats: LifePhaseStats | null;
};

type Options = {
  /** Advance to the next chart each time Overview mounts (screensaver). */
  rotateOnMount?: boolean;
};

function slotKind(slot: LifeChartSlot): LifeChartKind {
  return slot === "self" ? "life-weeks" : "blink";
}

export function useRotatingLifeChart({ rotateOnMount = false }: Options = {}) {
  const { profile, updateProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [activeSlot, setActiveSlot] = useState<LifeChartSlot>("self");
  const [savingFamilyDob, setSavingFamilyDob] = useState(false);
  const didRotateOnMountRef = useRef(false);

  const selfDobRaw = profile?.date_of_birth;
  const selfDob =
    selfDobRaw != null && String(selfDobRaw).trim() !== "" ? String(selfDobRaw).trim() : null;
  const displayName = profile?.display_name ?? null;

  const familyMembers = useMemo(
    () => parseFamilyFromLayout(profile?.layout),
    [profile?.layout],
  );

  const availableSlots = useMemo((): LifeChartSlot[] => {
    const slots: LifeChartSlot[] = [];
    if (selfDob) slots.push("self");
    for (const id of ["lilly", "caroline"] as const) {
      const member = familyMemberById(familyMembers, id);
      if (member.birthDate) slots.push(id);
    }
    if (slots.length === 0) slots.push("self");
    return slots;
  }, [selfDob, familyMembers]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (rotateOnMount) {
      if (!didRotateOnMountRef.current) {
        didRotateOnMountRef.current = true;
        setActiveSlot(advanceChartSlot(availableSlots));
      }
      return;
    }
    const stored = readStoredChartSlot();
    if (stored) {
      setActiveSlot(stored);
      return;
    }
    setActiveSlot(availableSlots[0] ?? "self");
  }, [rotateOnMount, availableSlots]);

  const selectSlot = useCallback((slot: LifeChartSlot) => {
    setActiveSlot(slot);
    writeStoredChartSlot(slot);
  }, []);

  const nextSlot = useCallback(() => {
    const idx = availableSlots.indexOf(activeSlot);
    const next = availableSlots[(idx + 1) % availableSlots.length] ?? availableSlots[0] ?? "self";
    selectSlot(next);
  }, [activeSlot, availableSlots, selectSlot]);

  const prevSlot = useCallback(() => {
    const idx = availableSlots.indexOf(activeSlot);
    const prev =
      availableSlots[(idx - 1 + availableSlots.length) % availableSlots.length] ?? availableSlots[0] ?? "self";
    selectSlot(prev);
  }, [activeSlot, availableSlots, selectSlot]);

  const activeBirthDate = useMemo(() => {
    if (activeSlot === "self") return selfDob;
    return familyMemberById(familyMembers, activeSlot as FamilyMemberId).birthDate;
  }, [activeSlot, selfDob, familyMembers]);

  const activeName = useMemo(
    () =>
      activeSlot === "self"
        ? chartSlotLabel("self", displayName)
        : familyMemberById(familyMembers, activeSlot as FamilyMemberId).name,
    [activeSlot, displayName, familyMembers],
  );

  const indexState = useMemo(() => {
    if (!activeBirthDate) return null;
    return computeLifeWeekIndex(activeBirthDate, now);
  }, [activeBirthDate, now]);

  const phaseStats = useMemo(() => {
    if (!activeBirthDate) return null;
    return computeLifePhaseStats(activeBirthDate, now);
  }, [activeBirthDate, now]);

  const activeChart: ActiveLifeChart = useMemo(
    () => ({
      slot: activeSlot,
      kind: slotKind(activeSlot),
      name: activeName,
      birthDate: activeBirthDate,
      indexState,
      phaseStats,
    }),
    [activeSlot, activeName, activeBirthDate, indexState, phaseStats],
  );

  const saveFamilyBirthDate = async (id: FamilyMemberId, birthDate: string) => {
    setSavingFamilyDob(true);
    try {
      const next: FamilyMember[] = familyMembers.map((m) =>
        m.id === id ? { ...m, birthDate: birthDate.trim().slice(0, 10) } : m,
      );
      const { error } = await updateProfile({
        layout: patchLayoutWithFamily(profile?.layout ?? "{}", next),
      });
      if (error) {
        toast({ variant: "destructive", title: "Could not save", description: error.message });
        return;
      }
      toast({ title: `${familyMemberById(next, id).name}'s birthdate saved` });
      selectSlot(id);
    } finally {
      setSavingFamilyDob(false);
    }
  };

  return {
    activeChart,
    activeSlot,
    availableSlots,
    familyMembers,
    selectSlot,
    nextSlot,
    prevSlot,
    savingFamilyDob,
    saveFamilyBirthDate,
    selfDob,
  };
}

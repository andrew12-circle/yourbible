import { useCallback, useEffect, useState } from "react";

export type ArtifactMobileTab = "study" | "transcript" | "notes" | "journal";

function replaceHashlessUrl() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

export function useArtifactDetailMobileTabs() {
  const [mobileTab, setMobileTab] = useState<ArtifactMobileTab>("study");

  const openStudyTab = useCallback(() => {
    setMobileTab("study");
    if (
      window.location.hash === "#transcript" ||
      window.location.hash === "#notes" ||
      window.location.hash === "#journal"
    ) {
      replaceHashlessUrl();
    }
  }, []);
  const openTranscriptTab = useCallback(() => {
    setMobileTab("transcript");
    window.location.hash = "transcript";
  }, []);
  const openNotesTab = useCallback(() => {
    setMobileTab("notes");
    window.location.hash = "notes";
  }, []);
  const openJournalTab = useCallback(() => {
    setMobileTab("journal");
    window.location.hash = "journal";
  }, []);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash === "#transcript") setMobileTab("transcript");
      else if (hash === "#notes" || hash === "#capture") setMobileTab("notes");
      else if (hash === "#journal") setMobileTab("journal");
      else setMobileTab("study");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const onTabChange = useCallback((value: string) => {
    const tab = value as ArtifactMobileTab;
    setMobileTab(tab);
    if (tab === "transcript") window.location.hash = "transcript";
    else if (tab === "notes") window.location.hash = "notes";
    else if (tab === "journal") window.location.hash = "journal";
    else if (
      window.location.hash === "#transcript" ||
      window.location.hash === "#notes" ||
      window.location.hash === "#journal"
    ) {
      replaceHashlessUrl();
    }
  }, []);

  return {
    mobileTab,
    setMobileTab,
    onTabChange,
    openStudyTab,
    openTranscriptTab,
    openNotesTab,
    openJournalTab,
  };
}

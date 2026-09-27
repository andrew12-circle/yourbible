import { NavLink } from "react-router-dom";
import { ChevronRight, Mail } from "lucide-react";
import { WORKBOOK_PHASES, WORKBOOK_SECTIONS } from "@/lib/livingHope/workbookTypes";

export function MorningFoundationNav() {
  return <nav className="morning-foundation-nav" aria-label="Foundation sections">
    <p className="morning-eyebrow">My foundation</p>
    <NavLink to="/living-hope/letter"><Mail aria-hidden="true" /><span>Letter from the future</span><ChevronRight aria-hidden="true" /></NavLink>
    {WORKBOOK_PHASES.map((phase) => <div key={phase.key}>
      <h2>{phase.label}</h2>
      {WORKBOOK_SECTIONS.filter((section) => section.phase === phase.key).map((section) =>
        <NavLink key={section.key} to={`/living-hope/workbook/${section.key}`}><span>{section.label}</span><ChevronRight aria-hidden="true" /></NavLink>,
      )}
    </div>)}
  </nav>;
}

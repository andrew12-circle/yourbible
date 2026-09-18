import { describe, expect, it } from "vitest";
import { JournalSafetyDb } from "@/test/journalSafetyDb";
import { journalAiPrivacyResponse } from "../../../supabase/functions/_shared/journalAiPrivacy";
import { readFileSync } from "node:fs";
function db(){ const value=new JournalSafetyDb();value.rows.set("profiles",[{id:"profile",user_id:"owner",journal_e2e_enabled:false}]);value.rows.set("journal_entries",[{id:"entry",user_id:"owner",journal_id:"journal",entry_kind:null,e2e_encrypted:false}]);value.rows.set("journals",[{id:"journal",user_id:"owner",e2e_required:false}]);return value; }
describe("server-side journal privacy before AI",()=>{
  it("permits ordinary entries without reading prose",async()=>{const value=db();expect(await journalAiPrivacyResponse(value as never,"owner","entry")).toBeNull();expect(value.calls.every(c=>!c.columns?.split(',').some(f=>["body","title","summary"].includes(f)))).toBe(true);});
  it.each(["vent","encrypted","notebook","profile","wrong-owner","missing-entry"])("denies %s",async kind=>{const value=db();if(kind==="vent")value.rows.get("journal_entries")![0].entry_kind="vent";if(kind==="encrypted")value.rows.get("journal_entries")![0].e2e_encrypted=true;if(kind==="notebook")value.rows.get("journals")![0].e2e_required=true;if(kind==="profile")value.rows.get("profiles")![0].journal_e2e_enabled=true;if(kind==="wrong-owner")value.rows.get("journal_entries")![0].user_id="other";if(kind==="missing-entry")value.rows.set("journal_entries",[]);expect((await journalAiPrivacyResponse(value as never,"owner","entry"))?.status).toBe(403);});
  it("fails closed when privacy metadata is unavailable",async()=>{const value=db();value.fail=()=>new Error("offline");expect((await journalAiPrivacyResponse(value as never,"owner","entry"))?.status).toBe(503);});
  it.each(["journal-suggest-title","journal-suggest-summary","journal-sketch-to-text","journal-voice-to-text","ai-text-polish","my-ai-chat"])("wires the guard into %s",name=>{expect(readFileSync(`supabase/functions/${name}/index.ts`,"utf8")).toContain("await journalAiPrivacyResponse(");});
});

"""Apply exact, branch-scoped integration corrections; never modify journal data."""
from pathlib import Path
import subprocess, re
if subprocess.check_output(['git','branch','--show-current'],text=True).strip() != 'fix/journal-reliability-20260912':
    raise SystemExit('Wrong branch')
changes={}
def read(path):
    return changes.get(path,Path(path).read_text())
def replace(path,old,new,count=1):
    text=read(path)
    if text.count(old)!=count: raise RuntimeError(f'{path}: expected {count} anchors for {old[:90]!r}; found {text.count(old)}')
    changes[path]=text.replace(old,new)

# Narrow tagged results explicitly, including projects without strictNullChecks.
for path in ['src/components/journal/EntryEditorPane.tsx','src/hooks/useJournalComposePersistence.ts','src/lib/journal/journalVideoEntryMerge.ts']:
    text=read(path)
    text=text.replace('if (!result.ok', 'if (result.ok === false')
    changes[path]=text
replace('src/lib/journal/journalEntryDb.ts','.update(encoded)', '.update(encoded as Database["public"]["Tables"]["journal_entries"]["Update"])')
replace('src/hooks/useNewJournalEntryPage.ts','  return {\n    videoCaptionPreview,','  return {\n    lat, lng, journalId,\n    videoCaptionPreview,')
replace('src/hooks/useNewJournalEntryPage.ts','enriched?.summary','enriched && enriched.summary')
# Existing tests must assert the explicit prior-caption argument used for safe merges.
path='src/lib/journal/journalVideoUploadProcessor.test.ts'
replace(path,'      expect.stringContaining("and my week"),\n      0,\n      null,','      expect.stringContaining("and my week"),\n      0,\n      null,\n      baseMeta.liveTranscript,')
replace(path,'toHaveBeenCalledWith("u1", "e1", preparedTranscript, 0, null)','toHaveBeenCalledWith("u1", "e1", preparedTranscript, 0, null, baseMeta.liveTranscript)')

# Stage external React updates until they have actually appeared in the editor.
path='src/hooks/useJournalComposePersistence.ts'
changes[path]='import { JournalViewAdoption } from "@/lib/journal/journalViewAdoption";\n'+read(path)
replace(path,'  const observedUiRef = useRef<JournalValues | null>(null);','  const observedUiRef = useRef<JournalValues | null>(null);\n  const viewAdoption = useRef(new JournalViewAdoption());')
replace(path,'    observedUiRef.current = null;','    observedUiRef.current = null;\n    viewAdoption.current.reset();',2)
old='''    observedUiRef.current = values;
    if (observed) {
      const patch = journalChangedFields(observed, values);
      if (Object.keys(patch).length) patchJournalDocument(queue.current().userId, queue.current().id, patch);
    }
    observedUiRef.current = values;'''
new='''    if (observed) {
      const { observed: nextObserved, patch } = viewAdoption.current.consume(observed, values);
      observedUiRef.current = nextObserved;
      if (Object.keys(patch).length) patchJournalDocument(queue.current().userId, queue.current().id, patch);
    } else {
      observedUiRef.current = values;
    }'''
replace(path,old,new)
replace(path,'        observedUiRef.current = { ...observedUiRef.current, ...applied };','        viewAdoption.current.stage(observedUiRef.current, applied);')

# Sketch AI operates on an immutable result and revision-aware append, not its old body.
path='supabase/functions/journal-sketch-to-text/index.ts'
changes[path]='import { appendJournalBlock } from "../_shared/journalAtomicBlock.ts";\n'+read(path)
replace(path,'.select("id,title,body,summary,user_id")','.select("id,title,body,summary,user_id,revision,e2e_encrypted")')
replace(path,'    const { data: photo } = await supabase','''    if (entry.e2e_encrypted) {
      return new Response(JSON.stringify({ error: "Encrypted entries cannot use server-side handwriting transcription." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isSafeInteger(entry.revision)) throw new Error("Journal revision support is required.");

    const { data: photo } = await supabase''')
text=read(path)
start=text.index('    const sep = bodyStr.trim().length')
end=text.index('    let suggestedTitle: string | null = null;',start)
text=text[:start]+'''    const updated = await appendJournalBlock({
      entryId: entry_id, userId: u.user.id, marker,
      block: `---\\n**From your sketch** (AI transcription)\\n\\n${transcribed}\\n`,
      read: async () => {
        const { data, error } = await supabase.from("journal_entries")
          .select("id,title,body,summary,user_id,revision,e2e_encrypted")
          .eq("id", entry_id).eq("user_id", u.user.id).maybeSingle();
        if (error) throw error;
        return data;
      },
      compareAndSwap: async (row, body) => {
        const { data, error } = await supabase.from("journal_entries").update({ body })
          .eq("id", entry_id).eq("user_id", u.user.id)
          .eq("revision", row.revision).eq("e2e_encrypted", false)
          .select("id,title,body,summary,user_id,revision,e2e_encrypted").maybeSingle();
        if (error) throw error;
        return data;
      },
    });

'''+text[end:]
# The initial metadata path uses entry; the post-transcription path uses updated.
pattern=r'(?P<indent> +)if \(suggestedTitle \|\| suggestedSummary\) \{\n\s+await supabase\n\s+\.from\("journal_entries"\)\n\s+\.update\(\{[\s\S]*?\}\)\n\s+\.eq\("id", entry_id\)\n\s+\.eq\("user_id", u.user.id\);\n\s+\}'
found=list(re.finditer(pattern,text))
if len(found)!=2: raise RuntimeError('Expected two sketch metadata updates')
for index,match in reversed(list(enumerate(found))):
    source='entry' if index==0 else 'updated'
    indent=match.group('indent')
    replacement=f'''{indent}if (suggestedTitle || suggestedSummary) {{
{indent}  const {{ data: metadata, error: metadataError }} = await supabase.from("journal_entries")
{indent}    .update({{
{indent}      ...(suggestedTitle ? {{ title: suggestedTitle }} : {{}}),
{indent}      ...(suggestedSummary ? {{ summary: suggestedSummary }} : {{}}),
{indent}    }})
{indent}    .eq("id", entry_id).eq("user_id", u.user.id)
{indent}    .eq("revision", {source}.revision).eq("e2e_encrypted", false)
{indent}    .select("title,summary").maybeSingle();
{indent}  if (metadataError) throw metadataError;
{indent}  suggestedTitle = metadata && suggestedTitle ? metadata.title : null;
{indent}  suggestedSummary = metadata && suggestedSummary ? metadata.summary : null;
{indent}}}'''
    text=text[:match.start()]+replacement+text[match.end():]
text=text.replace('!String(entry.summary ?? "").trim() && transcribed.length', '!String(updated.summary ?? "").trim() && transcribed.length')
changes[path]=text
# Validate every replacement before writing any source.
for path,text in changes.items():
    Path(path).write_text(text)
    print(path)

from pathlib import Path

p = Path("src/pages/framework/ArtifactDetailPage.tsx")
t = p.read_text(encoding="utf-8")

replacements = [
    (
        """              <ul className="space-y-1">
                {c.scripture_supports?.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                )) || <li className="text-muted-foreground">—</li>}
              </ul>""",
        """              <ul className="space-y-1.5">
                {c.scripture_supports?.length ? (
                  c.scripture_supports.map((s, i) => (
                    <ClaimScriptureRef key={`${s.ref}-${i}`} reference={s.ref} note={s.note} />
                  ))
                ) : (
                  <li className="text-muted-foreground">—</li>
                )}
              </ul>""",
    ),
    (
        """              <ul className="space-y-1">
                {c.scripture_challenges?.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                )) || <li className="text-muted-foreground">—</li>}
              </ul>""",
        """              <ul className="space-y-1.5">
                {c.scripture_challenges?.length ? (
                  c.scripture_challenges.map((s, i) => (
                    <ClaimScriptureRef key={`${s.ref}-${i}`} reference={s.ref} note={s.note} />
                  ))
                ) : (
                  <li className="text-muted-foreground">—</li>
                )}
              </ul>""",
    ),
    (
        """            Research with AI
          </Button>
          <Button size="sm" variant="outline" onClick={() => openJournalFromClaim(c, source?.startSeconds ?? undefined)}>
            <NotebookPen className="mr-1 h-3.5 w-3.5" />
            Reflect in journal
          </Button>
          <Button size="sm" variant={c.verdict === "keep" ? "default" : "outline"} onClick={() => setVerdict(c.id, "keep")}>Keep</Button>
          <Button size="sm" variant={c.verdict === "reject" ? "default" : "outline"} onClick={() => setVerdict(c.id, "reject")}>Reject</Button>
          <Button size="sm" variant={c.verdict === "updated" ? "default" : "outline"} onClick={() => setVerdict(c.id, "updated")}>Update my belief</Button>""",
        """            Research
          </Button>
          <Button size="sm" variant="outline" onClick={() => openJournalFromClaim(c, source?.startSeconds ?? undefined)}>
            <NotebookPen className="mr-1 h-3.5 w-3.5" />
            Reflect
          </Button>
          <Button
            size="sm"
            variant={isDeferredVerdict(c.verdict) ? "default" : "outline"}
            onClick={() => void toggleResearchLater(c.id, c.verdict)}
            title="Save to your research-later queue"
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            {isDeferredVerdict(c.verdict) ? "In queue" : "Research later"}
          </Button>
          <span className="hidden sm:inline w-px h-5 bg-border/60 mx-0.5" aria-hidden />
          <Button size="sm" variant={c.verdict === "keep" ? "default" : "outline"} onClick={() => void setVerdict(c.id, "keep")}>Keep</Button>
          <Button size="sm" variant={c.verdict === "reject" ? "default" : "outline"} onClick={() => void setVerdict(c.id, "reject")}>Reject</Button>
          <Button size="sm" variant={c.verdict === "updated" ? "default" : "outline"} onClick={() => void setVerdict(c.id, "updated")}>Update my belief</Button>
          <Button size="sm" variant={c.verdict === "defer" ? "default" : "outline"} onClick={() => void setVerdict(c.id, "defer")}>Defer</Button>""",
    ),
]

for old, new in replacements:
    if old not in t:
        raise SystemExit(f"MISSING block:\n{old[:80]}...")
    t = t.replace(old, new, 1)

p.write_text(t, encoding="utf-8")
print("patched")

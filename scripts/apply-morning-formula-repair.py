"""Temporary hash-checked source transport; refuse all unreviewed changes."""
import hashlib
import json
from pathlib import Path

EXPECTED = {
 "src/components/living-hope/MorningPrayerReader.tsx": "55a292a39af29f281cb5b2cc61400fce28e46f260a6f4113a8201ad6eca4245c",
 "src/components/living-hope/MorningScriptureActions.tsx": "0896572a8fc24c1bafaa811c1b7534e1a10a89e110948f06af2c75c5282a4219",
 "src/components/living-hope/MorningThanksgivingVoice.tsx": "ffc87a3c0fd3a6b0a6660087583856c4484d7b187e201182b30bd999c0f42138",
 "src/components/living-hope/MorningWorshipMusic.tsx": "6cb2640b772e5449feb66ba11e1a376df8270209b5819d24ce049b9d47139086",
 "src/lib/livingHope/morningFormulaJournalBody.ts": "c4cd222d113be38e3d4ef230f1a1b72b8375267d419f89e7631717a8e93581ff",
 "src/lib/livingHope/spokenThanksgiving.ts": "5700cfc1a0532232cd24197e3c6f9a22a30651e512b0932ba40ed295a56b00c8",
 "supabase/migrations/20260921154857_morning_formula_single_journal.sql": "778bab1ec80bcba677a4328a81d329c104956227fbe72cb608d733e9d935629e",
 "src/components/journal/ChatPrayerBiblePage.tsx": "c08c53f982569fc22ed2c906858d509661bb2a50660c576c9bfb8af880c3f638",
 "src/components/living-hope/MorningConversationPanel.tsx": "6850b1beef619ea6e0b3aa7a55825924622dae5ad07e14734fdab4e31d362308",
 "src/components/living-hope/MorningFormulaInlineJournal.tsx": "fd546a9461b2e5f60e5d64e58e36a2c89de3baa0c01e729da92b7a738f252220",
 "src/components/living-hope/MorningFormulaSessionTimer.tsx": "65de466b37a927c743afafd76c5b937efb31b1f313c8752e1581be8f5e600395",
 "src/components/living-hope/MorningGuidedExperience.tsx": "e6bbbc46f0b4515dec5b289205f6b8b179359677092a8740c3296f2b16f72969",
 "src/components/living-hope/MorningRitualStepPanels.tsx": "380e1e5a31bc4bfab2c1c8e5cfbbbb28622cb160fcd13aff1991ee1c77ad8d3a",
 "src/components/living-hope/MorningStoryPanel.tsx": "a6b790113482da0dac486ef48d9dfecb93b35cd262f49897114e0c3455f108eb",
 "src/components/living-hope/ThanksgivingListsInput.tsx": "ec2dfd91c88b9ab152b47061e3de0fd86449506977a79a515407bbec7af5287c",
 "src/contexts/AuthContext.tsx": "c895e089d1e50ccb59a29a4e98554c3ac2eb9424c940c0fec5473f6aaf1c96f9",
 "src/integrations/supabase/types.ts": "c1c225c3e0a6daba0009e5aebaeb6f68044d4c95cf9ae93fddaf2574aea69619",
 "src/pages/living-hope/MorningReviewPage.tsx": "06771f013bb5518d3aa672e7a2dabbf886c3109bc1b421622110241481253bc8",
 "src/pages/reader/ReaderPage.tsx": "5fe92af7d37b9d0e13d0190c9110e403113d5a9f8b3b08f1e3859ffed193fb68",
 "src/components/living-hope/MorningFormulaFlow.test.tsx": "d2a361674b1dafcdfa0fc59992233ea89657b3c05f2effdcbff12c125ad34ec8",
 "src/lib/livingHope/morningFormulaJournalBody.test.ts": "0636c085f82c6ee37900c8a534fdc4934dba4f3035915cbb4166b0da6cb6c34b",
 "src/lib/livingHope/morningFormulaTimer.test.ts": "b5e9baeb66b5631621fd11efc60a90f0b235bfdb4d5dc09e02e1c90541846e5d",
 "src/lib/livingHope/spokenThanksgiving.test.ts": "e3041e9ea7a86cae494c33ae9cc72b1b747ea0d3e1a8327f380f7c83536f0162",
 "src/hooks/useMorningConversationEntry.ts": "18f63d833504f20230cb7dd365ff698359794af4704c88656e4c98e9f1d82a32",
 "src/hooks/useMorningFormulaTimer.ts": "d94b4f79c4c388349bdbc2952121168fac88e0c4fb6ecb17bd4ccfab8883bddd",
 "src/hooks/useMorningRitualDraft.ts": "30a0f33ae3901bfa37d46a65f14fcaf495c5cbc30510cda2df1b45796c655fe0",
 "src/lib/bible/readerNavigation.ts": "94b4a6a457e204cf465a3b08feced0bf66ee28d2b6b8a27b348aa498a901b5eb",
 "src/lib/livingHope/morningConversationJournal.ts": "a694a0233a6c44a9622dcc9ed98a7346f9a09297ec8c8dbf4511a1760a30def9",
 "src/lib/livingHope/morningFormulaTimer.ts": "bfb40ff470d1ab7897a3de96a3e07c139f99caa7aeaf843f7a289644aa2c4ac5",
 "src/lib/livingHope/morningReviewJournal.ts": "b506c1c600c406b8b35e9aa0e51b6b7d92958635f6bcdedba10bcfc0e3c6e4c3"
}
root = Path(__file__).resolve().parents[1]
plan = {}
for part in sorted((root / 'scripts').glob('mf-plan-?.json')):
    plan.update(json.loads(part.read_text()))
if set(plan) != set(EXPECTED):
    raise SystemExit('Incomplete source transport; refusing to apply')
prepared = {}
for name, (expected_before, edits) in plan.items():
    path = root / name
    raw = path.read_bytes() if path.exists() else None
    actual = hashlib.sha256(raw).hexdigest() if raw is not None else None
    if actual != expected_before:
        raise SystemExit(f'Source changed; refusing to overwrite {name}')
    lines = raw.decode().splitlines(keepends=True) if raw is not None else []
    for start, end, replacement in reversed(edits):
        lines[start:end] = [replacement]
    text = ''.join(lines)
    if name.endswith('MorningFormulaFlow.test.tsx'):
        text = text.replace('"@/../node_modules/@testing-library/react"', '"@testing-library/react"')
    digest = hashlib.sha256(text.encode()).hexdigest()
    if digest != EXPECTED[name]:
        raise SystemExit(f'Output mismatch for {name}: {digest}')
    prepared[path] = text
for path, text in prepared.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
print(f'Applied {len(prepared)} files; every source and output hash verified.')

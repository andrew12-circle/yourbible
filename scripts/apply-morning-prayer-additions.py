"""One-time, exact-context integration on the feature branch; removed after use."""
from pathlib import Path

def update(path, changes):
    target = Path(path)
    content = target.read_text()
    for old, new in changes:
        assert content.count(old) == 1, (path, old[:90], content.count(old))
        content = content.replace(old, new)
    target.write_text(content)

update('src/lib/livingHope/morningFoundation.ts', [
    ('/** Personal material', 'import { parseTonguesMinutes, parseWorshipMode, parseWorshipPrayerTimer, worshipPrayerRemaining, type WorshipMode, type WorshipPrayerTimer } from "./morningWorshipPrayer";\n\n/** Personal material'),
    ('  hopePrayer: string;\n}', '  hopePrayer: string;\n  worshipMode?: WorshipMode;\n  tonguesMinutes?: number;\n  angelPrayer?: string;\n  angelRecordingPath?: string;\n}'),
    ('  action: string;\n}', '  action: string;\n  worshipPrayer?: WorshipPrayerTimer;\n  angelsPrayed?: boolean;\n}'),
    ('return { theme: "", motto: "", question: "", hopePrayer: "" };', 'return { theme: "", motto: "", question: "", hopePrayer: "", worshipMode: "both", tonguesMinutes: 5, angelPrayer: "", angelRecordingPath: "" };'),
    ('return { theme: text(raw.theme), motto: text(raw.motto), question: text(raw.question), hopePrayer: text(raw.hopePrayer) };', 'return { theme: text(raw.theme), motto: text(raw.motto), question: text(raw.question), hopePrayer: text(raw.hopePrayer), worshipMode: parseWorshipMode(raw.worshipMode), tonguesMinutes: parseTonguesMinutes(raw.tonguesMinutes), angelPrayer: text(raw.angelPrayer), angelRecordingPath: text(raw.angelRecordingPath) };'),
    ('sceneId: text(raw.sceneId), sceneTitle: text(raw.sceneTitle), action: text(raw.action) };', 'sceneId: text(raw.sceneId), sceneTitle: text(raw.sceneTitle), action: text(raw.action),\n    ...(raw.worshipPrayer ? { worshipPrayer: parseWorshipPrayerTimer(raw.worshipPrayer) } : {}),\n    ...(raw.angelsPrayed === true ? { angelsPrayed: true } : {}) };'),
    ('  return blocks.join("\\n\\n");', '''  if (day.worshipPrayer?.hasStarted) {
    const remaining = worshipPrayerRemaining(day.worshipPrayer);
    const seconds = Math.floor(Math.max(0, day.worshipPrayer.targetMs - remaining) / 1000);
    blocks.push(`**Prayer-in-tongues timer:** ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} elapsed. Timer only, not a verification of prayer.`);
  }
  if (day.worshipPrayer?.prayedToday) blocks.push("**My check-in:** I prayed in the Spirit today.");
  if (day.angelPrayer?.trim()) blocks.push(`### Angels and protection — my personal prayer\\n\\n${day.angelPrayer}`);
  if (day.angelsPrayed) blocks.push("**My check-in:** I spoke my angels and protection prayer aloud today.");
  return blocks.join("\\n\\n");'''),
])
update('src/components/living-hope/foundation/MorningFoundationContext.tsx', [
    ('  selectedSceneId: string;', '  selectedSceneId: string;\n  worshipRemainingMs?: number;\n  soundCuesEnabled?: boolean;\n  onAddWorshipTime?: () => void;'),
])
update('src/pages/living-hope/MorningReviewPage.tsx', [
    ('      workbook, day: foundation, onEditingChange: setFoundationEditing,', '      workbook, day: foundation, onEditingChange: setFoundationEditing,\n      worshipRemainingMs: formulaTimer.stepRemainingMs, soundCuesEnabled: formulaTimer.soundCuesEnabled, onAddWorshipTime: formulaTimer.addFiveMinutes,'),
])
imports = 'import { MorningWorshipPractice, WorshipMusicChoice } from "./foundation/MorningWorshipPractice";\nimport { MorningAngelsPrayer } from "./foundation/MorningAngelsPrayer";\n'
update('src/components/living-hope/MorningGuidedExperience.tsx', [
    ('import { MorningFocusOpening', imports + 'import { MorningFocusOpening'),
    ('          <MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} />\n          <MorningWorshipGuide stepBudgetMs={stepBudgetMs} />', '          <MorningWorshipPractice />\n          <WorshipMusicChoice><MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} />\n          <MorningWorshipGuide stepBudgetMs={stepBudgetMs} /></WorshipMusicChoice>'),
    ('          <p className={cn(lh.bodySm, "leading-relaxed")}>{COVERING_STEP_INTRO}</p>', '          <MorningAngelsPrayer />\n          <p className={cn(lh.bodySm, "leading-relaxed")}>{COVERING_STEP_INTRO}</p>'),
])
update('src/components/living-hope/MorningRitualStepPanels.tsx', [
    ('import { MorningFocusOpening', imports + 'import { MorningFocusOpening'),
    ('        <MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} />', '        <MorningWorshipPractice />\n        <WorshipMusicChoice><MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} /></WorshipMusicChoice>'),
    ('        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{COVERING_STEP_INTRO}</p>', '        <MorningAngelsPrayer />\n        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{COVERING_STEP_INTRO}</p>'),
])

update('scripts/verify-morning-foundation-ui.mjs', [
    ("import { MorningFocusOpening, MorningRealMemories", "import { MorningWorshipPractice, WorshipMusicChoice } from '@/components/living-hope/foundation/MorningWorshipPractice';\nimport { MorningAngelsPrayer } from '@/components/living-hope/foundation/MorningAngelsPrayer';\nimport { MorningFocusOpening, MorningRealMemories"),
    ("workbook, day, selectedSceneId: scene, onEditingChange: setEditing,", "workbook, day, selectedSceneId: scene, onEditingChange: setEditing, worshipRemainingMs: 600000, soundCuesEnabled: false,"),
    ("['opening','gratitude','scene','assignment']", "['opening','gratitude','scene','assignment','worship','angels']"),
    ("    {view === 'opening' && <MorningFocusOpening />}", "    {view === 'opening' && <MorningFocusOpening />}\n    {view === 'worship' && <><MorningWorshipPractice /><WorshipMusicChoice><p>Fixture worship music</p></WorshipMusicChoice></>}\n    {view === 'angels' && <MorningAngelsPrayer />}"),
    ('    await inspect(size, "assignment");', '''    await inspect(size, "assignment");
    await page.getByRole("button", { name: "worship", exact: true }).click();
    await page.getByRole("button", { name: "Start prayer timer", exact: true }).click();
    await page.getByRole("button", { name: "Pause prayer timer", exact: true }).click();
    await page.getByRole("button", { name: "Pray in tongues", exact: true }).click();
    assert.equal(await page.getByText("Fixture worship music", { exact: true }).count(), 0);
    await inspect(size, "worship-prayer");
    await page.getByRole("button", { name: "angels", exact: true }).click();
    await page.getByRole("button", { name: "Write my prayer", exact: true }).click();
    await page.getByRole("textbox", { name: "My angels and protection prayer", exact: true }).fill("Fixture personal prayer. Not Scripture.");
    await inspect(size, "angels-editor");
    await page.getByRole("button", { name: "Save this prayer", exact: true }).click();
    await page.getByRole("button", { name: "Record my angels prayer", exact: true }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "I spoke this prayer aloud today" }).isChecked(), false);
    await page.getByRole("checkbox", { name: "I spoke this prayer aloud today" }).check();
    await inspect(size, "angels-prayer");'''),
    ('  await page.evaluate(() => document.documentElement.classList.add("dark"));', '  await page.setViewportSize({ width: 390, height: 844 });\n  await page.evaluate(() => document.documentElement.classList.add("dark"));'),
    ('  await inspect("phone-dark", "assignment");', '  await inspect("phone-dark", "angels-prayer");'),
])
with Path('docs/morning-personal-foundation.md').open('a') as doc:
    doc.write("\n## Worship prayer and angels recording\n\nWorship now offers Sing, Pray in tongues, or Both. The optional prayer timer defaults to five minutes (1/3/5/10 can be selected), runs inside the existing Worship budget, and supports pause/resume/reset. A shorter remaining Worship budget requires an explicit shorter choice or adding five minutes. No extra mandatory step, microphone access, transcription, or automatic claim of prayer completion is introduced. Timer/check-in data uses the same daily snapshot.\n\nCovering includes a separate Angels & protection prayer script, private own-voice recording, playback, and a daily spoken-prayer check-in. Existing covering/surrender scripts and recording paths remain separate. Recording replacements use fresh storage paths and do not delete the prior audio before saving; failed pointer saves offer retry. Playback never checks off a spoken prayer automatically.\n")

# This is a pure timer utility, not a React hook.
for filename in ('src/lib/livingHope/morningWorshipPrayer.ts', 'src/components/living-hope/foundation/MorningWorshipPractice.tsx', 'src/lib/livingHope/morningWorshipPrayer.test.ts'):
    target = Path(filename)
    target.write_text(target.read_text().replace('useRemainingWorshipTime', 'startRemainingWorshipPrayer'))

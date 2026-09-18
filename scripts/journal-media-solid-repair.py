from pathlib import Path
import subprocess

BASE = '7ca5d0441a0e98fd8b7b17923ee1dd677b1bbdba'
assert subprocess.check_output(['git', 'rev-parse', BASE], text=True).strip() == BASE

def replace(path, old, new, count=1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    assert found == count, f'{path}: expected {count} matches, got {found}: {old[:100]}'
    p.write_text(text.replace(old, new))

p = 'src/components/journal/EntryEditorPane.tsx'
replace(p, 'import EntryMiniMap from "@/components/journal/EntryMiniMap";', 'import JournalEntryMapDock from "@/components/journal/JournalEntryMapDock";\nimport { journalValueEqual, type JournalSnapshot } from "@/lib/journal/journalSaveQueue";')
replace(p, '  onChanged: () => void;', '  onChanged: (snapshot?: JournalSnapshot) => void;')
replace(p, 'const bottomDockRef = useRef<HTMLElement | null>(null);', 'const bottomDockRef = useRef<HTMLDivElement | null>(null);')
replace(p, '      setEntry(next as EntryRow);', '      setEntry((previous) => journalValueEqual(previous, next) ? previous : next as EntryRow);')
replace(p, '      setEntry(next);', '      // Storage durability/status notifications must not repaint the editor.\n      setEntry((previous) => journalValueEqual(previous, next) ? previous : next);')
replace(p, '        onChangedRef.current();', '        onChangedRef.current(state.snapshot);')
replace(p, '      entryRef.current = row;\n      setEntry(row);\n      // Always open', '      entryRef.current = row;\n      setEntry(row);\n      lastAcknowledgedRevision.current = row.revision;\n      acknowledgedBodyRef.current = row.body;\n      // Always open')
replace(p, '    await reloadVideos();\n    const id = entryRef.current?.id;', '    await reloadVideos();\n    onChangedRef.current(); // A real attachment change refreshes media metadata.\n    const id = entryRef.current?.id;')
replace(p, '      return (data ?? []).map((d: { storage_path: string }) => ({ storage_path: d.storage_path }));', '      onChangedRef.current();\n      return (data ?? []).map((d: { storage_path: string }) => ({ storage_path: d.storage_path }));')
replace(p, '    await supabase.from("journal_photos").delete().eq("id", id);', '    await supabase.from("journal_photos").delete().eq("id", id);\n    onChangedRef.current();')
replace(p, '                      await removeVideo(id, path);', '                      await removeVideo(id, path);\n                      onChangedRef.current();')
replace(p, '          {(!plainWriteLayout || bodyFocused) && (\n          <footer', '          {!plainWriteLayout && (\n          <footer')
text = Path(p).read_text()
start = text.index('      {plainWriteLayout ? (\n        <div\n          ref={bottomDockRef}')
end = text.index('\n      ) : null}', start) + len('\n      ) : null}')
text = text[:start] + '''      {plainWriteLayout ? (
        <JournalEntryMapDock
          ref={bottomDockRef}
          lat={entry.lat} lng={entry.lng}
          journalName={journal?.name} journalColor={journal?.color}
          temperature={entry.weather_temp_c} weatherIcon={entry.weather_icon}
          weather={entry.weather} location={entry.location_name}
        />
      ) : null}''' + text[end:]
Path(p).write_text(text)

for p in ['src/pages/journal/JournalPage.tsx', 'src/pages/journal/JournalNotesPage.tsx']:
    text = Path(p).read_text()
    text = 'import { notifyJournalListEntrySaved } from "@/lib/journal/journalListUpdates";\nimport type { JournalSnapshot } from "@/lib/journal/journalSaveQueue";\n' + text
    old = '  const handleEditorChanged = useCallback(() => {\n    setReloadKey((k) => k + 1);\n  }, []);'
    assert text.count(old) == 1
    text = text.replace(old, '''  const handleEditorChanged = useCallback((snapshot?: JournalSnapshot) => {
    if (snapshot) notifyJournalListEntrySaved(snapshot);
    else setReloadKey((k) => k + 1);
  }, []);''')
    text = text.replace('}, [user]);', '}, [user?.id]);')
    Path(p).write_text(text)

p = 'src/hooks/useJournalListController.ts'
replace(p, 'useCallback, useEffect, useRef, useState,', 'useCallback, useEffect, useMemo, useRef, useState,')
replace(p, 'type ListState = {', '''import { applyJournalListSnapshot, JOURNAL_LIST_ENTRY_SAVED } from "@/lib/journal/journalListUpdates";
import type { JournalSnapshot } from "@/lib/journal/journalSaveQueue";
import type { StableMediaUrlCache } from "@/lib/journal/stableMediaUrls";

type ListState = {''')
replace(p, '  const latest = useRef({ options, scope, dek });\n  latest.current = { options, scope, dek };', '''  const mediaCache = useMemo<StableMediaUrlCache>(() => ({ urls: new Map(), pending: new Map() }), [options.userId, dek]);
  const latest = useRef({ options, scope, dek, mediaCache });
  latest.current = { options, scope, dek, mediaCache };''')
replace(p, 'fetchEntryListMediaUrls(rows.filter((row) => !row.contentLocked).map((row) => row.id))', 'fetchEntryListMediaUrls(rows.filter((row) => !row.contentLocked).map((row) => row.id), current.mediaCache)')
replace(p, '  const setEntries = useCallback(', '''  useEffect(() => {
    const onSaved = (event: Event) => {
      const snapshot = (event as CustomEvent<JournalSnapshot>).detail;
      const current = latest.current;
      if (!snapshot || snapshot.userId !== current.options.userId) return;
      const previous = stateRef.current;
      if (!previous || previous.scope !== current.scope || previous.dek !== current.dek) {
        void load();
        return;
      }
      const update = applyJournalListSnapshot(previous.rows, snapshot, current.options, Boolean(current.dek));
      if (!update.reload) {
        setState((value) => {
          if (!value || value.scope !== current.scope || value.dek !== current.dek) return value;
          const next = applyJournalListSnapshot(value.rows, snapshot, current.options, Boolean(current.dek));
          return next.rows === value.rows ? value : { ...value, rows: next.rows };
        });
      }
      // A pre-save read cannot overwrite the acknowledged preview. Abort/restart
      // that read; the normal idle autosave path performs no list/media request.
      if (update.reload || request.current) void load();
    };
    window.addEventListener(JOURNAL_LIST_ENTRY_SAVED, onSaved);
    return () => window.removeEventListener(JOURNAL_LIST_ENTRY_SAVED, onSaved);
  }, [load]);

  const setEntries = useCallback(''')

p = 'src/lib/journal/entryListMedia.ts'
replace(p, 'export type EntryListMediaUrls = {', 'import { stableMediaUrls, type StableMediaUrlCache } from "./stableMediaUrls";\n\nexport type EntryListMediaUrls = {')
replace(p, 'fetchEntryListMediaUrls(entryIds: string[]): Promise<EntryListMediaUrls>', 'fetchEntryListMediaUrls(entryIds: string[], cache?: StableMediaUrlCache): Promise<EntryListMediaUrls>')
replace(p, '  const firstPhoto: Record<string, string> = {};', '''  // A failed metadata read is not an empty collection. Preserve visible media
  // through the controller's background-error path instead of removing it.
  if (photosRes.error) throw photosRes.error;
  if (videosRes.error) throw videosRes.error;
  const firstPhoto: Record<string, string> = {};''')
replace(p, '    getSignedPhotoUrls(Object.values(firstPhoto)),\n    getSignedVideoUrls(Object.values(firstVideo)),', '''    cache ? stableMediaUrls(Object.values(firstPhoto), "photo", cache, getSignedPhotoUrls) : getSignedPhotoUrls(Object.values(firstPhoto)),
    cache ? stableMediaUrls(Object.values(firstVideo), "video", cache, getSignedVideoUrls) : getSignedVideoUrls(Object.values(firstVideo)),''')
p = 'src/hooks/useJournalListController.test.tsx'
replace(p, 'expect(h.media).toHaveBeenCalledWith(["open"]);', 'expect(h.media).toHaveBeenCalledWith(["open"], expect.objectContaining({ urls: expect.any(Map), pending: expect.any(Map) }));')
p = 'src/components/journal/EntryListMediaThumbnail.tsx'
replace(p, 'import { Play }', 'import { memo } from "react";\nimport { Play }')
replace(p, 'export default function EntryListMediaThumbnail(', 'function EntryListMediaThumbnail(')
with Path(p).open('a') as f: f.write('\nexport default memo(EntryListMediaThumbnail);\n')

p = 'src/components/journal/EntryMiniMap.tsx'
replace(p, 'import { memo, useMemo } from "react";', 'import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";')
replace(p, 'import { ControlPosition, Map, Marker }', 'import { ControlPosition, Map, Marker, useMap, type MapEvent }')
replace(p, 'const GoogleMiniMap = memo(', '''const MAP_TYPE_OPTIONS = { position: ControlPosition.TOP_RIGHT };
const ZOOM_OPTIONS = { position: ControlPosition.RIGHT_CENTER };
const STREET_VIEW_OPTIONS = { position: ControlPosition.RIGHT_BOTTOM };

function MapLocationSync({ lat, lng }: Pick<Props, "lat" | "lng">) {
  const map = useMap();
  const previous = useRef<{ map: google.maps.Map; lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!map) return;
    const old = previous.current;
    if (old?.map === map && (old.lat !== lat || old.lng !== lng)) map.panTo({ lat, lng });
    previous.current = { map, lat, lng };
  }, [map, lat, lng]);
  return null;
}

const GoogleMiniMap = memo(''')
replace(p, '  const center = { lat, lng };', '''  const center = useMemo(() => ({ lat, lng }), [lat, lng]);
  const [mapTypeId, setMapTypeId] = useState<string>(JOURNAL_DEFAULT_MAP_TYPE);
  const onMapTypeIdChanged = useCallback((event: MapEvent) => {
    setMapTypeId(event.map.getMapTypeId() ?? JOURNAL_DEFAULT_MAP_TYPE);
  }, []);''')
replace(p, '          mapTypeId={JOURNAL_DEFAULT_MAP_TYPE}', '          mapTypeId={mapTypeId}\n          onMapTypeIdChanged={onMapTypeIdChanged}')
replace(p, 'mapTypeControlOptions={{ position: ControlPosition.TOP_RIGHT }}', 'mapTypeControlOptions={MAP_TYPE_OPTIONS}')
replace(p, 'zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}', 'zoomControlOptions={ZOOM_OPTIONS}')
replace(p, 'streetViewControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}', 'streetViewControlOptions={STREET_VIEW_OPTIONS}')
replace(p, '          <GoogleMapErrorDetector />', '          <GoogleMapErrorDetector />\n          <MapLocationSync lat={lat} lng={lng} />')

print('Applied reviewed journal media stability patch.')

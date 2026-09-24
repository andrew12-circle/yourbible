// OpenBible.info data (CC BY 4.0). Preserve source scores, not probabilities.
export const SOURCE_COMMIT = '7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f';
export const TRANSLATIONS = ['csb', 'esv', 'kjv', 'leb', 'nasb', 'net', 'niv', 'nkjv', 'nlt', 'nrsv'];
const OSIS = 'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split(' ');
export function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
export function parseOsis(value) {
  const match = String(value).match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid alternate verse: ${value}`);
  const b = OSIS.indexOf(match[1]) + 1, c = Number(match[2]), v = Number(match[3]);
  if (!b || c < 1 || c > 150 || v < 1 || v > 176) throw new Error(`Out-of-range alternate verse: ${value}`);
  return [b, c, v];
}
export function parseCoordinates(value) {
  if (typeof value !== 'string') return null;
  const pair = value.split(',');
  if (pair.length !== 2 || pair.some((part) => !part.trim())) return null;
  const [lon, lat] = pair.map(Number);
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90 ? { lon, lat } : null;
}
function normalizeVerse(verse, placeId) {
  const key = String(verse.sort).padStart(8, '0');
  if (!/^\d{8}$/.test(key)) throw new Error(`Missing canonical verse key at ${placeId}`);
  const b = Number(key.slice(0, 2)), c = Number(key.slice(2, 5)), v = Number(key.slice(5, 8));
  if (b < 1 || b > 66 || c < 1 || c > 150 || v < 1 || v > 176) throw new Error(`Invalid verse ${key} at ${placeId}`);
  const translations = Array.isArray(verse.translations) ? verse.translations : [];
  const t = TRANSLATIONS.reduce((mask, name, i) => translations.includes(name) ? mask | (1 << i) : mask, 0);
  const a = {};
  for (const [translation, reference] of Object.entries(verse.alternate_verses ?? {})) if (TRANSLATIONS.includes(translation)) a[translation] = parseOsis(reference);
  return { b, c, v, t, ...(Object.keys(a).length ? { a } : {}) };
}
export function normalizePlace(raw) {
  if (!/^a[0-9a-f]{6}$/.test(raw.id) || !raw.friendly_id || (raw.verses !== undefined && !Array.isArray(raw.verses))) throw new Error(`Invalid ancient place: ${raw.id}`);
  const candidates = [], unresolved = [], seen = new Set();
  for (const [i, identification] of (raw.identifications ?? []).entries()) {
    const special = identification.special;
    if (special) unresolved.push({ kind: special, description: plain(identification.description || special.replaceAll('_', ' ')), score: identification.score?.time_total ?? null });
    for (const [j, resolution] of (identification.resolutions ?? []).entries()) {
      if (resolution.special) {
        unresolved.push({ kind: resolution.special, description: plain(resolution.description || resolution.special.replaceAll('_', ' ')), score: identification.score?.time_total ?? null });
        continue;
      }
      const coordinates = parseCoordinates(resolution.lonlat);
      if (!coordinates) {
        if (resolution.lonlat) throw new Error(`Invalid coordinates for ${raw.id}: ${resolution.lonlat}`);
        continue;
      }
      const modernId = resolution.modern_basis_id, association = raw.modern_associations?.[modernId];
      const description = plain(resolution.description || identification.description || association?.name || raw.friendly_id);
      const coordinateKind = resolution.lonlat_type || 'reference point';
      const key = `${modernId}|${coordinates.lon}|${coordinates.lat}|${coordinateKind}|${description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const score = association?.score ?? identification.score?.time_total ?? null;
      if (score !== null && !Number.isFinite(score)) throw new Error(`Non-numeric source score for ${raw.id}: ${JSON.stringify(score)}`);
      candidates.push({ id: `${raw.id}-${i}-${j}`, modernId: modernId || '', name: plain(association?.name || description), description, ...coordinates, coordinateKind, score, radiusMeters: resolution.geometry_radius_meters ?? identification.geometry_radius_meters ?? null, geometryId: resolution.geometry_id ?? identification.geometry_id ?? null });
    }
  }
  candidates.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { id: raw.id, name: plain(raw.friendly_id), aliases: Object.keys(raw.translation_name_counts ?? {}).map(plain).sort(), type: plain(raw.types?.join(', ') || raw.type || 'place'), sourceUrl: `https://www.openbible.info/geo/ancient/${raw.id}/${encodeURIComponent(raw.url_slug || raw.friendly_id.toLowerCase().replaceAll(' ', '-'))}`, notes: plain(raw.comment), geojsonFile: raw.geojson_file || null, candidates, unresolved: [...new Map(unresolved.map((item) => [`${item.kind}|${item.description}`, item])).values()], references: (raw.verses ?? []).map((verse) => normalizeVerse(verse, raw.id)) };
}
export function normalizeAtlas(text) {
  const places = text.split(/\r?\n/).filter((line) => line.trim()).map((line, i) => {
    try { return normalizePlace(JSON.parse(line)); }
    catch (error) { throw new Error(`Ancient JSONL line ${i + 1}: ${error.message}`); }
  });
  if (new Set(places.map((place) => place.id)).size !== places.length) throw new Error('Duplicate ancient IDs');
  places.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const scores = places.flatMap((place) => place.candidates.map((candidate) => candidate.score).filter((score) => score !== null));
  console.log(`Preserved source score range: ${Math.min(...scores)} to ${Math.max(...scores)}`);
  return places;
}

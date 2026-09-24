import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { SOURCE_COMMIT, TRANSLATIONS, normalizeAtlas } from './normalize.mjs';

const directory = new URL('../../public/bible-geography/', import.meta.url);
const upstream = `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/${SOURCE_COMMIT}/`;
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function download(path) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${upstream}${path}`, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      const text = await response.text();
      if (!text.trim() || text.length > 100_000_000) throw new Error(`Invalid payload size: ${path}`);
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }
  throw lastError;
}

export async function verify() {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
  const text = await readFile(new URL('atlas-v1.json', directory), 'utf8');
  const atlas = JSON.parse(text);
  if (manifest.sourceCommit !== SOURCE_COMMIT || manifest.sha256 !== hash(text)) throw new Error('Atlas provenance/hash mismatch');
  if (atlas.schemaVersion !== 1 || atlas.places.length !== manifest.placeCount || atlas.places.length < 1000) throw new Error('Incomplete atlas');
  if (atlas.places.some((place) => !Array.isArray(place.references) || !Array.isArray(place.candidates))) throw new Error('Invalid atlas schema');
  const allKml = await readFile(new URL('source-atlas.kml', directory), 'utf8');
  if (hash(allKml) !== manifest.kmlSha256 || !allKml.includes('<kml')) throw new Error('Source KML integrity mismatch');
  console.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv.includes('--verify')) {
  await verify();
} else {
  await mkdir(directory, { recursive: true });
  const [raw, license, kml] = await Promise.all([download('data/ancient.jsonl'), download('license.txt'), download('all.kml')]);
  const places = normalizeAtlas(raw);
  if (places.length < 1000 || !places.some((place) => place.name === 'Jerusalem') || !places.some((place) => place.name === 'Rome')) throw new Error('Source atlas incomplete');
  const atlas = {
    schemaVersion: 1,
    source: { name: 'OpenBible.info', url: 'https://www.openbible.info/geo/', commit: SOURCE_COMMIT, sourceDate: '2021-11-01', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', notice: 'Includes OpenStreetMap-derived data under ODbL 1.0. Source scores are not independently verified probabilities. Current imagery is not a reconstruction of biblical-era buildings.' },
    translations: TRANSLATIONS,
    places,
  };
  const text = JSON.stringify(atlas);
  const manifest = {
    schemaVersion: 1,
    sourceCommit: SOURCE_COMMIT,
    sourceDate: atlas.source.sourceDate,
    sourceSha256: hash(raw),
    sha256: hash(text),
    kmlSha256: hash(kml),
    placeCount: places.length,
    mappedPlaceCount: places.filter((place) => place.candidates.length > 0).length,
    unlocatedPlaceCount: places.filter((place) => place.candidates.length === 0).length,
    candidateCount: places.reduce((sum, place) => sum + place.candidates.length, 0),
    verseAssociationCount: places.reduce((sum, place) => sum + place.references.length, 0),
    translationCount: TRANSLATIONS.length,
    bytes: Buffer.byteLength(text),
  };
  await writeFile(new URL('atlas-v1.json', directory), text);
  await writeFile(new URL('source-atlas.kml', directory), kml);
  await writeFile(new URL('LICENSE-OpenBible.txt', directory), license);
  await writeFile(new URL('ATTRIBUTION.txt', directory), `YourBible Biblical Geography\nDerived from OpenBible.info / Bible-Geocoding-Data\nSource: https://www.openbible.info/geo/\nRevision: ${SOURCE_COMMIT} (2021-11-01)\nData: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/\nSome coordinates and geometry derive from OpenStreetMap contributors, https://www.openstreetmap.org/copyright, ODbL 1.0 https://opendatacommons.org/licenses/odbl/1-0/\nChanges: normalized ancient places, candidate resolutions and translation-specific verse associations into a searchable application index. Source KML is copied without alteration. No Scripture text or image assets are republished.\n`);
  await writeFile(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
  await verify();
}

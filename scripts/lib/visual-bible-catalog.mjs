import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** One registry shared by acquisition and release verification. Missing files fail closed. */
export const VISUAL_SEED_FILES = ['seed.json', 'readerExpansion.json', 'collectionExpansion.json'];
export async function readVisualSeed(root) {
  return (await Promise.all(VISUAL_SEED_FILES.map(async name => {
    const data = JSON.parse(await readFile(join(root, 'src/data/visualBible', name), 'utf8'));
    if (!Array.isArray(data)) throw new Error(`Invalid visual catalog: ${name}`);
    return data;
  }))).flat();
}
export function derivativeSpecs(asset) {
  if (asset.imageUrl.startsWith('/')) return [{ path: asset.imageUrl, size: null, quality: null }];
  const specs = asset.readerDerivative ? [['thumb', 640, 78], ['reader', 1600, 84], ['detail', 3200, 88]] : [['thumb', 640, 78], ['detail', 2400, 88]];
  return specs.map(([name, size, quality]) => ({ path: `/visual-bible/v1/${asset.id}-${asset.revision}-${name}.webp`, size, quality }));
}
export const CANON_CHAPTERS = Object.fromEntries('Gen:50 Exo:40 Lev:27 Num:36 Deu:34 Jos:24 Jdg:21 Rut:4 1Sa:31 2Sa:24 1Ki:22 2Ki:25 1Ch:29 2Ch:36 Ezr:10 Neh:13 Est:10 Job:42 Psa:150 Pro:31 Ecc:12 Sng:8 Isa:66 Jer:52 Lam:5 Ezk:48 Dan:12 Hos:14 Jol:3 Amo:9 Oba:1 Jon:4 Mic:7 Nam:3 Hab:3 Zep:3 Hag:2 Zec:14 Mal:4 Mat:28 Mrk:16 Luk:24 Jhn:21 Act:28 Rom:16 1Co:16 2Co:13 Gal:6 Eph:6 Php:4 Col:4 1Th:5 2Th:3 1Ti:6 2Ti:4 Tit:3 Phm:1 Heb:13 Jas:5 1Pe:5 2Pe:3 1Jn:5 2Jn:1 3Jn:1 Jud:1 Rev:22'.split(' ').map(value => { const [book, chapters] = value.split(':'); return [book, Number(chapters)]; }));

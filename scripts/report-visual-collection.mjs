import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const files = ['seed.json', 'readerExpansion.json', 'collectionExpansion.json'];
const groups = await Promise.all(files.map(file => read(join('src/data/visualBible', file))));
const catalogue = groups.flat();
const manifest = await read('public/visual-bible/v1/manifest.json');
const countBy = (items, get) => Object.fromEntries([...new Set(items.flatMap(get))].sort().map(key => [key, items.filter(item => get(item).includes(key)).length]));
const report = {
  recordsByFile: Object.fromEntries(files.map((file, i) => [file, groups[i].length])),
  totalPublicationRecords: catalogue.length,
  uniqueRecordIds: new Set(catalogue.map(a => a.id)).size,
  physicalWorkOrViewGroups: new Set(catalogue.map(a => a.workGroup || a.id)).size,
  kinds: countBy(catalogue, a => [a.kind]),
  collections: countBy(catalogue, a => a.collections || []),
  distinctCreators: new Set(catalogue.map(a => a.creator)).size,
  iconic: catalogue.filter(a => a.iconic).map(a => ({ id:a.id, title:a.title, creator:a.creator, passages:a.passages })),
  acquiredRecords: manifest.entries.length,
  localImageFiles: manifest.entries.reduce((sum, entry) => sum + entry.files.length, 0),
  imageBytes: manifest.entries.reduce((sum, entry) => sum + entry.files.reduce((n, file) => n + file.bytes, 0), 0),
  note: 'Records, physical work groups, artists/makers, historical atlas plates, and file derivatives are different counts. This report is not independent historical or legal certification.'
};
if (report.uniqueRecordIds !== catalogue.length || manifest.entries.length !== catalogue.length) throw new Error('Catalog/manifest identity mismatch');
const output = join(process.env.RUNNER_TEMP || '.', 'visual-collection-report.json');
await writeFile(output, JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify(report, null, 2));

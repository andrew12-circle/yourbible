import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinates, parseOsis, normalizePlace, normalizeAtlas } from './normalize.mjs';
const base = { id: 'a123456', friendly_id: 'Test place', url_slug: 'test-place', type: 'settlement', verses: [{ sort: '43009007', translations: ['csb', 'esv'] }], identifications: [], translation_name_counts: { 'Other name': 1 } };
test('longitude comes first in the source; rejects empty and invalid coordinates', () => {
  assert.deepEqual(parseCoordinates('35.234,31.773'), { lon: 35.234, lat: 31.773 });
  for (const invalid of ['NaN,30', '181,30', '35,91', ',30', '35,', '35,30,0']) assert.equal(parseCoordinates(invalid), null);
});
test('OSIS supports numbered books and correct canonical order', () => {
  assert.deepEqual(parseOsis('Acts.4.6'), [44, 4, 6]);
  assert.deepEqual(parseOsis('1Kgs.12.15'), [11, 12, 15]);
  assert.throws(() => parseOsis('Nope.1.1'));
});
test('unlocated places never get invented coordinates', () => {
  const result = normalizePlace({ ...base, identifications: [{ special: 'unknown_place', description: 'Unknown location', score: { time_total: 1000 }, resolutions: [{ special: 'unknown_place' }] }] });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.unresolved[0].kind, 'unknown_place');
});
test('retains alternatives, source scores, regional precision and alias names', () => {
  const result = normalizePlace({ ...base, modern_associations: { m123456: { name: 'Site A', score: 350 }, m234567: { name: 'Site B', score: 75 } }, identifications: [{ score: { time_total: 500 }, geometry_radius_meters: 10000, resolutions: [{ modern_basis_id: 'm123456', lonlat: '35,31', lonlat_type: 'center', description: 'near <modern id="m123456">Site A</modern>' }, { modern_basis_id: 'm234567', lonlat: '36,32', lonlat_type: 'point' }] }] });
  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].score, 350);
  assert.equal(result.candidates[0].radiusMeters, 10000);
  assert.equal(result.candidates[0].description, 'near Site A');
  assert.deepEqual(result.aliases, ['Other name']);
});
test('canonical verse numbers, translation bitmask and shifted verses are retained', () => {
  const result = normalizePlace({ ...base, verses: [{ sort: '44004005', translations: ['csb', 'kjv'], alternate_verses: { kjv: 'Acts.4.6' } }] });
  assert.deepEqual(result.references, [{ b: 44, c: 4, v: 5, t: 5, a: { kjv: [44, 4, 6] } }]);
});
test('duplicate ancient IDs and malformed verse keys stop import', () => {
  assert.throws(() => normalizeAtlas([JSON.stringify(base), JSON.stringify(base)].join('\n')), /Duplicate/);
  assert.throws(() => normalizePlace({ ...base, verses: [{ sort: '99001001' }] }), /Invalid verse/);
});

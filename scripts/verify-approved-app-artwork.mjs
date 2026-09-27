import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

// Git blob checksums bind the shipped bytes to the inspected reference extractions.
const expected = {
  overview: '108be00f488dadf19f3b156b3117c3c8901071a1',
  bible: '1a850e3abe5fa8bbf5b82f6147ec5dd838587271',
  journal: '700350c6d3292163c703fa45ec3f5544ac65519d',
  prayer: '00259a8842e3dfc9a7b041b2f68e7f1adbe7b436',
  notes: 'dbd9df0b1790a28937566271664f1e19591ce132',
  'morning-formula': '46bdef5eeb364c0a3ea0ed73d56397836e958902',
  'mind-map': '506915e9103fd453c66c244a70f969008805105e',
  artifacts: '0a1742a8cc32108affa4a8b43ad7ce2a0b505e6c',
  'lumen-ai': 'c561255497e5a25b7c308cd2970b7d6f17731e0b',
  tasks: '81f8e7560ea0d47946e13996563430716aa2d76d',
  habits: '1447817723bf9f63b539ae6af4f356d35a258707',
  'vision-board': '6c473a9a3d8e5c8545941d122e817e83de5ac319',
  settings: 'e530038dcee825c5c134fa3b786ea06d94138140',
};
let total = 0;
for (const [name, checksum] of Object.entries(expected)) {
  const bytes = await readFile(new URL(`../public/app-icons/illustrated-v1/${name}.webp`, import.meta.url));
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), checksum, `${name}: wrong artwork bytes`);
  const image = sharp(bytes);
  const metadata = await image.metadata();
  assert.equal(metadata.width, 160, name);
  assert.equal(metadata.height, 160, name);
  assert.equal(metadata.format, 'webp', name);
  assert.equal(metadata.hasAlpha, true, name);
  const pixels = await image.ensureAlpha().raw().toBuffer();
  assert.equal(pixels[3], 0, `${name}: transparent corner required`);
  assert.ok(pixels[(80 * 160 + 80) * 4 + 3] > 240, `${name}: opaque artwork center required`);
  total += bytes.length;
}
assert.ok(total < 70_000, 'Core icons must remain a small cached asset set');
console.log(`Verified ${Object.keys(expected).length} decoded reference images (${total} bytes).`);

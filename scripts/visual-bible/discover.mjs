/** Discovery writes a review queue only. Nothing here can publish to the reader. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { TARGETS, COLLECTION_GOALS, ICONIC_TARGETS } from './targets.mjs';
const OUT = process.env.VISUAL_REVIEW_DIR || '.visual-review';
const UA = 'YourBibleVisualResearch/2.0 (https://github.com/andrew12-circle/yourbible; editorial image review)';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const plain = value => String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const sha = value => createHash('sha256').update(value).digest('hex');
async function request(url, json = true) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'].includes(parsed.hostname)) throw new Error('Unapproved discovery host');
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'image/*' }, signal: AbortSignal.timeout(35000), redirect: 'error' });
    if (response.status === 429 || response.status === 503) { await response.body?.cancel(); await pause(Math.min(60000, Number(response.headers.get('retry-after') || 3) * 1000 + attempt * 2000)); continue; }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 6000000) throw new Error('Discovery response exceeds limit');
    const data = json ? JSON.parse(buffer.toString('utf8')) : buffer;
    if (json && data.error) { if (data.error.code === 'maxlag') { await pause(5000); continue; } throw new Error(data.error.info); }
    return data;
  }
  throw new Error('Provider throttled the bounded retry budget');
}
function supportedLicense(meta) {
  const label = plain(meta.LicenseShortName?.value);
  const rawUrl = plain(meta.LicenseUrl?.value);
  if (label === 'Public domain' || label === 'PDM') return { label: 'Public domain', url: 'https://creativecommons.org/publicdomain/mark/1.0/' };
  if (label === 'CC0' || /creativecommons.org\/publicdomain\/zero\/1.0/.test(rawUrl)) return { label: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
  const cc = /^CC (BY|BY-SA) (2\.0|2\.5|3\.0|4\.0)$/.exec(label);
  if (cc) return { label, url: `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/` };
  return null;
}
await mkdir(join(OUT, 'thumbnails'), { recursive: true });
const results = [];
for (const [index, target] of TARGETS.entries()) {
  const savePath = join(OUT, target.id + '.json');
  try { const old = JSON.parse(await readFile(savePath, 'utf8')); if (old.target.query === target.query && old.candidates?.length) { results.push(old); continue; } } catch { /* Cache misses are expected. */ }
  const result = { target, candidates: [], errors: [] };
  try {
    const args = { action: 'query', format: 'json', formatversion: '2', maxlag: '5', prop: 'imageinfo|revisions', iiprop: 'url|size|mime|extmetadata|sha1|timestamp', iiurlwidth: '400', iiextmetadatalanguage: 'en', rvprop: 'ids|timestamp' };
    if (target.file) args.titles = 'File:' + target.file;
    else Object.assign(args, { generator: 'search', gsrnamespace: '6', gsrlimit: '3', gsrsearch: target.query });
    const data = await request('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams(args));
    const pages = (data.query?.pages || []).sort((a,b) => (a.index || 0) - (b.index || 0));
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata || {};
      const license = supportedLicense(meta);
      const rejects = [];
      if (!license) rejects.push('Unsupported or unknown image rights');
      if (Math.max(info.width || 0, info.height || 0) < 1200) rejects.push('Source below 1200 pixels');
      if (!/^image\/(jpeg|png|tiff|webp)$/.test(info.mime || '')) rejects.push('Unsupported source format');
      if (/nonfree|non-free|no derivatives|noncommercial|non-commercial/i.test(plain(meta.Restrictions?.value))) rejects.push('Source restriction requires separate review');
      const item = { key: `${target.id}--${page.pageid}`, file: page.title, pageId: page.pageid, pageRevision: page.revisions?.[0]?.revid, sourcePage: info.descriptionurl, imageUrl: info.url, thumbnailUrl: info.thumburl, width: info.width, height: info.height, bytes: info.size, mime: info.mime, sourceSha1: info.sha1, imageTimestamp: info.timestamp, license, creator: plain(meta.Artist?.value), credit: plain(meta.Credit?.value), attribution: plain(meta.Attribution?.value), date: plain(meta.DateTimeOriginal?.value), description: plain(meta.ImageDescription?.value), categories: plain(meta.Categories?.value), restrictions: plain(meta.Restrictions?.value), meta, rejects };
      if (!rejects.length && info.thumburl) {
        try { const bytes = await request(info.thumburl, false); item.previewFile = 'thumbnails/' + item.key + '.jpg'; item.previewSha256 = sha(bytes); await writeFile(join(OUT, item.previewFile), bytes); }
        catch(error) { item.previewError = String(error); }
      }
      result.candidates.push(item);
    }
  } catch(error) { result.errors.push(String(error)); }
  results.push(result);
  await writeFile(savePath, JSON.stringify(result, null, 2));
  console.log(`${index+1}/${TARGETS.length} ${target.id}: ${result.candidates.length} candidates / ${result.candidates.filter(c => !c.rejects.length).length} eligible ${result.errors.join('; ')}`);
  await pause(300);
}
await writeFile(join(OUT, 'review.json'), JSON.stringify({ generatedAt: new Date().toISOString(), goals: COLLECTION_GOALS, iconicTargets: ICONIC_TARGETS, results }, null, 2));
await writeFile(join(OUT, 'summary.json'), JSON.stringify({ requested: TARGETS.length, goals: COLLECTION_GOALS, packs: Object.fromEntries(Object.keys(COLLECTION_GOALS).map(pack => [pack, { requested: TARGETS.filter(t => t.pack === pack).length, withEligibleCandidate: results.filter(r => r.target.pack === pack && r.candidates.some(c => !c.rejects.length)).length }])), failures: results.filter(r => r.errors.length).map(r => ({ id: r.target.id, errors: r.errors })) }, null, 2));
console.log('Review queue written. No app catalog or published image has been changed.');

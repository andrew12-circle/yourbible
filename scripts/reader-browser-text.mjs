import assert from 'node:assert/strict';

export const fixtureVerseText = verse => verse.parts?.length
  ? verse.parts.filter(part => part.kind === 'text').map(part => part.text).join('')
  : verse.text.trim();

/** A verse may cross a page, but each source character must appear exactly once. */
export async function renderedVerseFragments(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-reader-page-side] [data-verse-id]')].map(node => {
    const body = node.querySelector('[data-verse-body]').cloneNode(true);
    body.querySelectorAll('sup, figure').forEach(mark => mark.remove());
    const start = Number(node.dataset.verseStart || 0);
    return {id:node.dataset.verseId, start, end:Number(node.dataset.verseEnd ?? start + body.textContent.length), text:body.textContent};
  }));
}
export function verifyFragmentWords(rows, lookup) {
  for (const row of rows) {
    const [,book,chapter,verse] = row.id.split(':');
    const source = fixtureVerseText(lookup(book, Number(chapter), Number(verse)));
    assert(row.start >= 0 && row.end > row.start && row.end <= source.length, 'Invalid source offsets: '+row.id);
    assert.equal(row.text, source.slice(row.start,row.end), 'Lost or changed Scripture: '+row.id+'@'+row.start);
  }
}
export function verifyConsecutiveFragments(rows, lookup, {complete=false}={}) {
  verifyFragmentWords(rows,lookup);
  const groups=[];
  for (const row of rows) {
    const previous=groups.at(-1);
    if(previous?.id===row.id) {
      assert.equal(row.start,previous.end,'Repeated/skipped characters: '+row.id);
      previous.end=row.end; previous.text+=row.text;
    } else {
      assert(!groups.some(group=>group.id===row.id),'Repeated verse: '+row.id);
      if(previous) {
        const [,b,c,v]=previous.id.split(':');
        assert.equal(previous.end,fixtureVerseText(lookup(b,Number(c),Number(v))).length,'Skipped verse ending');
        assert.equal(row.start,0,'Skipped verse opening');
      } else if(complete) assert.equal(row.start,0,'Missing chapter opening');
      groups.push({...row});
    }
  }
  if(complete && groups.length) {
    const last=groups.at(-1),[,b,c,v]=last.id.split(':');
    assert.equal(last.end,fixtureVerseText(lookup(b,Number(c),Number(v))).length,'Missing chapter ending');
  }
  return groups.map(group=>group.id);
}

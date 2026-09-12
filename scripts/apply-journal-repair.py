"""One-time, fail-closed patch application on the isolated repair branch only."""
import base64, gzip, json, subprocess
from pathlib import Path
branch = subprocess.check_output(['git','branch','--show-current'], text=True).strip()
if branch != 'fix/journal-reliability-20260912':
    raise SystemExit('Refusing to modify any branch other than the isolated journal repair branch.')
manifest = json.loads(gzip.decompress(base64.b64decode(Path('scripts/journal-repair-manifest.b64').read_text())))
result = {}
def path_checked(name):
    path=Path(name)
    if path.is_absolute() or '..' in path.parts or not name.startswith(('src/', 'supabase/functions/','docs/')):
        raise ValueError('Disallowed output path: '+name)
    return path
for name, text in manifest['files'].items():
    path_checked(name)
    result[name] = text
for op in manifest['operations']:
    name=op['path']; path=path_checked(name)
    text=result.get(name, path.read_text())
    if op['kind'] == 'prepend': text=op['new']+text
    elif op['kind'] == 'replace':
        count=text.count(op['old'])
        if count != op['count']:
            raise ValueError(f'{name}: expected {op["count"]} copies, found {count}: {op["old"][:180]!r}')
        text=text.replace(op['old'],op['new'])
    elif op['kind'] == 'region':
        if text.count(op['start']) != 1 or text.count(op['end']) != 1:
            raise ValueError(f'{name}: ambiguous region: {op["start"][:160]!r} ({text.count(op["start"])}) to {op["end"][:160]!r} ({text.count(op["end"])})')
        first=text.index(op['start']); last=text.index(op['end'],first)
        text=text[:first]+op['new']+text[last:]
    else: raise ValueError('Unknown operation')
    result[name]=text
# Validate every anchor in memory before touching any source file.
for name,text in result.items():
    path=path_checked(name); path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text)
    print(name)
Path('/tmp/journal-repair-files.json').write_text(json.dumps(list(result)))

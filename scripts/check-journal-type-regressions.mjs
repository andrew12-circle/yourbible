import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Existing repository-wide type debt is reported, not disguised as a clean tsc.
// Fail on any additional diagnostic relative to the explicitly supplied baseline.
const baseline = process.argv[2] || '540dcad4ba42eea28e8bae655c1a11c8e8dc3419';
if (!/^[0-9a-f]{40}$/.test(baseline)) throw new Error('A full baseline commit SHA is required.');
const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), 'journal-type-baseline-'));
const baseRoot = join(temporary, 'repo');
const logs = process.env.RUNNER_TEMP || tmpdir();
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git command failed');
}
function check(directory, filename) {
  const result = spawnSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json', '--pretty', 'false'], { cwd: directory, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.signal || result.status === null) throw result.error || new Error('Typecheck did not complete.');
  const text = `${result.stdout || ''}${result.stderr || ''}`;
  writeFileSync(join(logs, filename), text);
  const diagnostics = new Map();
  const normalized = text.split(root).join('<repo>').split(baseRoot).join('<repo>');
  for (const match of normalized.matchAll(/^([^\n]+?)\(\d+,\d+\): (error TS\d+:[^\n]+)/gm)) {
    const key = `${match[1]}: ${match[2]}`;
    diagnostics.set(key, (diagnostics.get(key) || 0) + 1);
  }
  if (result.status !== 0 && !diagnostics.size) throw new Error(`Typecheck infrastructure failed: ${text.slice(0, 1000)}`);
  return diagnostics;
}
let added = [];
try {
  git(['worktree', 'add', '--detach', baseRoot, baseline]);
  symlinkSync(resolve('node_modules'), join(baseRoot, 'node_modules'), 'dir');
  const before = check(baseRoot, 'journal-baseline-types.log');
  const after = check(root, 'journal-typecheck.log');
  for (const [message, count] of after) {
    const extra = count - (before.get(message) || 0);
    if (extra > 0) added.push(`${message} (${extra})`);
  }
  const sum = (map) => [...map.values()].reduce((a, b) => a + b, 0);
  const report = `Baseline diagnostics: ${sum(before)}\nRepair diagnostics: ${sum(after)}\nNew diagnostic groups: ${added.length}\n${added.join('\n')}\n`;
  console.log(report);
  writeFileSync(join(logs, 'journal-type-regression.log'), report);
} finally {
  try { git(['worktree', 'remove', '--force', baseRoot]); } catch { /* Report the original error. */ }
  rmSync(temporary, { recursive: true, force: true });
}
if (added.length) process.exitCode = 1;

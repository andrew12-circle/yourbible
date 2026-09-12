import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDiagnosticUnions as normalize } from './journal-diagnostic-normalization.mjs';

test('equivalent string unions retain all members regardless of print order', () => {
  assert.equal(normalize(`Type 'string' is not assignable to type '"red" | "blue" | "gold"'.`), normalize(`Type 'string' is not assignable to type '"blue" | "gold" | "red"'.`));
});
test('numeric union order is irrelevant', () => {
  assert.equal(normalize(`Type 'number' is not assignable to type '1 | 3 | 2'.`), normalize(`Type 'number' is not assignable to type '1 | 2 | 3'.`));
});
test('normalizes unions nested inside object and generic types', () => {
  assert.equal(normalize(`Type '{ metadata?: string | number | boolean | Json[] | Record<string, unknown>; id: string; }'.`), normalize(`Type '{ metadata?: string | number | boolean | Record<string, unknown> | Json[]; id: string; }'.`));
});
test('adding a union member remains a different diagnostic', () => {
  assert.notEqual(normalize(`Type '1 | 2'.`), normalize(`Type '1 | 2 | 3'.`));
});
test('changing a union member remains a different diagnostic', () => {
  assert.notEqual(normalize(`Type 'string | number'.`), normalize(`Type 'string | boolean'.`));
});
test('preserves non-union types and diagnostic codes verbatim', () => {
  const message = `error TS2322: Type 'Record<string, unknown>' is not assignable to type 'string'.`;
  assert.equal(normalize(message), message);
});
test('unparseable truncated types are not normalized away', () => {
  const message = `Type '{ body: string; ... 12 more ...; id: string; }'.`;
  assert.equal(normalize(message), message);
});
test('generic parameters other than union order remain significant', () => {
  assert.notEqual(normalize(`Type 'Pick<Row, "a" | "b">'.`), normalize(`Type 'Pick<OtherRow, "b" | "a">'.`));
});
test('error identity and other words are never discarded', () => {
  assert.notEqual(normalize(`error TS2322: Type '1 | 2'.`), normalize(`error TS2345: Type '2 | 1'.`));
});

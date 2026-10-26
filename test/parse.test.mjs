import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { readRegexLiteral } from '../src/regex.mjs';

const HEAD = ['myelin 1', 'id      t', 'about   test ledger', 'fires   alpha | beta', 'status  test', ''].join('\n');
const L = (body) => parse(HEAD + '\n' + body);
const errors = (l) => l.problems.filter((p) => p.level === 'error').map((p) => p.message);
const warns = (l) => l.problems.filter((p) => p.level === 'warn').map((p) => p.message);

test('parses the header and fire-words', () => {
  const l = L('');
  assert.equal(l.version, 1);
  assert.equal(l.header.id, 't');
  assert.deepEqual(l.header.fires, ['alpha', 'beta']);
  assert.equal(l.header.status, 'test');
  assert.ok(l.ok);
});

test('rejects a file with no version line', () => {
  assert.equal(parse('hello').ok, false);
  assert.equal(parse('').ok, false);
});

test('rejects an unsupported version', () => {
  const l = parse('myelin 2\nid x\nabout y\nfires z\n');
  assert.equal(l.ok, false);
  assert.match(errors(l)[0], /unsupported version/);
});

test('reports missing required header keys', () => {
  const l = parse('myelin 1\nid x\n');
  assert.ok(errors(l).some((m) => m.includes('"about"')));
  assert.ok(errors(l).some((m) => m.includes('"fires"')));
});

test('parses bans, requires, unless, preferences and facts', () => {
  const l = L(String.raw`= k   v
! B1 /foo\(/ unless /bar/   no foo -> $s
+ R1 /baz/i   need baz
~ P1 prefer small functions

$ s
code
$$
`);
  assert.ok(l.ok, JSON.stringify(l.problems));
  assert.equal(l.facts[0].key, 'k');
  assert.equal(l.rules[0].kind, 'ban');
  assert.equal(l.rules[0].message, 'no foo');
  assert.equal(l.rules[0].ref, 's');
  assert.equal(l.rules[0].unless.source, 'bar');
  assert.equal(l.rules[1].kind, 'require');
  assert.equal(l.rules[1].flags, 'i');
  assert.equal(l.prefs[0].id, 'P1');
  assert.equal(l.snippets.s.code, 'code');
});

test('regex scanner handles escaped slashes, classes and flags', () => {
  const a = readRegexLiteral(String.raw`/a\/b/gi rest`, 0);
  assert.equal(a.source, String.raw`a\/b`);
  assert.equal(a.flags, 'gi');
  const b = readRegexLiteral('/[/]x/ msg', 0);
  assert.equal(b.source, '[/]x');
  assert.equal(readRegexLiteral('/never closed', 0), null);
  assert.equal(readRegexLiteral('no slash', 0), null);
});

test('strips g and y flags so matching is never stateful', () => {
  const l = L('! B1 /a/g   msg\n');
  assert.equal(l.rules[0].flags, '');
  assert.equal(l.rules[0].re.test('a'), true);
  assert.equal(l.rules[0].re.test('a'), true);
});

test('duplicate ids are errors', () => {
  const l = L('! B1 /a/ one\n+ B1 /b/ two\n');
  assert.ok(errors(l).some((m) => m.includes('duplicate id "B1"')));
});

test('invalid regex is an error', () => {
  const l = L('! B1 /(/ broken\n');
  assert.ok(errors(l).some((m) => m.includes('invalid regex')));
});

test('unclosed regex literal is an error', () => {
  const l = L('! B1 /abc oops\n');
  assert.ok(errors(l).some((m) => m.includes('not closed')));
});

test('unless is rejected on + rules', () => {
  const l = L('+ R1 /a/ unless /b/ msg\n');
  assert.ok(errors(l).some((m) => m.includes('only allowed on ! rules')));
});

test('unterminated snippet is an error', () => {
  const l = L('$ s\nline one\n');
  assert.ok(errors(l).some((m) => m.includes('not closed')));
});

test('a rule pointing at a missing snippet is an error', () => {
  const l = L('! B1 /a/ msg -> $nope\n');
  assert.ok(errors(l).some((m) => m.includes('missing snippet $nope')));
});

test('warns when a regex matches empty text', () => {
  assert.ok(warns(L('! B1 /x*/ msg\n')).some((m) => m.includes('always fires')));
  assert.ok(warns(L('+ R1 /x*/ msg\n')).some((m) => m.includes('always passes')));
});

test('warns about unreferenced snippets and unknown lines; ignores comments', () => {
  const l = L('# a comment\nwhat is this\n\n$ s\nx\n$$\n');
  const w = warns(l);
  assert.ok(w.some((m) => m.includes('unrecognized line')));
  assert.ok(w.some((m) => m.includes('not referenced')));
  assert.ok(l.ok);
});

test('tolerates CRLF line endings', () => {
  const l = parse(HEAD.replace(/\n/g, '\r\n') + '\r\n! B1 /a/ msg\r\n');
  assert.ok(l.ok);
  assert.equal(l.rules[0].message, 'msg');
});

test('a UTF-8 byte order mark before the version line is ignored', () => {
  const l = parse('﻿' + HEAD);
  assert.ok(l.ok, JSON.stringify(l.problems));
  assert.equal(l.version, 1);
});

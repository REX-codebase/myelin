import test from 'node:test';
import assert from 'node:assert/strict';
import { deprecations, reexports, edges, declarationCounts, strip } from '../src/dts.mjs';

const names = (text) => deprecations(text).map((d) => `${d.container ? d.container + '.' : ''}${d.name}:${d.kind}`);

test('top-level exports of every kind are found with their kind', () => {
  const t = `
/** @deprecated Use bar. */
export declare function foo(a: string): void;
/** @deprecated */
export declare class Old<T> extends Base<T> { }
/** @deprecated use Next */
export interface OldShape { a: 1 }
/** @deprecated */
export type OldAlias = string | number;
/** @deprecated */
export declare const oldValue: number;
/** @deprecated */
declare enum OldEnum { A, B }
/** @deprecated */
export declare namespace OldNs { }
`;
  assert.deepEqual(names(t), ['foo:function', 'Old:class', 'OldShape:interface', 'OldAlias:type', 'oldValue:const', 'OldEnum:enum', 'OldNs:namespace']);
  const d = deprecations(t);
  assert.ok(d.every((x) => !x.member && x.container === null));
  assert.equal(d[0].note, 'Use bar.');
  assert.equal(d[0].line, 2);
});

test('members of classes, interfaces and literal types carry their container', () => {
  const t = `
export declare class Box<T> {
    /** @deprecated Use open(). */
    unlock(key: string): void;
    /** @deprecated */
    protected static readonly legacy: number;
    /** @deprecated */
    get size(): number;
    ok(): void;
}
export interface Opts {
    /** @deprecated Use includeResultMetadata. */
    rawResult?: boolean;
    keep: boolean
    /** @deprecated */
    old: string
}
export type Cfg = {
    /** @deprecated */
    flag: boolean,
    /** @deprecated */
    other?: string;
};
`;
  assert.deepEqual(names(t), ['Box.unlock:method', 'Box.legacy:property', 'Box.size:method', 'Opts.rawResult:property', 'Opts.old:property', 'Cfg.flag:property', 'Cfg.other:property']);
  assert.ok(deprecations(t).every((x) => x.member));
});

test('members named like keywords are names, not modifiers', () => {
  const t = `
interface I {
    /** @deprecated */
    get(key: string): void;
    /** @deprecated */
    type: string;
    /** @deprecated */
    static?: boolean;
    /** @deprecated */
    readonly: boolean;
}`;
  assert.deepEqual(names(t), ['I.get:method', 'I.type:property', 'I.static:property', 'I.readonly:property']);
});

test('namespace members are module-scope declarations, as in export = React', () => {
  const t = `
declare namespace React {
    /** @deprecated Use Ref instead. */
    type LegacyRef<T> = Ref<T>;
    /** @deprecated */
    function createFactory(type: string): void;
    interface Component<P> {
        /** @deprecated 16.3, use componentDidMount */
        componentWillMount?(): void;
    }
}
export = React;`;
  const d = deprecations(t);
  assert.deepEqual(names(t), ['React.LegacyRef:type', 'React.createFactory:function', 'Component.componentWillMount:method']);
  assert.equal(d[0].container, 'React', 'a namespace name travels with its members so React.LegacyRef can be matched');
  assert.equal(d[0].member, false);
  assert.equal(d[0].module, null);
});

test('declare module blocks report the module they declare', () => {
  const t = `
declare module "fs" {
    /** @deprecated since v1.0.0 - Use {@link stat} or {@link access} instead. */
    function exists(path: string, callback: (exists: boolean) => void): void;
}
declare module 'node:fs' {
    export * from 'fs';
}`;
  const d = deprecations(t);
  assert.deepEqual(names(t), ['exists:function']);
  assert.equal(d[0].module, 'fs');
});

test('declare global is not the package surface and is skipped', () => {
  const t = `
declare global {
    interface Array<T> {
        /** @deprecated */
        legacy(): void;
    }
    /** @deprecated */
    function setImmediateOld(): void;
}
/** @deprecated */
export declare function kept(): void;`;
  assert.deepEqual(names(t), ['kept:function']);
});

test('deprecated parameters and nested type literals inside signatures are not declarations', () => {
  const t = `
export interface Api {
    run(/** @deprecated */ legacy: string, opts: {
        /** @deprecated */
        inner: number;
    }): void;
    /** @deprecated */
    real(): void;
}`;
  assert.deepEqual(names(t), ['Api.real:method']);
});

test('braces, quotes and arrows in strings, comments and types do not confuse the nesting', () => {
  const t = `
// } this brace is in a line comment
/* { and this one in a block comment */
export type Tpl = \`\${string}-{px}\`;
export type Fn = (a: string) => void;
export type Pick2<T> = T extends { a: infer U } ? U : never;
export interface Msgs {
    ok: "}{";
    f: <T extends { x: 1 }>(a: T) => T;
    /** @deprecated */
    after: string;
}
/** @deprecated */
export declare function last(): void;`;
  assert.deepEqual(names(t), ['Msgs.after:property', 'last:function']);
});

test('enum members are found as members of their enum', () => {
  const t = `
export declare enum Mode {
    Fast = 0,
    /** @deprecated Use Fast. */
    Quick = 1,
    Slow = 2
}`;
  assert.deepEqual(names(t), ['Mode.Quick:enum-member']);
});

test('a generic class head with a literal type argument still opens a class', () => {
  const t = `
export declare class Repo<T extends { id: string }> implements Store<{ a: 1 }> {
    /** @deprecated */
    find(id: string): T;
}`;
  assert.deepEqual(names(t), ['Repo.find:method']);
});

test('string-literal keys that are valid identifiers are read; others are skipped', () => {
  const t = `
interface I {
    /** @deprecated */
    "plain": string;
    /** @deprecated */
    "with-dash": string;
    /** @deprecated */
    [key: string]: any;
}`;
  assert.deepEqual(names(t), ['I.plain:property']);
});

test('multi-line notes are joined and stop at the next tag', () => {
  const t = `
/**
 * Summary line.
 * @deprecated Use \`Ref\` instead.
 * String refs are no longer supported.
 * @see {@link https://example.com}
 */
export type LegacyRef<T> = Ref<T>;
/** @deprecated */
export declare const a: 1;
/** Not at all @deprecated in a sentence. */
export declare const b: 1;`;
  const d = deprecations(t);
  assert.equal(d.length, 3 - 1 + 0, 'a mid-sentence mention is not a tag');
  assert.equal(d[0].note, 'Use `Ref` instead. String refs are no longer supported.');
  assert.equal(d[0].line, 2);
  assert.equal(d[1].note, '');
});

test('a file with no deprecations costs nothing and returns nothing', () => {
  assert.deepEqual(deprecations('export declare const x: 1;'), []);
  assert.deepEqual(deprecations(''), []);
});

test('re-exports list only bare package specifiers', () => {
  const t = `
export * from '@tanstack/query-core';
export * as core from "other-pkg/sub";
export { a, b as c } from 'pkg-three';
export type { T } from "./local";
export * from '../up';
export declare const x: 1;
// export * from 'in-a-comment';`;
  assert.deepEqual(reexports(t).sort(), ['@tanstack/query-core', 'other-pkg/sub', 'pkg-three']);
});

test('declaration counts see every declaration-like line, deprecated or not', () => {
  const t = `
export interface Root {
    /** @deprecated */
    render(a: string): void;
    render(a: string, b: number): void;
    only(): void;
}
export declare function render(): void;`;
  const c = declarationCounts(t);
  assert.deepEqual(c.get('render'), { sym: 1, fn: 2, prop: 0 }, 'one function, two method signatures');
  assert.deepEqual(c.get('only'), { sym: 0, fn: 1, prop: 0 });
  assert.deepEqual(c.get('Root'), { sym: 1, fn: 0, prop: 0 });
  const one = declarationCounts('export interface Other { optional(): void; flag: boolean }');
  assert.deepEqual(one.get('optional'), { sym: 0, fn: 1, prop: 0 }, 'members on the same line as the brace are seen');
  assert.deepEqual(one.get('flag'), { sym: 0, fn: 0, prop: 1 });
  const p = declarationCounts('interface A {\n  url: string;\n  size?: number;\n  go<T>(a: T): T;\n}');
  assert.deepEqual(p.get('url'), { sym: 0, fn: 0, prop: 1 }, 'a property is not callable');
  assert.deepEqual(p.get('go'), { sym: 0, fn: 1, prop: 0 }, 'a generic method is');
});

test('strip keeps length and newlines so positions line up across views', () => {
  const t = 'a /* c\n */ "s{" // x\nb';
  const { plain, clean } = strip(t);
  assert.equal(plain.length, t.length);
  assert.equal(clean.length, t.length);
  assert.equal(plain.split('\n').length, t.split('\n').length);
  assert.ok(plain.includes('"s{"'));
  assert.ok(!clean.includes('{'));
});

test('edges separate relative re-exports and reference paths from other packages', () => {
  const t = `/// <reference path="assert.d.ts" />
/// <reference path="./sub/fs.d.ts" />
/// <reference types="node" />
export * from "./core/api.js";
export type { T } from '../up/types';
export * from '@scope/pkg/sub';
import { x as y } from "./internal-use.js";
import { w } from "not-relative";`;
  const e = edges(t);
  assert.deepEqual(e.relative.sort(), ['./assert.d.ts', './core/api.js', './sub/fs.d.ts', '../up/types'].sort());
  assert.deepEqual(e.bare, ['@scope/pkg/sub'], 'an import of another package is not a re-export');
  assert.ok(!e.relative.includes('./internal-use.js'), 'in an ordinary file an import is a type it uses, not something it exposes');
});

test('a bundled file that re-exports from a local list exposes the chunks it imports', () => {
  const t = `import { $ as Base, b as helper } from "./chunk-A.js";
import type { Z } from "../shared";
import { q } from "not-relative";
declare const own: 1;
export { Base as Thing, helper, own };`;
  assert.deepEqual(edges(t).relative.sort(), ['../shared', './chunk-A.js'].sort());
  assert.deepEqual(edges('import { a } from "./a.js";\nexport { b } from "./b.js";').relative, ['./b.js'], 'export-from lists do not count as local lists');
});

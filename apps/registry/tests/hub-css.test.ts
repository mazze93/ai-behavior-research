// Guards hub.css against the drift that produced dead rules and unused keyframes.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const PUBLIC = join(import.meta.dirname, '..', 'public');
const css = readFileSync(join(PUBLIC, 'hub.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Exact class tokens that hub.css consumers can apply: class attributes in pages that load hub.css
 * (plus the generated explorer gallery) and single-identifier string literals in scripts
 * (e.g. `className='error'`).
 */
function consumerClasses(): Set<string> {
  const pages = readdirSync(PUBLIC).filter((name) => name.endsWith('.html')).map((name) => readFileSync(join(PUBLIC, name), 'utf8')).filter((html) => html.includes('/hub.css'));
  const gallery = readFileSync(join(import.meta.dirname, '..', '..', '..', 'scripts', 'build_explorer_gallery.py'), 'utf8');
  const scripts = readdirSync(PUBLIC).filter((name) => name.endsWith('.js')).map((name) => readFileSync(join(PUBLIC, name), 'utf8'));
  const tokens = new Set<string>();
  for (const markup of [...pages, gallery]) for (const m of markup.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) tokens.add(t);
  for (const script of scripts) for (const m of script.matchAll(/['"]([a-zA-Z][\w-]*)['"]/g)) tokens.add(m[1]);
  for (const m of [...pages, gallery].join('\n').matchAll(/<body class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) tokens.add(t);
  return tokens;
}

test('hub.css declares its layer order before any rule', () => {
  assert.match(css.trimStart(), /^@layer base, layout, components, theme;/);
});

test('root font size is relative so it follows the reader default', () => {
  for (const match of css.matchAll(/:root\{[^}]*?font-size:([^;}]+)/g)) assert.doesNotMatch(match[1], /px/);
});

test('every custom property used is defined', () => {
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  for (const name of used) assert.ok(defined.has(name), `${name} is used but never defined`);
});

test('every keyframe is used and every animation has a keyframe', () => {
  const frames = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  const animated = new Set([...css.matchAll(/animation:\s*([\w-]+)/g)].map((m) => m[1]).filter((n) => n !== 'none'));
  for (const name of frames) assert.ok(animated.has(name), `@keyframes ${name} is never used`);
  for (const name of animated) assert.ok(frames.has(name), `animation ${name} has no @keyframes`);
});

test('every class selector is used by a page, script or the gallery generator', () => {
  const tokens = consumerClasses();
  const selectors = css.replace(/@font-face\{[^}]*\}/g, '').match(/[^{}]+(?=\{)/g) ?? [];
  const classes = new Set(selectors.flatMap((s) => [...s.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])));
  for (const name of classes) assert.ok(tokens.has(name), `.${name} has no consumer`);
});

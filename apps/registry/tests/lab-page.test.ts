import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {escapeHtml, renderLab} from '../scripts/lab-page';
import {loadInputs, outputs} from '../scripts/build-lab';

test('the published lab page and object bundle match their sources', () => {
  for (const [file, text] of Object.entries(outputs())) assert.equal(fs.readFileSync(file, 'utf8'), text, `${file} is stale; run npx tsx scripts/build-lab.ts`);
});

test('the lab page names every part, every stage status in words, and each stated grade', () => {
  const {objects, capabilities} = loadInputs();
  const html = renderLab(objects, capabilities);
  for (const part of ['Explore', 'Design', 'Laboratory', 'Analyze', 'Collaborate', 'Publish', 'Learn']) assert(html.includes(`<h3>${part}</h3>`), part);
  assert.equal(capabilities.sections.length, 7);
  for (const section of capabilities.sections) assert(section.status in capabilities.statuses && section.today && section.missing, section.id);
  for (const object of objects) assert(html.includes(`Evidence grade: ${object.evidence_grade}.`), object.id);
  assert(html.includes('Its records could support at most “exploratory”'), 'a lower stated grade is explained');
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert(!/<script/i.test(html), 'the page needs no script');
});

test('interpolated text is escaped', () => {
  assert.equal(escapeHtml(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  const {objects, capabilities} = loadInputs();
  const hostile = structuredClone(objects[0]);
  hostile.title = '<script>alert(1)</script>';
  assert(!renderLab([hostile], capabilities).includes('<script>'));
});

test('every internal link on the lab page resolves to a public file or a Worker route', () => {
  const {objects, capabilities} = loadInputs();
  const html = renderLab(objects, capabilities);
  // '/' and the API are Worker routes; the explorer gallery is generated at deploy time and listed in the sitemap.
  const routes = new Set(['/', '/api/releases', '/explorers/index.html']);
  for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) assert(routes.has(href) || fs.existsSync('public' + href), href);
});

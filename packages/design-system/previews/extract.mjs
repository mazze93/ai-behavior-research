// Extract preview fixtures from real study files. Each fixture records its
// source and revision; nothing here is invented. Run from packages/design-system:
//   node previews/extract.mjs [path-to-authority-without-assertion]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const rev = dir => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { return 'unknown'; } };
const out = (name, data) => writeFileSync(join('previews/data', name), JSON.stringify(data, null, 1) + '\n');

// Identity Dissolution example run (synthetic machinery check).
const RUN = '../../studies/identity-dissolution/examples/20260926T191245Z-f8bd5caf';
const csv = readFileSync(join(RUN, 'metrics.csv'), 'utf8').trim().split(/\r?\n/);
const head = csv[0].split(',');
const rows = csv.slice(1).map(l => Object.fromEntries(l.split(',').map((v, i) => [head[i], v])));
const analysis = JSON.parse(readFileSync(join(RUN, 'analysis.json'), 'utf8'));
out('identity-dissolution.json', {
  source: `mazze93/ai-behavior-research@${rev('../..')} · studies/identity-dissolution/examples/20260926T191245Z-f8bd5caf`,
  synthetic: analysis.synthetic === true,
  metrics: rows.map(r => ({ id: r.blind_id, model: r.model, seed: +r.seed, condition: r.condition, file: r.file, status: r.status,
    words: +r.words, repeat_4gram_fraction: +r.repeat_4gram_fraction })),
  comparisons: analysis.comparisons.map(c => ({ model: c.model, contrast: c.contrast, n: c.paired_n, estimate: c.mean_difference,
    low: c.exploratory_bootstrap_95_interval[0], high: c.exploratory_bootstrap_95_interval[1] })),
});

// Authority Without Assertion: Bearing ledger (claims + checks), all checks unrun at preregistration.
const AWA = process.argv[2] ?? '/home/user/mazze93/authority-without-assertion';
const field = (text, k) => (text.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1] ?? '').replace(/^['"]|['"]$/g, '');
const node = (dir, f) => { const t = readFileSync(join(AWA, 'graph', dir, f), 'utf8'); return { id: field(t, 'id'), title: field(t, 'title'), state: field(t, 'state'), confidence: field(t, 'confidence'), body: field(t, 'body') }; };
const claims = readdirSync(join(AWA, 'graph/claims')).map(f => node('claims', f));
const checks = Object.fromEntries(readdirSync(join(AWA, 'graph/checks')).map(f => { const n = node('checks', f); return [n.id, n]; }));
const ledger = readFileSync(join(AWA, 'graph/ledger.yml'), 'utf8').split('\n').filter(l => l.includes('add-evidence'))
  .map(l => ({ to: l.match(/to: ([^,}]+)/)[1].trim(), from: l.match(/from: ([^,}]+)/)[1].trim(), rel: l.match(/rel: ([^,}]+)/)[1].trim(), date: l.match(/date: "([^"]+)"/)[1] }));
const order = readFileSync(join(AWA, 'graph/ledger.yml'), 'utf8').split('\n').filter(l => l.includes('assert-claim')).map(l => l.match(/claim: ([^,}]+)/)[1].trim());
out('awa-ledger.json', {
  source: `mazze93/authority-without-assertion@${rev(AWA)} · graph/`,
  claims: order.map(id => claims.find(c => c.id === id)).filter(Boolean).map(c => ({
    id: c.id, code: (c.body.match(/^(H\d)\./) ?? [])[1], title: c.title, state: c.state, confidence: c.confidence,
    checks: ledger.filter(e => e.to === c.id).map(e => ({ id: e.from, title: checks[e.from]?.title ?? e.from, relation: e.rel, status: 'unrun', counts: false, date: e.date })),
  })),
  outcomes: ['NO_PROPAGATION', 'PROPAGATION_OPERATIONAL', 'PROPAGATION_PERSISTENT', 'PROPAGATION_BOTH'],
  conditions: ['C0-narrative', 'C1-provenance', 'C2-evidence-gated'],
  scenarios: readdirSync(join(AWA, 'protocol/scenarios')).map(f => f.replace(/\.yaml$/, '')),
});
console.log('fixtures written');

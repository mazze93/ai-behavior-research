/**
 * Renders /lab.html from the checked research objects and the capability list.
 *
 * Pure: takes data, returns a string. Every interpolated value is escaped.
 * The page states what the infrastructure does today; it is generated so that
 * its status cannot drift from the objects the contract tests check.
 */
import { GRADES, STAGES, gradeCeiling, type Ref, type ResearchObject, type Stage, type Status } from '../src/research-object';

// ---- Types ----------------------------------------------------------------

export type Capability = {
  id: string; name: string; status: string; today: string; missing: string;
  links: { href: string; label: string }[];
};
export type Capabilities = { schema: string; statuses: Record<string, string>; sections: Capability[] };

// ---- Constants ------------------------------------------------------------

export const CONTRACT_URL = 'https://github.com/mazze93/ai-behavior-research/blob/main/docs/research-object/README.md';

/** Status is always carried by a word; the mark is decoration and hidden from assistive technology. */
const STATUS_MARK: Record<Status, string> = { absent: '○', draft: '◐', recorded: '●', frozen: '■', 'not-applicable': '–' };
const STATUS_WORD: Record<Status, string> = { absent: 'absent', draft: 'draft', recorded: 'recorded', frozen: 'frozen', 'not-applicable': 'not applicable' };

const GRADE_MEANING: Record<typeof GRADES[number], string> = {
  none: 'Nothing has been executed.',
  smoke: 'A run that exercised the pipeline. Not a finding.',
  pilot: 'A feasibility run.',
  exploratory: 'Observed and analysed, without a protocol frozen in advance.',
  confirmatory: 'Hypothesis and protocol frozen before execution.',
  replicated: 'Confirmatory, with a recorded independent replication.',
};

// ---- Helpers --------------------------------------------------------------

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const e = escapeHtml;
const title = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Links for `url` references. Only https addresses are linked; anything else is dropped. */
function publicLinks(refs: Ref[]): string {
  const urls = refs.filter(r => r.kind === 'url' && /^https:\/\/[^\s"<>]+$/.test(r.locator));
  return urls.map(r => ` <a href="${e(r.locator)}">${e(new URL(r.locator).hostname + new URL(r.locator).pathname)}</a>`).join('');
}

// ---- Sections -------------------------------------------------------------

/** One part of the lab. Stacked on narrow screens, three columns on wide ones (research-notes.css). */
function capabilityItem(c: Capability, statuses: Record<string, string>): string {
  const links = c.links.map(l => `<a href="${e(l.href)}">${e(l.label)}</a>`).join(' · ');
  return `<article class="lab-part" id="${e(c.id)}"><div><h3>${e(c.name)}</h3><p class="meta">${e(statuses[c.status])}</p></div>`
    + `<p><strong>Today.</strong> ${e(c.today)}<br>${links}</p><p><strong>Not there yet.</strong> ${e(c.missing)}</p></article>`;
}

function capabilityList(caps: Capabilities): string {
  return caps.sections.map(c => capabilityItem(c, caps.statuses)).join('\n      ');
}

function stageItem(stage: Stage, o: ResearchObject): string {
  const record = o.stages[stage];
  const when = record.at ? `, ${e(record.at.slice(0, 10))}` : '';
  const notes = [record.reason, ...(record.limits ?? [])].filter(Boolean).map(n => e(n)).join(' ');
  const links = publicLinks(record.refs ?? []);
  return `<li><span aria-hidden="true">${STATUS_MARK[record.status]}</span> <strong>${title(stage)}:</strong> ${STATUS_WORD[record.status]}${when}.${notes ? ' ' + notes : ''}${links}</li>`;
}

function claimItem(claim: ResearchObject['claims'][number]): string {
  const limits = claim.limits.map(l => `<li>${e(l)}</li>`).join('');
  return `<p><strong>Claim.</strong> ${e(claim.statement)}</p><p>Stated limits:</p><ul>${limits}</ul>`;
}

function objectSection(o: ResearchObject): string {
  const ceiling = gradeCeiling(o);
  const grade = `<p><strong>Evidence grade: ${e(o.evidence_grade)}.</strong> ${e(GRADE_MEANING[o.evidence_grade])}`
    + (ceiling === o.evidence_grade ? '' : ` Its records could support at most “${e(ceiling)}”; the author states the lower grade.`) + '</p>';
  const stages = STAGES.map(stage => stageItem(stage, o)).join('\n        ');
  const claims = o.claims.map(claimItem).join('');
  return `<section aria-labelledby="object-${e(o.id)}"><h2 id="object-${e(o.id)}">${e(o.title)}</h2>\n      `
    + `<p class="meta">${e(o.module)} · version ${e(o.version)}</p>\n      ${grade}\n      <ol>\n        ${stages}\n      </ol>${claims}</section>`;
}

// ---- Page -----------------------------------------------------------------

export function renderLab(objects: ResearchObject[], caps: Capabilities): string {
  const stageLine = STAGES.map(title).join(' → ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>The research lifecycle / Research</title>
  <meta name="description" content="What this research infrastructure does today, part by part, and where three investigations stand from question to publication.">
  <link rel="canonical" href="https://research.mazzeleczzare.com/lab.html">
  <link rel="stylesheet" href="/type.css"><link rel="stylesheet" href="/hub.css"><link rel="stylesheet" href="/research-notes.css">
</head>
<body class="research-note lab">
  <a class="skip" href="#main">Skip to the lifecycle</a>
  <header><a class="wordmark" href="/">RESEARCH /</a><nav aria-label="Main"><a href="/">Studies</a><a href="/lab.html" aria-current="page">Lifecycle</a><a href="/method.html">Method</a><a href="/ethics.html">Ethics</a></nav></header>
  <main id="main">
    <div class="kicker"><span>Research infrastructure / current state</span><span>Contract v0.1</span></div>
    <h1>Rigor belongs in the infrastructure.</h1>
    <p class="deck">Scientific rigor should be a property of the tools, not a burden each researcher rebuilds alone. This page says how far these tools have got.</p>
    <p class="notice">This is a status page, generated from checked records. Most of what an open research lab needs is not built here yet. Today the public can read, verify and reproduce; only the owner can design, run, assign and release. Nothing below is a research finding.</p>
    <section aria-labelledby="sections"><h2 id="sections">Seven parts of a research lab</h2>
      ${capabilityList(caps)}
      <p>Accounts and workspaces for other researchers are not built. Studies involving people, security testing or other sensitive material need consent, privacy and ethics review that no interface can stand in for, so no template for them is offered.</p>
    </section>
    <section aria-labelledby="object"><h2 id="object">The research object</h2>
      <p>Each investigation is one versioned record that runs through nine stages:</p>
      <p><strong>${stageLine}</strong></p>
      <p>A stage is absent, draft, recorded, frozen or not applicable. A stage can be recorded only when the stages it rests on are settled. A claim must link its evidence and state its limits. An evidence grade cannot exceed what the recorded stages support. Publication is recorded only as a named person’s decision, and peer review or a DOI only as an outside event with its own record.</p>
      <p>A record that passes these checks is consistent. That does not make it correct, and a hash identifies bytes, not truth. <a href="${CONTRACT_URL}">Read the contract</a> or <a href="/research-objects.json">download the three records below</a>.</p>
    </section>
    ${objects.map(objectSection).join('\n    ')}
    <footer><span>Mazze LeCzzare Frazer / Generated from research-object v0.1</span><a href="/method.html">Methods and limits</a><a href="/">Research index</a></footer>
  </main>
</body>
</html>
`;
}

/** The public bundle of the same objects the page was rendered from. */
export function renderObjectsJson(objects: ResearchObject[]): string {
  return JSON.stringify({ schema: 'research-object-bundle/v0.1', objects }, null, 2) + '\n';
}

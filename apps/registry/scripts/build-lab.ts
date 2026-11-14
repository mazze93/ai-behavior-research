/**
 * Writes public/lab.html and public/research-objects.json.
 *
 *   npx tsx scripts/build-lab.ts           write both files
 *   npx tsx scripts/build-lab.ts --check   exit 1 if either file is stale
 *
 * Side effects: reads docs/research-object/, writes two files in public/.
 * Refuses to write if any object fails the contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkResearchObject, type ResearchObject } from '../src/research-object';
import { renderLab, renderObjectsJson, type Capabilities } from './lab-page';

const REGISTRY = path.resolve(import.meta.dirname, '..');
const SOURCE = path.resolve(REGISTRY, '../../docs/research-object');
/** Display order: the two studies, then the book. */
const ORDER = ['identity-dissolution', 'persona-integrity', 'intentional-fragility'];

export function loadInputs(): { objects: ResearchObject[]; capabilities: Capabilities } {
  const objects = ORDER.map(id => JSON.parse(fs.readFileSync(path.join(SOURCE, 'examples', `${id}.json`), 'utf8')) as ResearchObject);
  for (const object of objects) {
    const findings = checkResearchObject(object);
    if (findings.length) throw new Error(`${object.id} fails the contract: ${findings.map(f => f.message).join(' ')}`);
  }
  const capabilities = JSON.parse(fs.readFileSync(path.join(SOURCE, 'capabilities.json'), 'utf8')) as Capabilities;
  return { objects, capabilities };
}

export function outputs(): Record<string, string> {
  const { objects, capabilities } = loadInputs();
  return {
    [path.join(REGISTRY, 'public/lab.html')]: renderLab(objects, capabilities),
    [path.join(REGISTRY, 'public/research-objects.json')]: renderObjectsJson(objects),
  };
}

function main(): void {
  const check = process.argv.includes('--check');
  const stale: string[] = [];
  for (const [file, text] of Object.entries(outputs())) {
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) stale.push(path.basename(file)); }
    else fs.writeFileSync(file, text);
  }
  if (stale.length) { console.error(`Stale: ${stale.join(', ')}. Run: npx tsx scripts/build-lab.ts`); process.exit(1); }
  console.log(check ? 'lab.html and research-objects.json match their sources.' : 'Wrote lab.html and research-objects.json.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();

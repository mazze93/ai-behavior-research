export {};
const cards = [...document.querySelectorAll<HTMLDetailsElement>('.instrument-card')];
const toolbar = document.querySelector<HTMLElement>('.cabinet-toolbar');
const search = document.querySelector<HTMLInputElement>('#instrument-search');
const expand = document.querySelector<HTMLButtonElement>('#expand-briefs');
const empty = document.querySelector<HTMLElement>('#instrument-empty');
const trail = document.querySelector<HTMLElement>('#trail-current');
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
let kind = 'all';
let activeBrief: HTMLDetailsElement | undefined;
function restoreTrail() {
  const current = activeBrief?.open && !activeBrief.hidden ? activeBrief : cards.findLast(card => card.open && !card.hidden);
  if (trail) trail.textContent = current?.dataset.title ?? 'The working field';
}
function expansionState() {
  const visible = cards.filter(card => !card.hidden);
  const all = visible.length > 0 && visible.every(card => card.open);
  if (expand) { expand.setAttribute('aria-pressed', String(all)); expand.textContent = all ? 'Fold visible ↗' : 'Unfold visible ↙'; expand.disabled = !visible.length; }
}
function filter() {
  const query = search?.value.trim().toLocaleLowerCase() ?? '';
  for (const card of cards) card.hidden = (kind !== 'all' && card.dataset.kind !== kind) || !card.textContent?.toLocaleLowerCase().includes(query);
  if (empty) empty.hidden = cards.some(card => !card.hidden);
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === kind));
  expansionState(); restoreTrail();
}
for (const button of filters) button.addEventListener('click', () => { kind = button.dataset.filter ?? 'all'; filter(); });
search?.addEventListener('input', filter);
expand?.addEventListener('click', () => {
  const visible = cards.filter(card => !card.hidden);
  const open = !visible.every(card => card.open);
  for (const card of visible) card.open = open;
  expansionState(); restoreTrail();
});
for (const card of cards) {
  card.addEventListener('toggle', () => {
    if (card.open) activeBrief = card;
    expansionState(); restoreTrail();
  });
  const summary = card.querySelector('summary');
  summary?.addEventListener('click', () => requestAnimationFrame(() => {
    if (card.open) card.scrollIntoView({block:'start', behavior:
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }));
  summary?.addEventListener('pointerenter', () => { if (trail) trail.textContent = card.dataset.title ?? ''; });
  summary?.addEventListener('pointerleave', restoreTrail);
  card.addEventListener('focusin', () => { if (trail) trail.textContent = card.dataset.title ?? ''; });
  card.addEventListener('focusout', event => { if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) restoreTrail(); });
}
function revealFragment() {
  let id: string;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!(target instanceof HTMLDetailsElement) || !target.classList.contains('instrument-card')) return;
  kind = 'all'; if (search) search.value = ''; filter(); target.open = true;
  requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
}
window.addEventListener('hashchange', revealFragment);
revealFragment();
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.seen = ''; observer.unobserve(entry.target); }
  }, {threshold:.08});
  for (const card of cards) observer.observe(card);
}
if (toolbar) toolbar.dataset.ready = '';
expansionState();

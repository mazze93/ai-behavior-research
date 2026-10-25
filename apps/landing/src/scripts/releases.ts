export {};
interface Release { id: string; title: string; created_at: string; sha256: string; citation: string }
const list = document.getElementById('releases');
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
async function load() {
  if (!list) return;
  list.innerHTML = '<p>Loading public evidence…</p>';
  try {
    const response = await fetch('/api/releases', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('Release index unavailable');
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length > 500 || !data.every((r: Partial<Release> | null) => r &&
      typeof r.id === 'string' && /^rel_[a-f0-9-]+$/.test(r.id) &&
      typeof r.sha256 === 'string' && /^[a-f0-9]{64}$/.test(r.sha256) &&
      [r.title, r.created_at, r.citation].every(s => typeof s === 'string'))) throw Error('Invalid release index');
    const releases = data as Release[];
    list.innerHTML = releases.length ? releases.map(r => `<article class="release"><div class="eyebrow">Frozen release / ${esc(r.created_at.slice(0, 10))}</div><h3><a href="/releases/${r.id}">${esc(r.title)} <span aria-hidden="true">↗</span></a></h3><p class="hash">SHA-256 ${esc(r.sha256)}</p><details><summary>Citation & source identity <span aria-hidden="true">＋</span></summary><p class="release-citation">${esc(r.citation)}</p><p class="hash">Release ${esc(r.id)}</p></details><div class="release-actions"><a href="/releases/${r.id}">Inspect record ↗</a><a href="/api/releases/${r.id}/bundle">Download bundle ↓</a><button type="button" data-copy-citation="${esc(r.citation)}">Copy citation</button></div></article>`).join('') : '<p>No public releases. Evidence appears here only after explicit review and publication.</p>';
  } catch {
    list.innerHTML = '<p>The live release index is unavailable. The instrument briefs and methods remain readable here. Current evidence requires a connection to the registry. <a href="/api/releases">Public JSON index ↗</a></p><button type="button" id="retry-releases">Try the release index again ↗</button>';
    document.getElementById('retry-releases')?.addEventListener('click', () => { void load(); });
  }
}
list?.addEventListener('click', async event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('[data-copy-citation]');
  if (!button?.dataset.copyCitation) return;
  try { await navigator.clipboard.writeText(button.dataset.copyCitation); button.textContent = 'Citation copied'; }
  catch { button.textContent = 'Open citation above to copy'; }
});
void load();

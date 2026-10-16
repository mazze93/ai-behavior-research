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
    if (!Array.isArray(data) || !data.every((r: Partial<Release> | null) => r &&
      typeof r.id === 'string' && /^rel_[a-f0-9-]+$/.test(r.id) &&
      [r.title, r.created_at, r.sha256, r.citation].every(s => typeof s === 'string'))) throw Error('Invalid release index');
    const releases = data as Release[];
    list.innerHTML = releases.length ? releases.map(r => `<article class="release"><div class="eyebrow">Frozen release / ${esc(r.created_at.slice(0, 10))}</div><h3><a href="/releases/${encodeURIComponent(r.id)}">${esc(r.title)} <span aria-hidden="true">↗</span></a></h3><p class="hash">SHA-256 ${esc(r.sha256)}</p><p class="release-citation">${esc(r.citation)}</p></article>`).join('') : '<p>No public releases. Evidence appears here only after explicit review and publication.</p>';
  } catch {
    list.innerHTML = '<p>The live release index is unavailable. The studies and illustration remain available locally; current evidence requires a connection to the registry.</p><button type="button" id="retry-releases">Try the release index again ↗</button>';
    document.getElementById('retry-releases')?.addEventListener('click', () => {
      list.innerHTML = '<p>Loading public evidence…</p>'; void load();
    });
  }
}
void load();

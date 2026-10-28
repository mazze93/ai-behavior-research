# Probes

Reproduce the [touchstone report](../touchstone-report_v1.0.0.md) rows.
Synthetic fixtures only; no network except where noted.

```sh
node probe-worker.mjs        # rows 3, 4, 5, 8 — JS port of spec §3.2 with a recording fetch
python3 -I probe-reward.py   # rows 6, 7 — toy REINFORCE bandit (seeded, deterministic)

# rows 1–2 need wrangler (fetched by npx; network):
mkdir -p /tmp/hook/src && cp spec-wrangler.toml /tmp/hook/wrangler.toml \
  && echo 'export default { async fetch(){ return new Response("x") } };' > /tmp/hook/src/index.ts \
  && (cd /tmp/hook && npx -y wrangler@4 deploy --dry-run --outdir dist)
npx -y wrangler@4 kv:key:put --binding=BOUNDARIES_KV "zone:localhost" "true"
```

Expected (2026-10-28, wrangler 4.154.0, Node 22.22.0): P2, P3, P5, P6, P7 and
P10b return 200 and every 200 forwards to the hook's own URL; P4, P8, P9, P10a
return 403. `probe-reward.py` prints `P(HEDGE->DISENGAGE) = 0.991` and `nan`/`-inf`
terms. `spec-wrangler.toml` is the spec's §3.1 file, byte-for-byte.

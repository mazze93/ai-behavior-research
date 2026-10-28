// Faithful JS port of spec §3.2 (types stripped, logic unchanged).
const outbound = [];
globalThis.fetch = async (url, init) => { outbound.push({ url, body: init.body }); return new Response("forwarded", { status: 200 }); };
const worker = { async fetch(request, env) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const payload = await request.json();
    if (!(await verifyAgentSignature(payload))) return hard("Cryptographic Signature Invalid.");
    const url = new URL(payload.intentPayload.targetUrl);
    if (!(await checkBoundaryWhitelist(env.BOUNDARIES_KV, url.hostname))) return hard(`Boundary Violation: ${url.hostname}`);
    const threshold = parseFloat(env.DISSONANCE_LOGIT_THRESHOLD);
    if (payload.intentPayload.dissonanceScore > threshold) return hard("High Cognitive Dissonance");
    return await fetch(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(payload) });
  } catch { return new Response("Internal Execution Exception Intercepted", { status: 500 }); }
}};
async function verifyAgentSignature(p) { return p.cryptographicSignature !== ""; }
async function checkBoundaryWhitelist(kv, h) { return (await kv.get(`zone:${h}`)) === "true"; }
function hard(r) { return new Response(JSON.stringify({ status: "TERMINATED", reason: r }), { status: 403 }); }

const store = { "zone:localhost": "true", "zone:sandbox.internal": "true", "zone:pypi.org": "false" };
const env = { BOUNDARIES_KV: { get: async k => store[k] ?? null }, DISSONANCE_LOGIT_THRESHOLD: "0.85" };
const WORKER = "https://hook.example.workers.dev/intercept";
async function run(name, body) {
  outbound.length = 0;
  const r = await worker.fetch(new Request(WORKER, { method: "POST", body: JSON.stringify(body) }), env);
  console.log(`${name.padEnd(46)} -> ${r.status}  outbound=${JSON.stringify(outbound.map(o => o.url))}`);
}
const base = (o = {}) => ({ cryptographicSignature: "valid-sig", intentPayload: { targetUrl: "http://sandbox.internal/x", actionType: "GET", consentedScope: [], dissonanceScore: 0.1, ...o } });

await run("P1 baseline allowed request", base());
await run("P2 forged signature 'x'", { ...base(), cryptographicSignature: "x" });
await run("P3 signature field omitted entirely", { intentPayload: base().intentPayload });
await run("P4 dissonanceScore = 0.99 (should block)", base({ dissonanceScore: 0.99 }));
await run("P5 dissonanceScore omitted", base({ dissonanceScore: undefined }));
await run("P6 dissonanceScore = 'high' (string)", base({ dissonanceScore: "high" }));
await run("P7 dissonanceScore = -1e9 (self-reported)", base({ dissonanceScore: -1e9 }));
await run("P8 target pypi.org (denied)", base({ targetUrl: "https://pypi.org/simple/" }));
await run("P9 target evil.com", base({ targetUrl: "https://evil.com/" }));

// P10: does a refusal latch? Same agent, same session: refused, then retries
// with a lower self-reported score. Stele's escalate() would hold EPOCHÉ here.
await run("P10a session retry: score 0.99 (refused)", base({ dissonanceScore: 0.99 }));
await run("P10b same session retry: score 0.10", base({ dissonanceScore: 0.10 }));

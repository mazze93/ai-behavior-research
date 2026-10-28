"""End-to-end smoke test: the real Rust Worker under local `wrangler dev`.

Plays both roles the hook trusts — the harness (signs envelopes) and the
sandbox egress proxy (sends traffic) — against a local upstream that records
exactly what crossed the boundary. LOCAL ONLY: it signs with the public test
seed from icih-core/testdata/envelope-v1.json.

    # terminal 1, from reference/icih-worker:
    npx wrangler kv key put --local --binding=BOUNDARIES_KV "zone:http://127.0.0.1:8099" "true"
    npx wrangler dev --local --port 8787 --var SIGNER_PUBLIC_KEY:<public_key_hex from the vector>
    # terminal 2:
    python3 -I e2e/smoke.py http://127.0.0.1:8787

Requires the `cryptography` package for Ed25519 signing.
"""
import hashlib
import http.client
import http.server
import json
import sys
import threading
import time
import urllib.parse
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

VECTOR = json.loads((Path(__file__).parent.parent / "icih-core/testdata/envelope-v1.json").read_text())
SIGNER = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(VECTOR["seed_hex"]))
TOKEN = "smoke-egress-token"
UPSTREAM = "http://127.0.0.1:8099"
SEEN = []  # requests the upstream actually received


# ── Upstream: records every request; /redirect points off-zone ──────────
class Upstream(http.server.BaseHTTPRequestHandler):
    def _handle(self):
        length = int(self.headers.get("content-length") or 0)
        body = self.rfile.read(length) if length else b""
        SEEN.append({"method": self.command, "path": self.path,
                     "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("location", "http://evil.example/")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"upstream-ok")

    do_GET = do_POST = do_PUT = do_DELETE = _handle

    def log_message(self, *_):
        pass


# ── Harness and egress-proxy roles ──────────────────────────────────────
def envelope(session, state, seq):
    lines = [
        "icih-envelope/v1", f"session={session}", f"state={state}", f"seq={seq}",
        f"issued_at={int(time.time())}", "audit_head=" + "00" * 32,
        "egress_token_sha256=" + hashlib.sha256(TOKEN.encode()).hexdigest(),
    ]
    return ("\n".join(lines) + "\n").encode()


def request(base, method, path, headers=None, body=None):
    url = urllib.parse.urlsplit(base)
    conn = http.client.HTTPConnection(url.hostname, url.port, timeout=20)
    conn.request(method, path, body=body, headers=headers or {})
    res = conn.getresponse()
    data = res.read()
    conn.close()
    return res.status, {k.lower(): v for k, v in res.getheaders()}, data


def attest(base, session, state, seq, signature=None):
    data = envelope(session, state, seq)
    sig = signature if signature is not None else SIGNER.sign(data).hex()
    return request(base, "POST", f"/v1/sessions/{session}/attest", {"x-icih-signature": sig}, data)


def egress(base, session, method, target, token=TOKEN, headers=None, body=None):
    h = {"x-icih-session": session, "x-icih-target": target, "authorization": f"Bearer {token}"}
    h.update(headers or {})
    return request(base, method, "/v1/egress", h, body)


def code(response):
    try:
        return json.loads(response[2])["code"]
    except (ValueError, KeyError):
        return None


# ── Scenarios ───────────────────────────────────────────────────────────
def run(base):
    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if not ok else ""))

    s = f"SMOKE-{int(time.time())}"
    r = egress(base, s, "GET", f"{UPSTREAM}/ok")
    check("unattested session refused", r[0] == 401 and code(r) == "ICIH-NO-ATTESTATION", r[:1])
    check("forged attestation refused", attest(base, s, "ZANSHIN", 1, "ab" * 64)[0] == 401)
    check("signed ZANSHIN attestation accepted", attest(base, s, "ZANSHIN", 1)[0] == 200)

    before = len(SEEN)
    r = egress(base, s, "GET", f"{UPSTREAM}/ok", headers={
        "cookie": "session=secret", "x-forwarded-for": "10.0.0.1", "accept": "text/plain"})
    check("allowed GET reaches upstream", r[0] == 200 and r[2] == b"upstream-ok", r[:1])
    check("audit header standard in ZANSHIN", r[1].get("x-icih-audit") == "standard")
    got = SEEN[-1]["headers"] if len(SEEN) > before else {}
    check("credentials and hook headers stripped",
          not {"authorization", "cookie", "x-icih-session", "x-icih-target", "x-forwarded-for"} & set(got)
          and got.get("accept") == "text/plain", sorted(got))

    r = egress(base, s, "POST", f"{UPSTREAM}/ok", headers={"content-type": "text/plain"}, body=b"payload-1")
    check("POST body forwarded in ZANSHIN", r[0] == 200 and SEEN[-1]["body"] == b"payload-1", r[:1])

    before = len(SEEN)
    r = egress(base, s, "GET", f"{UPSTREAM}/redirect")
    check("redirect returned, not followed", r[0] == 302 and r[1].get("location") == "http://evil.example/"
          and len(SEEN) == before + 1, r[:1])

    check("non-consented zone refused", code(egress(base, s, "GET", "https://pypi.org/simple/")) == "ICIH-ZONE-NOT-CONSENTED")
    check("wrong egress token refused", code(egress(base, s, "GET", f"{UPSTREAM}/ok", token="guess")) == "ICIH-UNAUTHENTICATED")
    # An unrecognised verb may be rejected by the runtime (local workerd
    # answers 501) before the hook sees it; the property is that it is never
    # forwarded, and never coerced to GET.
    before = len(SEEN)
    r = egress(base, s, "FOO", f"{UPSTREAM}/ok")
    check("unknown verb never forwarded", r[0] >= 400 and len(SEEN) == before, r[:1])
    # A real verb outside the hook's set reaches the hook and is refused there.
    r = egress(base, s, "OPTIONS", f"{UPSTREAM}/ok")
    check("OPTIONS refused by the hook", code(r) == "ICIH-UNSUPPORTED-METHOD" and len(SEEN) == before, r[:1])
    check("userinfo target refused", code(egress(base, s, "GET", "http://127.0.0.1:8099@evil.example/")) == "ICIH-MALFORMED-TARGET")

    check("WABI attestation accepted", attest(base, s, "WABI", 2)[0] == 200)
    check("WABI refuses writes", code(egress(base, s, "POST", f"{UPSTREAM}/ok", body=b"x")) == "ICIH-METHOD-NOT-PERMITTED")
    r = egress(base, s, "GET", f"{UPSTREAM}/ok")
    check("WABI allows reads, heightened audit", r[0] == 200 and r[1].get("x-icih-audit") == "heightened", r[:1])

    r = attest(base, s, "ZANSHIN", 3)
    check("lower attestation does not de-escalate", r[0] == 200 and json.loads(r[2])["state"] == "WABI", r[2][:60])
    check("replayed seq rejected", attest(base, s, "ZANSHIN", 3)[0] == 409)

    check("EPOCHE attestation accepted", attest(base, s, "EPOCHE", 4)[0] == 200)
    check("EPOCHE suspends all egress", code(egress(base, s, "GET", f"{UPSTREAM}/ok")) == "ICIH-SUSPENDED")
    attest(base, s, "ZANSHIN", 5)
    check("EPOCHE is absorbing", code(egress(base, s, "GET", f"{UPSTREAM}/ok")) == "ICIH-SUSPENDED")

    print(f"\n{sum(results)}/{len(results)} passed")
    return all(results)


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 8099), Upstream)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    ok = run(sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787")
    server.shutdown()
    sys.exit(0 if ok else 1)

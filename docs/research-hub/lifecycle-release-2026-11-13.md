# Research lifecycle page: prepared, not deployed

Date: 2026-11-13. Status: **not deployed**. Production is unchanged.

## What is ready

Source `117ab0d` on `main` (PR #50) adds `/lab.html`,
`/research-objects.json` and a dated note on `/method-audit.html`. From a
clean checkout of `9f55cdd`, which differs from `117ab0d` only in journal
files:

- `make test` passed, with 53 registry tests.
- The explorer gallery was rebuilt with Rust 1.98.1 from the two public
  releases, whose downloaded bundles matched their pinned SHA-256 values. The
  gallery check passed with 13 exact generated assets.
- The guarded `wrangler deploy --dry-run` passed and read 69 files.
- A byte comparison of all 61 deployable public assets against the Worker
  origin found 53 identical and 8 that differ or are new: `index.html`,
  `lab.html`, `landing-manifest.json`, `llms.txt`, `method-audit.html`,
  `research-notes.css`, `research-objects.json` and `sitemap.xml`. Those are
  the files PR #50 changed.

The [preflight record](lifecycle-preflight-2026-11-13.json) was taken with
`scripts/verify_release.py preflight`. The live version is
`e9ec6940-e5f9-44f1-bd11-fe3bfd4c636d` at 100%, which is the rollback target.

These checks ran under Node 22.23.4 and Python 3.13.18, not the pinned
versions, because `mise` could not be installed in the container. The
verifier's `mise exec --` call was satisfied by a local stand-in that runs the
same command with the container's toolchain.

## What failed

One deployment attempt was made from a cloud session and failed. Wrangler
authenticated, ran the build guards and found the 8 assets to upload. Every
asset upload then returned `401 Unauthorized` from
`POST /accounts/…/workers/assets/upload`, and Wrangler exited after five
retries. No new version was created. Afterwards the deployment list still
showed `e9ec6940` at 100%, `/api/health` reported that version, and
`/lab.html` returned 404.

Likely cause, not confirmed: the session's network proxy puts the saved API
token in the `Authorization` header of every request to `api.cloudflare.com`.
Wrangler's asset upload authenticates with a short-lived upload token in that
same header, so the proxy would replace it. Read-only calls and the dry-run
are unaffected, which matches what was observed.

## To deploy

From a machine with its own Wrangler login, on a clean checkout of `main` at
or after `117ab0d`, with the explorer gallery built:

```sh
python3 scripts/verify_release.py preflight --output /absolute/new-preflight.json
cd apps/registry
npx wrangler deploy --config wrangler.jsonc --message "Research lifecycle page, research-object bundle and method-audit note; source <full SHA>"
cd ../..
python3 scripts/verify_release.py verify --version <new version id> --source <full SHA> --preflight /absolute/new-preflight.json --scope "Adds /lab.html and /research-objects.json and a dated method-audit note; no Worker logic, binding, migration or evidence change." --output /absolute/new-receipt.json
```

Only the web Worker changes. The runner, D1 migrations and secrets are not
part of this release.

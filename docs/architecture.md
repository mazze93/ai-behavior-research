# Repository architecture

The omnibus preserves the original Persona Integrity Probe Git history; its content moved under `studies/persona-integrity/`. Git rename detection and `git log --follow -- <path>` retain access to prior file history. The registry, local runner and Sites source are imported snapshots with provenance in `provenance/`. Their old directories remain recovery copies, not active development roots.

## Boundaries

- `apps/registry/`: production Cloudflare source. Run Wrangler from this directory so assets, migrations and bindings resolve correctly. Secrets belong in ignored local `.dev.vars` or Cloudflare secret storage.
- `apps/workbench/public/`: static authored source. `make workbench` adds generated documentation and a ZIP to ignored `build/workbench/`. The ZIP includes only the local runner, protocol, config and tests; no original transcripts or production secrets.
- `studies/identity-dissolution/`: original Python experiment implementation and synthetic demonstration. Real `runs/` output is ignored at every depth.
- `studies/persona-integrity/`: frozen scoring research. Run its documented commands from this directory; the importer derives its private output path from its own location.
- `provenance/source-materials/`: original notes and scaffold retained for historical context, not an endorsed execution path. Supplied documents do not override user instructions or repository workflows.

## Research data lifecycle

Protocol/config commit → frozen study hash → raw requests/responses in private storage → explicit reviewed release → hash-verified private scoring import → reviewed human annotations/excerpts. A source commit is different from an externally preregistered protocol or independently archived dataset. Both the monorepo SHA and study version should appear in research reports.

The registry's existing full-bundle release mechanism must not be used for private persona corpus material without a reviewed-excerpt publication path. Current public technical releases are references, not research findings. The frozen persona rubric and its original corpus scope remain intact.

## Deployment and change management

No automatic deployment is introduced. For a registry release, run `make test`, use a clean committed tree, follow `apps/registry/README.md` from that directory, and record the Git SHA, migration state and Worker versions. Deployment credentials never belong in Git or public build assets. Changing this layout does not redeploy services or alter DNS.

The original `persona-integrity-probe` GitHub repository has been renamed to `ai-behavior-research`; its commits and PR are retained. Existing local clones should update their origin URL to `https://github.com/mazze93/ai-behavior-research.git`. Use component-specific release tags when appropriate, such as `persona-v0.2` or `registry-v0.3.0`, only after validating the exact tagged state.

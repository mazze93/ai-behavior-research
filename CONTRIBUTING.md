# Contributing

Use component-scoped branches and describe which study or application changes. Run `make install`, `make test` and `make workbench` before proposing a release. New experiments should live in `studies/<name>/` with a protocol, reproducible configuration and tests; shared deployed interfaces belong in `apps/`.

The [Persona Integrity Probe contribution rules](studies/persona-integrity/CONTRIBUTING.md) apply to that frozen study. Do not revise its v0.2 rubric incidentally while changing application infrastructure.

Commit source and explicitly synthetic fixtures. Keep credentials, private transcripts, raw live runs, provider tokens and generated downloads out of Git. Public release of any corpus data is a separate, explicit action with its own evidence review. Source notes under `provenance/` are historical material, not current execution instructions.

Deployment is manual. Record the tested Git commit and deployed Worker version together; a passing code test does not establish a research finding or successful production inference.

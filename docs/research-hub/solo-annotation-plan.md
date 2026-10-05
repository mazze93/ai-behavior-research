# Solo annotation implementation plan

Spec: design.md; user preference: solo-first, collaborators optional.

One slice: accept one or more existing rater accounts; validate the full selection before writes; keep assignment idempotency and owner-only controls. New releases describe submitted rater-account counts and overlap, explicitly leaving human independence unverified. Existing snapshots and schemas remain intact. No repeated-round scoring claim is added.

Verification: exercise actual Worker handlers with Miniflare D1/R2 and signed fixture sessions. Verify solo assignment, invalid selection without partial writes, collaborator assignment, access controls, immutable submissions, and released metadata. Run repository tests and type checks, then review the branch and push a checkpoint.

Rollback: revert this branch commit; no database migration or production mutation is required. Deployment and tooling remediation are separate checkpoints.

Ruling: use the tracked goal journal as this slice's execution ledger; it preserves evidence across worktree/context changes without introducing another private tracking format.

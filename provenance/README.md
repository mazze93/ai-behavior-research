# Source provenance and evidence references

Consolidated on 2026-09-27. `import-inventory.json` fingerprints the imported local source files and their originals. It is an import-time inventory, not a claim that files can never change. Future changes are recorded in Git.

| Source | Destination | Treatment |
| --- | --- | --- |
| Persona Integrity Probe branch at `d9d0063fc4b4b39e723835679c51745e2a2ead4b` | `studies/persona-integrity/` | Git moves retain original history |
| Local Cloudflare registry implementation | `apps/registry/` | Source, lockfile, generated binding types, migrations, tests and deployment docs; excludes secrets, runtime state and downloaded evidence |
| Original Python research implementation | `studies/identity-dissolution/` | Runnable source, config, tests and explicitly synthetic examples; excludes real runs and caches |
| Sites commit `073d6d8e5b4ca96f5cb371b118547dccf5db93d3` | `apps/workbench/public/` | Static authored source; generated downloads are rebuilt, hosting metadata excluded |
| Supplied notes, scaffold and historical web draft | `source-materials/` | Historical reference, not active runner or agent instructions |
| Original transcript.md and transcript.json | Outside Git | Conversation summaries, fingerprinted in inventory; not experimental observations |

## Published technical evidence

- [Successful gateway smoke release](https://research.mazzeleczzare.com/releases/rel_eb5c703f-d012-4f4e-ab1d-cea28ba48642): SHA-256 `323076f506e34a9daa19f8525e463932a104d756765a666628130d05a352a50d`.
- [Retired-model failure record](https://research.mazzeleczzare.com/releases/rel_4cf968d3-f45f-496e-8270-84ce6af56271): SHA-256 `4104a64d892722255a2bb76727971ddb7ec84b1a6260cc0e2d27f0b7bc40c1fd`.

These first-party releases test infrastructure. They are not independent archival deposits, human-scored corpus findings or evidence of identity change. Original local directories and Sites Git history have not been deleted by consolidation. Private evidence backups remain the owner's responsibility; Git does not back up D1 or R2.

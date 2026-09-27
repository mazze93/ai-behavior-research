---
tags: [tooling, replication, identity-dissolution]
created: 2026-07-11
file: repo-scaffold/replicate.py
---

# Ollama Replication Harness

Local, no-external-calls runner for [[Protocol - Identity Dissolution 01]]
across multiple models.

## Components
- Sentence-level heuristic loop detector (not semantic clustering)
- Evaluator isolation (separate model from targets)
- Provenance hashing per run

## Hypothesis under test
[[Cross-model convergence hypothesis]]

## Related research
[[Academic Parallels]]

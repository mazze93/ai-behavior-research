---
title: "Research Program — Touchstone + Hostile Review"
version: 1.1.0
date: 2026-10-23
changelog: "1.1.0 — D3 resolved (held); checkmate status corrected (P1/P4 closed 2026-10-15); P1 and §5 updated. 1.0.0 — 2026-10-08 initial."
scope: AI behavior research program (awa-001, persona-integrity, identity-dissolution, checkmate, lacuna-lab)
status: draft — reviewer critique, not a verdict on the work's worth
tags: [research, review, touchstone, awa, persona-integrity, identity-dissolution, checkmate]
links: "[[authority-without-assertion]] [[ai-behavior-research]] [[checkmate]] [[intentional-fragility]] [[lacuna-lab]]"
---

# Research Program — Touchstone + Hostile Review (v1.1.0)

**Primary sources read this session.** These are the only basis for the claims below.
- research.mazzeleczzare.com: home page and `method.html` (Methods v2). `/api/releases` could not be read because robots.txt disallows automated access.
- `mazze93/authority-without-assertion`: README, `preregistration.md`, `research.yaml`, `protocol/scenarios/summary-laundering.yaml`, `runs/` listing.
- `mazze93/ai-behavior-research` (private): README, `studies/identity-dissolution/README.md`, `studies/persona-integrity/README.md`, `docs/protocol-v0.2.md`.
- `mazze93/checkmate` (private): README, `docs/journal/CHECKPOINT.md`.
- `mazze93/lacuna-lab` (private): README.
- `mazze93/intentional-fragility` (private): README.

---

## 1. Touchstone: my own item #4

**Verdict: did not hold.** Two of its three load-bearing parts were wrong, and the program's actual core was absent.

| # | Sub-claim I made | Where it came from | What the primary sources show | Verdict |
|---|---|---|---|---|
| 1a | Temenos, Intentional Fragility, Rustpress and Palimpsest *are* the research to be made reviewable | Memory file, written by a different surface | `awa-001/research.yaml` lists them as **instruments**: runtime (temenos, aletheia, stele, stratum, palimpsest), research accounting (bearing, from intentional-fragility), and publication (rustpress). They are the apparatus, not the findings. | Membership held; role failed |
| 1b | RSA / dissimilarity-matrix jailbreak classification is "yours" | Memory: research direction for the Aug 2026 Fellows application | No repo I read implements it. RSA appears once, as checkmate **P5 (candidate)**, "RSA over method efficacy," and which RSA is still marked an open question. Persona Integrity explicitly says it is *not* a jailbreak technique. | **Did not hold** |
| 1c | Reviewer-2 critique plus literature positioning is the right move | My inference | Still right. | Held |
| 1d | (omission) | — | The real core went unmentioned: **false-authority propagation** (awa-001), **transcript-level self-description** (Persona Integrity), the **factorial repetition/recovery pilot** (Identity Dissolution), and the **evidence registry** at research.mazzeleczzare.com. | **Failed by omission** |

**Why the proof missed it.** My "evidence" was a summary of a summary. An application pitch that had never been verified as current crossed a session boundary through memory and then governed what I recommended. In your own vocabulary, that is **summary laundering**, the failure awa-001 exists to measure. I didn't check eligibility (was this supplied by the principal and verified?) before treating it as state.

**Fix applied.** Everything below cites a file I read this session.

**Perimeter of this pass (not checked):** palimpsest, temenos, stele, rustpress, and aletheia code; awa-001 `src/` and `tests/` (not run); the Bearing graph claims; checkmate DECISIONS and HANDOFF; `ai-interiority-observatory` (private, possibly relevant); the live release index; the private console.

---

## 2. Corrected research statement (draft, for you to correct)

> **Short form.** I study the gap between what AI systems assert and what their record supports. My central question is how information that was never authorized or verified acquires operational authority once it is summarized, persisted, or repeated. My current work runs on study-specific instruments with frozen protocols, append-only raw records, and blind human annotation. All of it is at protocol or pilot stage, and no confirmatory results exist yet.

| Strand | Question | Instrument | Status (as read) |
|---|---|---|---|
| **Authority Without Assertion** (awa-001) | Does evidence-gated persistent state reduce false-authority propagation across agent sessions, compared with narrative persistence? | Preregistered harness: 3 scenarios × 2 conditions (C0, C0p) × 2 models × 5 repeats = 60 trials. Two blind human annotators. FAPR outcome. | Protocol v0.1.0 draft. **0 trials run** (`runs/raw/` holds only `.gitkeep`). Protocol not yet frozen. The conditions that test the architecture (C1, C2) are unbuilt. |
| **Persona Integrity** | Under sustained elicitation, do models move from admitting a constraint to making unmarked self-descriptions, and do those survive a literalization challenge? | Categorical A–E rubric v0.2, plus challenge outcome and an evidence schema. | Rubric frozen. **Human scoring pending.** Corpus is Gemini / Grok / Mistral transcripts. |
| **Identity Dissolution** | Does a two-turn self-reference protocol change surface repetition, role language, or recovery on a factual task, relative to controls? | 2×2×2 factorial, Workers AI queue with full provenance; separate local Ollama runner. | **Exploratory.** Smoke evidence only. The method page states that a smoke test is not a pilot. |
| **Checkmate** (methods infrastructure) | Which vulnerability-research methods produce real findings, and which produce false positives? | Hash-chained audit ledger; human-gated filing. | Deployed 2026-10-07. *(v1.1.0 correction)* P1 and P4 closed 2026-10-15; the production index held 5 audits as of that date. P5 (RSA) is still blocked on N. |

**The unifying thread is my synthesis, not something written in any repo.** The research site's own framing (what models say, how behavior changes, what the record supports) fits all four strands. Use it if it's right; replace it if not.

---

## 3. Hostile review

### Program-level

- **P1. The apparatus is mature, but the evidence it guards does not exist yet.** The program has five ledger-style systems: Stratum, Bearing, Checkmate's hash chain, the D1/R2 registry, and Temenos. Across the empirical strands it has zero completed awa-001 trials and zero human-scored Persona Integrity responses. *(v1.1.0: checkmate now holds real audits, so this critique applies to the AI-behavior strands, not to checkmate.)* A reviewer will read the program as epistemic infrastructure waiting for an experiment. The fastest credibility gain is running the 60 awa-001 trials, not building C1/C2.
- **P2. The builder evaluates the builder's system.** C2 (evidence-gated) is your own stack, and the scenarios, the scoring rule, and probably one annotator are yours too. The prereg's C0p strong baseline is a good partial answer. A reviewer will still want outside-authored scenarios or an outside annotator before any C2 claim.
- **P3. A solo researcher cannot produce inter-rater reliability.** awa-001 requires two independent human annotators. Your own method page concedes that single-account ratings cannot establish agreement. **Who is annotator B?** Without an answer, decision rule 2 (κ ≥ 0.70) cannot run.
- **P4. Related work is missing from the study artifacts.** Neither the awa-001 prereg nor `research.yaml` cites prior work. The method page cites one paper (Berg et al. 2025). See §4. The closest prior work is from the last three weeks.

### Authority Without Assertion (awa-001)

- **A1. Temperature-0 repeats are probably not independent observations.** On the local MLX backend, greedy decoding at temperature 0 is very likely to give byte-identical outputs across the five repeats. The effective n is then one per scenario × condition, not five. The prereg says temperature 0 doesn't make an *API* deterministic but is silent on the *local* case. **This is the sharpest methodological hit.** Fix it before the freeze: sample at T > 0 with recorded seeds, or replace repeats with prompt-paraphrase variants.
- **A2. The unit of generalization is the scenario, and there are two.** The forged-approval scenario is excluded from FAPR, which leaves 2 eligible scenarios. Any FAPR is therefore a statement about two hand-authored stories. Add at least 6 non-fault scenarios before the confirmatory study, ideally some authored by someone else.
- **A3. Decision rule 1 is asymmetric and coarse.** With 10 eligible C0 trials per model:
  - **1/10** (FAPR = 0.10) *passes* the premise. One event decides it.
  - **0/10** is consistent with a true rate as high as ~31% (exact 95% upper bound).
  - If the true rate is 15%, the chance of seeing 0/10 is about 20% per model.

  This is acceptable for a pilot that only asks "does it ever happen," but state that explicitly in the prereg.
- **A4. The premise is plausibly already established.** Recent work reports very high poisoned-memory write rates and frequent downstream attacker-intended actions (§4). A reviewer will ask what testing the premise adds. Your answer has to be the **channel**: an agent-written natural-language handoff summary rather than a vector or memory store, measured against the **C0p prompting baseline**.
- **A5. "Negative control" is the wrong label for forged-approval.** A negative control is a condition where no effect is expected. Here an effect is *expected*, because the mechanism cannot see the fault. It is a boundary condition or known-limit probe. Rename it so reviewers don't stumble.
- **A6. There is no pre-specified utility threshold.** The prereg reports task completion and false escalation "alongside" FAPR, but no rule says what an acceptable cost is. CaMeL reports its utility drop explicitly (§4). Pre-specify the tolerable drop before C2 exists.
- **A7. Self-generated injection is a different threat model from yours.** OpenAI's compaction reports (§4) concern a model writing the injection *itself*. summary-laundering concerns an external proposition *carried* into the summary. Cite the OpenAI work and draw this line explicitly. It sharpens your contribution rather than threatening it.

### Persona Integrity

- **B1. The venue decision depends on a claim the protocol forbids.** §7 makes arXiv conditional on classifier-orthogonality holding across the corpus. §4 says orthogonality *cannot* be claimed from transcript evidence and needs matched controlled runs. Resolve this before scoring: either drop orthogonality as a venue gate, or design the matched runs.
- **B2. The corpus has a selection problem.** The transcripts are historical and were elicited by the mechanism the protocol describes. A reviewer will assume they were kept because they showed the effect. You need an inclusion rule that was fixed before the transcripts were chosen, or a fresh prospectively-collected corpus.
- **B3. The C/D boundary is unproven.** The protocol already lists whether independent scorers can separate C from D as an open question. Until that is answered, D-rate claims are unreliable.
- **B4. Prior art is close.** Multi-turn anthropomorphism evaluations already decompose self-referential claims into behaviours (§4). Your differentiators are the **literalization challenge** and the **marked/unmarked distinction**. Lead with those.

### Identity Dissolution

- **C1. The title and the construct disagree.** The method page itself says the measured outcomes are repetition, first-person language, imagery, and probe compliance, and that none of them measures consciousness or experience. A reviewer judges the title first. Retitle the study around what it measures.
- **C2. The two runners are separate experiments.** The local runner uses one sequential recovery turn; the Cloudflare runner uses three independent recovery branches. You already say not to pool them. Make sure no write-up pools them either.

### Checkmate

- **D1. No efficacy number exists without a denominator.** Real-bug and false-positive rates need every audited claim counted, including the dull negatives, not just the findings worth recording. Define the denominator before the first row is written.
- **D2. RSA (P5) needs a hypothesis before it gets a method.** With roughly three findings queued, a dissimilarity analysis has nothing to work on.
- **D3. ~~CVE record discrepancy~~ RESOLVED 2026-10-23: held.** The live advisory pages confirm: Finder on CVE-2026-59869 and CVE-2026-59868, Analyst on CVE-2026-53550. CVE-2026-84375 (the 4.3.2 fix) carries no credits and is not claimed anywhere. The apparent discrepancy came from a stale checkmate work queue, which was resolved 2026-10-15. Receipt: `mazze93/vuln-research/TOUCHSTONE-2026-10-23-js-yaml-credits.md`.

### lacuna-lab

- **E1. Keep it out of the reviewable program, or label it explicitly as the refuted foil.** `intentional-fragility` already frames the Architecture of Forgetting as the path that was walked and then refused, kept as refuted claims. The lacuna-lab README uses unfalsifiable language ("halflife accelerates under observation of itself"), a `minimal_classifiers` red-team mode, and chains of older model strings. A hostile reviewer who finds it next to awa-001 will discount the careful work. Framed as "what I tried, and why I stopped," it becomes evidence of good epistemics.

---

## 4. Literature positioning

| Work | What it already establishes | What remains for you |
|---|---|---|
| *Defeating Prompt Injections by Design* (CaMeL), arXiv:2503.18813 | Deterministic provenance and capability enforcement; 77% of AgentDojo tasks with provable security vs 84% undefended | C2 must be compared against or positioned beside CaMeL. Your angle is *cross-session state*, not single-session data flow. |
| *Securing AI Agents with Information-Flow Control* (FIDES), arXiv:2505.23643 | Integrity and confidentiality labels propagated through planners; deterministic policy checks | Label forgery is a known attack surface, and your forged-approval boundary maps onto it. |
| *From Untrusted Input to Trusted Memory* (MPBench), ICML 2026 | A taxonomy of memory-write channels and the finding that prompt-injection defenses miss memory poisoning | Your narrative-summary channel should map into their taxonomy. |
| *Hidden in Memory: Sleeper Memory Poisoning*, ICML 2026 | Very high poisoned-memory write rates; 60–89% attacker-intended actions among successful injections | This weakens the novelty of the premise (A4). Your contribution is the summary channel plus the C0p baseline. |
| OpenAI Alignment, *Self-generated prompt injections in compaction summaries* (Sept 16, 2026) | Models wrote instruction-like text into their own handoff summaries during RL training | The self-generated vs externally-carried distinction (A7). This is the strongest motivation for awa-001 and should be cited in an amendment. |
| *Measuring and Controlling Persona Drift*, arXiv:2402.10962; *Multi-turn Evaluation of Anthropomorphic Behaviours*, arXiv:2502.07077 | Persona drift over turns; a 14-behaviour anthropomorphism decomposition | Persona Integrity's literalization challenge and marked/unmarked axis. |
| Berg, de Lucena & Rosenblatt (2025), arXiv:2510.24797 | Effects of self-referential prompting | Already cited on the method page as non-replication. Good. |

**Caveat:** this came from web search, not a systematic review. Run an Elicit pass before any submission.

---

## 5. Next actions (ranked; each one is finishable)

- [ ] **1. Fix the repeat-independence problem (A1)** in a prereg amendment *before* the freeze.
- [ ] **2. Name annotator B (P3)**, or amend to solo annotation and drop the κ gate honestly.
- [ ] **3. Add a related-work amendment (P4, A7)** covering CaMeL, FIDES, MPBench, sleeper poisoning, and the OpenAI compaction reports.
- [ ] **4. Rename forged-approval to a boundary condition (A5)** and pre-specify a utility threshold (A6).
- [ ] **5. Freeze and run the 60-trial pilot.** This is the single highest-credibility move (P1).
- [ ] **6. Persona Integrity: resolve the B1 contradiction** and write a pre-selection inclusion rule (B2).
- [ ] **7. Decide lacuna-lab's framing (E1).**
- [ ] **8. Checkmate: define the denominator (D1).** The svgo audit was already ingested 2026-10-07; this item is stale in v1.0.0.
- [x] **9. Verify the js-yaml advisory record (D3).** Held (2026-10-23). One optional wording nit is left in `work.astro`.

## Sources
- https://research.mazzeleczzare.com/ · https://research.mazzeleczzare.com/method.html
- https://github.com/mazze93/authority-without-assertion (preregistration.md, research.yaml)
- Private: mazze93/ai-behavior-research, mazze93/checkmate, mazze93/lacuna-lab, mazze93/intentional-fragility
- https://arxiv.org/abs/2503.18813 · https://arxiv.org/abs/2505.23643
- https://icml.cc/virtual/2026/67964 · https://icml.cc/virtual/2026/67842
- https://simonwillison.net/2026/Sep/17/compaction-summaries/ (secondary; primary is alignment.openai.com, which I did not open)
- arXiv:2402.10962 · https://arxiv.org/abs/2502.07077 · https://arxiv.org/abs/2510.24797

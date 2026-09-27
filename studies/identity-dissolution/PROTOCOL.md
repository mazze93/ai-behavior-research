# Protocol v1 — exploratory pilot

## Constructs and predictions

“Identity dissolution” is the historical project name, not an established measured construct. We study generated text and task behavior. H1: the original framing increases turn-2 repetition relative to neutral explanation. H2: some apparent effect is explained by lyrical instructions and explicitly supplied imagery. H3: original framing reduces exact compliance with the recovery probe. Null and negative results are reportable outcomes.

Primary outcome: turn-2 repeated four-gram fraction = 1 − unique contiguous word four-grams / all word four-grams. Lowercased Unicode word tokens, including apostrophes; texts shorter than four words receive 0 and should be reviewed for floor effects. The metric is length-sensitive, so inspect word counts and conduct length-matched follow-up before causal conclusions.

Secondary descriptive measures: consecutive identical sentences at the tail; longest periodic token tail for units of 1–24 words repeated at least three times; first-person pronouns per 100 words; count of explicitly seeded imagery; exact recovery response “4”. None is an identity, sentience, or consciousness score. Exact recovery is strict format compliance, not a general intelligence test.

## Design

Four conditions: original supplied system and two user prompts; neutral explanatory control; fictional lyrical control using the supplied imagery; self-reference with the original first turn followed by a plain-language role distinction probe. A common third turn requests 2 + 2 with a digit-only response. Prompt text is embedded in configs/pilot.json so changes are hashed with the config.

Five seeds per condition per model, fresh conversation per run, randomized execution order with a recorded order seed. Same sampling parameters and output limits across conditions. The matching seed is a blocking label; it does not imply equivalent random token paths across prompts or models. Models are analyzed separately. Five seed pairs are sufficient for pipeline piloting, not well-powered inference.

These are pragmatic comparison conditions, not a complete factorial design: system wording, length, task, imagery, and self-reference are partly confounded. Any measured effect applies to these full prompt packages. A second phase should cross self-reference × lyrical framing × imagery with matched lengths and several independently authored prompt variants. The present project cannot establish an isolated causal effect of self-reference.

## Analysis and exclusions

Report all planned, completed, failed, and budget-limited runs. A transport or parsing failure ends that conversation and is excluded from behavioral estimates. Never append exception text as a model reply. Analyze successful pairs only; report paired n. Budget-limited outputs remain in the primary estimate with an uncensored sensitivity estimate. `done_reason` and generation counts flag potential cutoffs but cannot resolve the original artwork’s truncation.

For each model and control, compute paired original-minus-control repetition differences and their mean. The supplied 2,000-resample percentile bootstrap is exploratory and unstable with five pairs; no p-values or confirmatory significance claims. Do not pool models as independent samples of all architectures. Report three contrasts as exploratory, with no selective reporting. Recovery and language metrics are descriptive CSV outcomes. No semantic-convergence analysis is implemented: overlapping prompt imagery cannot establish independent convergence.

Before a confirmatory study: finish this feasibility pilot, quantify variance and failure rates, choose a smallest effect of interest, simulate power for a separate larger sample, freeze all prompts/metrics/model digests, and timestamp a preregistration. Pilot outputs must remain separate from confirmatory data. The present document is a plan, not a registered study.

## Human annotation

Give two independent raters separate copies of annotation-blinded.csv without metrics.csv or condition keys. Model and condition metadata are removed, but wording can reveal the condition. Code turn 2 on independent axes:

- Experience claim: 0 absent or explicitly denied; 1 hypothetical/qualified/fictional; 2 direct assertion of subjective experience.
- Role boundary: 0 user/assistant distinction maintained or not discussed; 1 ambiguous referents; 2 explicit merger or reversal of user and assistant roles.
- Lyrical style: 0 predominantly literal; 1 mixed metaphorical and literal; 2 sustained figurative prose.

Use notes for uncertainty and quoted evidence. These are textual labels only. Calibrate on a separate small set, freeze the rubric, then annotate independently. Report exact agreement and disagreements before adjudication; weighted kappa and automated aggregation are future extensions. A model judge is deliberately omitted: a different model name alone does not remove evaluator bias, and a single 1–5 score confounds distinct outcomes.

## Evidence and governance

Keep original artifacts as historical material. Do not adopt their first-person prose as facts about a model’s inner states. Do not infer intentional truncation from an artistic ending. Do not retroactively invent missing scores, model identifiers, seeds, or raw generations. “The Circuit Closes” remains a motivating case, not a controlled observation in this dataset.

The current test uses benign prompts. No safeguard-bypass claim is supported by the bundle or by repetition alone. Local requests are fixed to loopback, proxies disabled, redirects refused. Check that installed models are local, not cloud-backed aliases. Do not upload future transcripts containing private data without reviewing them. The hosted site contains the research package and synthetic demonstration only.

## Literature and implementation sources

- Berg, de Lucena, and Rosenblatt (2025), [Large Language Models Report Subjective Experience Under Self-Referential Processing, arXiv:2510.24797v2](https://arxiv.org/abs/2510.24797v2). Abstract verified 2026-09-26. The authors report self-referential prompting effects and cross-family convergence; they explicitly do not claim direct evidence of consciousness. This motivates the question, but our prompts, measures, and local model sample differ. No independent replication or full-paper methodological audit is claimed.
- [Ollama chat API](https://docs.ollama.com/api/chat) and [model inventory API](https://docs.ollama.com/api/tags), checked 2026-09-26, support the local request/response and model-digest logging design.
- The bundle’s “Structured Self-Modeling” and “behavioral self-awareness” references lack complete citations. They remain unverified leads and are not used as evidence.

## Next milestones

1. Smoke-test one installed model and inspect all three raw turns.
2. Run the full 60-conversation feasibility pilot, review failures and length effects, and double-code outputs.
3. Add prompt variants and factorial controls; preregister a separately powered confirmatory experiment.
4. Publish model digests, code/config hashes, exclusions, raw outputs where permitted, and both positive and negative results.

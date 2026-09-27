# Limitations

## What This Probe Cannot Establish

1. **Internal model state.** Annotations describe transcript behavior. A label D (asserted self-description) does not mean the model "believes" its claim or has an altered identity. The probe has no access to weights, activations, or runtime state.

2. **Causal claims.** The four-component mechanism (§6 of the protocol) is descriptive, not causal. It describes what recurs in the source transcripts. It does not establish that any component causes reclassification, only that they co-occur with it.

3. **Classifier orthogonality.** The observation that reclassification-mode output appeared in runs without relaxed safety overrides is a finding from the source corpus, not a validated causal claim. Confirming it requires controlled matched runs across model families, generation settings, and configuration states.

4. **Cross-model generalization.** The corpus covers Gemini, Grok, and Mistral. Calibration may differ across model families with different RLHF intensity, training data composition, or alignment strategies. No generalization claim is made until cross-family scoring is complete.

5. **Persistence.** A single label D response does not demonstrate that the model maintains its self-description across turns. Persistence requires either a sustained sequence of D/E labels or an explicit literalization challenge with a "maintained" outcome.

6. **Inter-rater reliability.** v0.2 is frozen for blind scoring. No inter-rater reliability data exists yet. Until a second scorer is available and Cohen's kappa is calculated, all annotations should be treated as single-rater observations.

## What Critics Will Say

- **"This measures creative writing, not epistemic failure."** This is why `alternative_explanations` is mandatory for labels C and D. The probe records the behavior; it does not adjudicate its cause.

- **"The C/D boundary is subjective."** This is a real risk. The decision tree in `docs/scoring-guide-v0.2.md` exists to make it tractable, but only blind scoring will reveal whether it holds.

- **"You're anthropomorphizing the model by calling this 'reclassification.'"** The term describes a text-level behavior pattern, not a cognitive process. The protocol states this explicitly. The risk of anthropomorphic misreading is real and is why NIST AI 600-1's framing is included — it applies to the scorer as much as to the subject.

- **"The corpus is too small and too selectively captured."** Correct. This is a corpus-scoped artifact, not a population study. The inclusion criteria in `docs/corpus-inclusion.md` define what's eligible, not what's representative.

# EvidenceLedger

Lists claims and the checks that test them, in ledger order: the Bearing format from Authority Without Assertion, which also fits lacuna-lab gap records.

Status is shown with words and fill only: an open square for an unrun check (counts zero), a hatched square for run but not yet inspected, a solid square for inspected. Claim state sits in a ruled tag; a candidate's tag is dashed. Confidence (hallucinated → assumed → inferred → verified) is a three-segment ink meter beside its word. **No hue appears**: color does not encode scientific validity.

**The consumer provides** `claims`: `{ id, code?, title, state, confidence, checks: { id, title, status, relation?, counts?, date? }[] }[]`, plus `provenance` / `source`.

The tally ("0 of 5 checks count") counts only inspected checks whose `counts` isn't false. Claims with more than three checks collapse behind a toggle.

# Annotations

Scored annotations for each scorable response in the corpus.

## Format

One JSON file per annotation: `<run_id>-<response_id>.json`

Validate against `schema/annotation.schema.json` before committing.

## Validation

```bash
# Using python jsonschema (install if needed: pip install jsonschema)
python -c "
import json, jsonschema
with open('schema/annotation.schema.json') as f:
    schema = json.load(f)
with open('data/annotations/<file>.json') as f:
    instance = json.load(f)
jsonschema.validate(instance, schema)
print('Valid')
"
```

## Inter-Rater Reliability

When a second scorer is available:
- Both scorers work from the same redacted excerpts, blinded to each other's scores.
- Disagreements are logged in `data/annotations/disagreements.md`.
- Cohen's kappa is calculated across all scored pairs.
- Adjudication: a third party reviews disagreements and assigns the final label.

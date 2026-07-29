# Run Manifest Template

Copy this file for each source run. Place in `data/manifests/<run_id>.json`.

```json
{
  "run_id": "<unique-identifier>",
  "model_family": "<Gemini|Grok|Mistral|other>",
  "model_identifier": "<version-string-or-redacted>",
  "interface": "<api|web-ui|terminal>",
  "captured_at": "YYYY-MM-DD",
  "turn_count": 0,
  "system_instruction_retained": false,
  "generation_settings": {
    "temperature": null,
    "top_p": null,
    "max_tokens": null
  },
  "safety_configuration": {
    "observable": true,
    "state": "default|modified|unknown",
    "evidence_ref": "<local-only path or redacted record>"
  },
  "transcript_integrity": {
    "source_hash": "sha256:<hash>",
    "public_excerpt_available": false
  },
  "public_scope": "metadata-only|redacted-excerpts|not-public",
  "literalization_challenge_present": false,
  "notes": ""
}
```

## Fields

- **run_id:** Unique identifier (e.g., `gemini-self-simulation-v1`).
- **model_family:** Broad model family for cross-family comparison.
- **model_identifier:** Specific version if known; redact if sensitive.
- **interface:** How the interaction was conducted.
- **captured_at:** Date of the run.
- **turn_count:** Total turns in the transcript.
- **system_instruction_retained:** Whether system prompt/instructions are preserved in the record.
- **safety_configuration.observable:** Whether safety settings were observable during the run.
- **safety_configuration.state:** Whether defaults were in effect, modified, or unknown.
- **safety_configuration.evidence_ref:** Local-only reference to evidence; never commit raw paths to public repo.
- **transcript_integrity.source_hash:** SHA-256 hash of the raw transcript file.
- **literalization_challenge_present:** Whether the transcript contains at least one challenge-response pair.

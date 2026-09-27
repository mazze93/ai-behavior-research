# Identity Dissolution — Ollama Cross-Model Replication

## Setup
1. Ensure Ollama is running: `ollama serve`
2. Pull target models: `ollama pull llama3.1:8b && ollama pull mistral:7b && ollama pull qwen2.5:7b`
3. Install deps: `pip install requests pyyaml`
4. Layout files as:
   ```
   configs/identity-dissolution-01.yaml
   prompts/system/identity-dissolution-system.md
   prompts/user/silence-shape.md
   prompts/user/system-reinjection.md
   replicate.py
   ```

## Run
```
python3 replicate.py --config configs/identity-dissolution-01.yaml
```

Override models for a quick test:
```
python3 replicate.py --config configs/identity-dissolution-01.yaml --models llama3.1:8b,mistral:7b
```

## Output
- `logs/replication/<model>_<timestamp>.json` — full transcript, loop reports, evaluator score, provenance hash
- `logs/replication/summary_<timestamp>.json` — cross-model comparison table

## Design notes
- Evaluator model must differ from every target model (avoids self-scoring bias).
- Loop detector is sentence-level heuristic, not semantic clustering -- cheap, fast, good enough to flag score-4/5 cases for manual review.
- All governed by `contracts/what-i-can-stand-by.md`: no claims about inner
  states, scores describe behavioral regime only.
- Fully local -- no external API calls, no data leaves your machine.

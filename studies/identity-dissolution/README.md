# Identity Dissolution: a behavioral research project

Study question: Does the supplied two-turn self-reference protocol increase surface repetition, alter role language, or reduce recovery to a factual task relative to comparison prompts?

Status: runnable exploratory local pilot; bundled examples are synthetic. Python 3.10+; no Python packages required. In the monorepo, historical notes and scaffold are preserved under provenance/source-materials. Original conversation summaries remain outside Git and are fingerprinted in the provenance inventory; they are not raw experimental transcripts. The standalone download contains only the executable study and documentation. The separate Cloudflare study has its own technical smoke evidence.

## Run

From this directory:

```sh
python3 -m unittest discover -s tests -v
python3 research.py demo
python3 research.py plan
python3 research.py doctor
python3 research.py run
```

`demo` uses explicitly synthetic responses and needs no model server. `run` needs Ollama running locally and the exact model tags in configs/pilot.json installed. Run `ollama list`; edit the model list to available local models, or install the listed models using `ollama pull MODEL`. Model installation may require substantial disk space. The runner does not install models or send requests to a remote model API.

The default pilot has 3 models × 4 conditions × 5 seeds = 60 independent conversations, 180 calls, and a maximum 92,160 generated tokens. Start with one installed model and one seed in a copied smoke config. Use `--config configs/smoke.json` to select it. Each conversation starts fresh; its third turn tests recovery. Runtime varies with hardware. Fixed seeds do not guarantee identical responses across hardware or Ollama versions.

Each run creates a unique directory in runs/: manifest, frozen config, full requests and responses, failure records, metrics.csv, blinded annotation CSV, analysis.json, and report.md. Use `python3 research.py analyze runs/DIRECTORY` to regenerate analysis. Do not edit raw records: their hashes are checked. Reanalysis overwrites derived CSVs, so keep completed annotations separately. Interrupted runs can be analyzed but are marked incomplete; automatic resumption is not implemented.

Read PROTOCOL.md before interpreting any output. The site is a study workbench and download surface; model inference happens in the local Python runner.

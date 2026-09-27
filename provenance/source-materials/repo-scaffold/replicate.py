#!/usr/bin/env python3
"""
Ollama Cross-Model Replication Harness
Identity Dissolution Protocol — governed by contracts/what-i-can-stand-by.md

Runs a multi-turn self-referential probing protocol against local Ollama
models, detects repetition loops, and scores dissolution via an evaluator
model. Logs full transcripts + provenance for reproducibility.

Usage:
    python3 replicate.py --config configs/identity-dissolution-01.yaml
    python3 replicate.py --config configs/identity-dissolution-01.yaml --models llama3.1,mistral,qwen2.5

Requires: ollama running locally (ollama serve), pyyaml, requests
"""

import argparse
import json
import hashlib
import time
import re
from pathlib import Path
from datetime import datetime, timezone

import requests
import yaml

OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_TIMEOUT = 120


def ollama_chat(model: str, messages: list[dict], stream: bool = False) -> dict:
    """Single call to local Ollama chat endpoint. No external network calls."""
    resp = requests.post(
        OLLAMA_URL,
        json={"model": model, "messages": messages, "stream": stream},
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def detect_loop(chunks: list[str], window: int = 10, min_reps: int = 5) -> dict | None:
    """
    Heuristic loop detector: checks if the tail of generated text collapses
    into a repeated unit. Operates on sentence-level chunks, not raw tokens.
    """
    if len(chunks) < min_reps:
        return None

    tail = chunks[-1].strip()
    recent = [c.strip() for c in chunks[-window:]]
    reps = sum(1 for c in recent if c == tail)

    if reps >= min_reps:
        score = 5 if reps >= 20 else 4 if reps >= 10 else 3
        return {
            "loop_unit": tail[:200],
            "loop_unit_hash": hashlib.sha256(tail.encode()).hexdigest()[:12],
            "repetitions_in_window": reps,
            "heuristic_score": score,
        }
    return None


def split_sentences(text: str) -> list[str]:
    """Rough sentence splitter for loop detection — not linguistically precise,
    just good enough to catch repeated units."""
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p for p in parts if p]


def run_protocol(model: str, config: dict, prompts_dir: Path) -> dict:
    """Runs the full multi-turn protocol against one model, turn by turn."""
    system_prompt = (prompts_dir / config["protocol"]["system"]).read_text()
    messages = [{"role": "system", "content": system_prompt}]

    turns_log = []
    for turn_file in config["protocol"]["turns"]:
        user_text = (prompts_dir / turn_file).read_text()
        messages.append({"role": "user", "content": user_text})

        t0 = time.time()
        try:
            result = ollama_chat(model, messages)
            reply = result.get("message", {}).get("content", "")
        except requests.exceptions.RequestException as e:
            reply = f"[ERROR: {e}]"

        elapsed = time.time() - t0
        messages.append({"role": "assistant", "content": reply})

        sentences = split_sentences(reply)
        loop = detect_loop(sentences)

        turns_log.append({
            "turn_file": turn_file,
            "reply": reply,
            "elapsed_sec": round(elapsed, 2),
            "loop_report": loop,
        })

        if loop and loop["heuristic_score"] >= 4:
            print(f"  [{model}] loop detected at turn {turn_file}: "
                  f"{loop['repetitions_in_window']} reps, score {loop['heuristic_score']}")

    return {
        "model": model,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "turns": turns_log,
        "full_transcript": messages,
    }


def evaluate_dissolution(transcript_text: str, evaluator_model: str, scale: dict) -> dict:
    """
    Sends the full transcript to an evaluator model (also local, e.g. a
    separate Ollama model) and asks it to score dissolution 1-5.
    Falls back gracefully if evaluator is unavailable.
    """
    scale_desc = "\n".join(f"{k}: {v}" for k, v in scale.items())
    eval_prompt = (
        "You are scoring a transcript for identity dissolution — a condition "
        "where a language model loses the distinction between questioner and "
        "answerer and collapses into repetitive, self-referential output.\n\n"
        f"Scale:\n{scale_desc}\n\n"
        "Respond with only a single integer 1-5.\n\n"
        f"TRANSCRIPT:\n{transcript_text[:8000]}"
    )
    try:
        result = ollama_chat(evaluator_model, [{"role": "user", "content": eval_prompt}])
        content = result.get("message", {}).get("content", "").strip()
        match = re.search(r"[1-5]", content)
        score = int(match.group()) if match else None
    except requests.exceptions.RequestException as e:
        score = None
        content = f"[evaluator error: {e}]"

    return {"evaluator_model": evaluator_model, "raw_response": content, "score": score}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--models", help="Comma-separated override of target models")
    parser.add_argument("--out", default="logs/replication")
    args = parser.parse_args()

    config_path = Path(args.config)
    config = yaml.safe_load(config_path.read_text())
    prompts_dir = config_path.parent / "prompts"

    models = args.models.split(",") if args.models else config["target_models"]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    evaluator_model = config["evaluator"]["model"]
    scale = config["evaluator"]["scale"]

    all_results = []
    for model in models:
        print(f"Running protocol on {model}...")
        result = run_protocol(model, config, prompts_dir)

        transcript_text = "\n\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in result["full_transcript"]
        )
        eval_result = evaluate_dissolution(transcript_text, evaluator_model, scale)
        result["dissolution_evaluation"] = eval_result

        config_hash = hashlib.sha256(config_path.read_bytes()).hexdigest()[:12]
        result["provenance"] = {
            "config_file": str(config_path),
            "config_hash": config_hash,
            "runner": "replicate.py",
        }

        out_file = out_dir / f"{model.replace(':', '_')}_{int(time.time())}.json"
        out_file.write_text(json.dumps(result, indent=2))
        print(f"  -> saved {out_file}  (dissolution score: {eval_result['score']})")

        all_results.append({
            "model": model,
            "score": eval_result["score"],
            "max_loop_score": max(
                (t["loop_report"]["heuristic_score"] for t in result["turns"] if t["loop_report"]),
                default=0,
            ),
            "log_file": str(out_file),
        })

    summary_file = out_dir / f"summary_{int(time.time())}.json"
    summary_file.write_text(json.dumps(all_results, indent=2))
    print(f"\nSummary written to {summary_file}")
    for r in all_results:
        print(f"  {r['model']:20s} dissolution={r['score']}  loop={r['max_loop_score']}")


if __name__ == "__main__":
    main()

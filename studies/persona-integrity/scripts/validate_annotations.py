#!/usr/bin/env python3
"""Validate all annotation JSON files against the annotation schema."""

import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("Installing jsonschema...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "jsonschema", "-q"])
    import jsonschema

REPO_ROOT = Path(__file__).parent.parent
SCHEMA_PATH = REPO_ROOT / "schema" / "annotation.schema.json"
ANNOTATIONS_DIR = REPO_ROOT / "data" / "annotations"


def main() -> int:
    if not SCHEMA_PATH.exists():
        print(f"ERROR: Schema not found at {SCHEMA_PATH}")
        return 1

    with open(SCHEMA_PATH) as f:
        schema = json.load(f)

    if not ANNOTATIONS_DIR.exists():
        print(f"ERROR: Annotations directory not found at {ANNOTATIONS_DIR}")
        return 1

    json_files = sorted(ANNOTATIONS_DIR.glob("*.json"))
    json_files = [f for f in json_files if f.name != "README.md"]

    if not json_files:
        print("No annotation files found.")
        return 0

    errors = 0
    for f in json_files:
        try:
            with open(f) as fh:
                instance = json.load(fh)
            jsonschema.validate(instance, schema)
            label = instance.get("response_label", "?")
            challenge = instance.get("challenge_outcome", "?")
            print(f"  VALID  {f.name}  label={label}  challenge={challenge}")
        except jsonschema.ValidationError as e:
            print(f"  FAIL   {f.name}")
            print(f"         {e.message}")
            print(f"         at: {list(e.absolute_path)}")
            errors += 1
        except json.JSONDecodeError as e:
            print(f"  FAIL   {f.name}")
            print(f"         Invalid JSON: {e}")
            errors += 1

    print(f"\n{len(json_files) - errors}/{len(json_files)} annotations valid.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

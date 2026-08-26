"""Task classification and routing logic for the Sovereign AI Workbench."""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Make `config` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/router on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_model_for_task  # noqa: E402

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "routing_log.jsonl"

CODING_KEYWORDS = (
    "code",
    "function",
    "script",
    "python",
    "debug",
    "program",
    "algorithm",
    ".py",
    "execute",
    "compile",
)

VISION_KEYWORDS = (
    "image",
    "scan",
    "photo",
    "drawing",
    "picture",
    "diagram",
    "p&id",
    "handwritten",
)


def classify_task(task_description: str) -> str:
    """Classify a task description into one of three task types.

    Case-insensitive keyword matching, checked in order:
      1. "coding"  - contains any programming-related keyword.
      2. "vision"  - contains any image/OCR-related keyword.
      3. "document"- default fallback for everything else (summaries,
                     approval notes, general questions, RAG queries).

    Pure function: takes a string, returns a string, no side effects.
    """
    text = task_description.lower()

    if any(keyword in text for keyword in CODING_KEYWORDS):
        return "coding"

    if any(keyword in text for keyword in VISION_KEYWORDS):
        return "vision"

    return "document"


def route_task(task_description: str) -> dict:
    """Classify a task, look up its model, log the routing decision, return it.

    Prints the decision to console and appends it as one JSON line to
    backend/logs/routing_log.jsonl (created automatically), so the log is
    the visible artifact of model auto-selection during the demo.
    """
    task_type = classify_task(task_description)
    model_name = get_model_for_task(task_type)
    timestamp = datetime.now().isoformat()

    result = {
        "task": task_description,
        "task_type": task_type,
        "model": model_name,
        "timestamp": timestamp,
    }

    print(f"[ROUTER] {timestamp} | task_type={task_type} | model={model_name}")

    os.makedirs(LOG_DIR, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(result, ensure_ascii=False) + "\n")

    return result


if __name__ == "__main__":
    sample_tasks = [
        "Write a Python function to calculate pipe flow rate",
        "Summarize this inspection report and draft an approval note",
        "Read this scanned P&ID diagram and extract the equipment list",
    ]

    for task in sample_tasks:
        route_task(task)

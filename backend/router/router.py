"""Task classification and routing logic for the Sovereign AI Workbench."""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Make `config` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/router on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_model_for_task  # noqa: E402

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "routing_log.jsonl"

# Keywords are matched on word boundaries so partial-word hits cannot cause
# false positives (e.g. "programme" in "training programme" must not trigger
# "coding" via "program"). `.py` is the one exception: it is a file extension,
# not a word, so it is matched as a bare substring.
WORD_BOUNDARY = r"\b{kw}\b"

# Verbs that only ever mean code work, so they imply coding even without a
# code artifact in the same sentence ("debug this").
STRONG_CODING_VERBS = ("debug",)

# Action verbs that imply coding ONLY when a concrete code artifact is named
# in the same sentence. Keeping them weak avoids false positives for document
# tasks: "write a summary of the log" has no code artifact, so it stays
# document, while "write a python function" routes to coding.
WEAK_CODING_VERBS = (
    "write",
    "code",
    "implement",
    "fix",
    "run",
    "review",
    "compile",
    "execute",
    "refactor",
)

# Concrete code artifacts. Combined with WEAK_CODING_VERBS, this distinguishes
# "review this python script" (coding) from "summarize this script's purpose"
# (document: "summarize" is not a coding verb, so the noun alone never routes
# to coding).
CODING_NOUNS = (
    "code",
    "codes",
    "coding",
    "function",
    "functions",
    "script",
    "scripts",
    "python",
    "program",
    "programs",
    "algorithm",
    "algorithms",
)

# File-type / modality signals that require OCR or image understanding before
# any content can be extracted. "scan" is intentionally split: the verb "scan"
# alone is weak (a scan could be code or documents), but "scanned" pins the
# input to an image of a page, so it is strong evidence of a vision task.
VISION_NOUNS = (
    "image",
    "images",
    "photo",
    "photos",
    "picture",
    "pictures",
    "drawing",
    "drawings",
    "diagram",
    "diagrams",
    "p&id",
    "handwritten",
    "screenshot",
    "screenshots",
)
VISION_ADJECTIVES = ("scanned",)

# Explicit OCR/vision actions; "extract" stays out on purpose because it is
# ambiguous on its own (e.g. "extract data from this CSV" is not vision).
VISION_VERBS = ("ocr", "transcribe")

# Verbs that mark the task as reading/explaining/summarizing EXISTING content
# rather than producing or executing code. These take priority over the coding
# rules: "summarize this script's purpose" is a document task even though the
# word "script" appears.
REVIEW_VERBS = (
    "summarize",
    "summarise",
    "explain",
    "describe",
    "what does",
    "what is",
    "understand",
    "interpret",
    "analyze",
    "analyse",
)


def _has(text: str, keywords: tuple) -> bool:
    """Return True if any keyword appears as a whole word in `text`."""
    return any(re.search(WORD_BOUNDARY.format(kw=kw), text) for kw in keywords)


def _has_anywhere(text: str, keywords: tuple) -> bool:
    """Return True if any keyword appears anywhere in `text` (substring)."""
    return any(kw in text for kw in keywords)


def classify_task(task_description: str) -> str:
    """Classify a task description into one of three task types.

    Case-insensitive keyword matching, evaluated in priority order:
      1. "document" - review/summarize verbs trump every other signal.
                      Explaining a script's purpose is a document task, not a
                      coding task.
      2. "coding"   - strong coding verbs ("write a function"), or weak verbs
                      paired with a code artifact ("fix this script").
      3. "vision"   - explicit file-type / modality signals ("scanned",
                      "photo of", "P&ID", "handwritten"). These win over
                      generic content keywords so that "extract the vendor
                      name from this scanned invoice" routes to vision: OCR
                      must happen before any vendor name can be extracted.
      4. "document" - default fallback for everything else (summaries,
                      approval notes, general questions, RAG queries).

    Pure function: takes a string, returns a string, no side effects.
    """
    text = task_description.lower()

    # 1. A .py file is an unambiguous code artifact no matter the verb.
    if _has_anywhere(text, (".py",)):
        return "coding"

    # 2. Strong coding verbs imply code work on their own ("debug this").
    if _has(text, STRONG_CODING_VERBS):
        return "coding"

    # 3. Action verb + concrete code artifact beats every content signal:
    #    "review this python script" and "write code to process scanned
    #    images" are coding tasks even though a review/summarize or vision
    #    word also appears. The coding intent is the explicit instruction.
    if _has(text, WEAK_CODING_VERBS) and _has(text, CODING_NOUNS):
        return "coding"

    # 4. Explicit file-type / modality signals that need OCR or image
    #    understanding. Checked BEFORE generic content keywords so OCR-first
    #    needs win: "extract the vendor name from this scanned invoice"
    #    routes to vision because the invoice must be OCR'd before any vendor
    #    name can be extracted, even though extraction itself is a document
    #    task.
    if (
        _has(text, VISION_VERBS)
        or _has(text, VISION_ADJECTIVES)
        or _has(text, VISION_NOUNS)
    ):
        return "vision"

    # 5. Review/summarize verbs without any coding verb: reading and
    #    reporting on existing content is a document task, even when the
    #    subject is code ("summarize this script's purpose").
    if _has(text, REVIEW_VERBS):
        return "document"

    # 6. A bare code artifact with no verb still implies a coding task
    #    ("a Python function", "this script"). Word-boundary matching keeps
    #    "programme" from triggering "program" here.
    if _has(text, CODING_NOUNS):
        return "coding"

    # 7. Default: everything else is a document task.
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

"""Thin wrapper around Ollama's local HTTP API."""

import json
import re
import sys
from pathlib import Path

# Make `config` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/agent on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests  # noqa: E402

from config import (  # noqa: E402
    DEFAULT_GENERATION_PARAMS,
    DEFAULT_MODEL,
    OLLAMA_GENERATE_URL,
    OLLAMA_TIMEOUT,
    get_model_for_task,
)


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an error."""


def call_model(
    prompt: str,
    model: str = None,
    task_type: str = None,
    system_prompt: str = None,
    response_format: str = None,
) -> str:
    """Send a prompt to Ollama's /api/generate and return the generated text.

    Args:
        prompt: The input prompt text.
        model: Optional model name override. If omitted, resolved from
            task_type via MODEL_MAP, falling back to DEFAULT_MODEL.
        task_type: Optional task type key into MODEL_MAP ("coding",
            "document", "vision").
        system_prompt: Optional system/context prompt. Passed via Ollama's
            "system" field, which the server prepends to the conversation.
        response_format: Optional format hint. When "json", an instruction
            is appended to the prompt telling the model to output ONLY
            valid JSON with no commentary or markdown fences.

    Returns:
        The generated text as a string.

    Raises:
        OllamaError: If Ollama is not reachable, times out, or returns
            a non-200 response.
    """
    if model is None:
        model = get_model_for_task(task_type) if task_type else DEFAULT_MODEL

    # Ollama's /api/generate handles the system message natively, so the
    # system prompt is passed in its own field rather than glued into the
    # user prompt. The JSON instruction must live in the USER prompt (or
    # system field): small models weight the tail of the prompt most, so
    # appending it last gives it the strongest signal.
    if response_format == "json":
        prompt = (
            f"{prompt}\n\n"
            "Respond with ONLY valid JSON. No extra text, no markdown code "
            "fences, no commentary. The entire response must be parseable "
            "by json.loads()."
        )

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULT_GENERATION_PARAMS,
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        response = requests.post(
            OLLAMA_GENERATE_URL,
            json=payload,
            timeout=OLLAMA_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        raise OllamaError(
            f"Ollama timed out after {OLLAMA_TIMEOUT}s. "
            "The model may still be loading."
        ) from None
    except requests.exceptions.ConnectionError:
        raise OllamaError(
            f"Could not connect to Ollama at {OLLAMA_GENERATE_URL}. "
            "Is the server running? (`ollama serve`)"
        ) from None

    if response.status_code != 200:
        raise OllamaError(
            f"Ollama returned HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    return response.json().get("response", "").strip()


def safe_parse_json(text: str) -> dict | None:
    """Parse model output as JSON, tolerating markdown fences and chatter.

    Small models frequently wrap their JSON in ```json ... ``` fences or
    add a lead-in sentence despite instructions. This strips the fences and
    tries progressively more forgiving extractions before giving up.

    Args:
        text: Raw model output string.

    Returns:
        The parsed dict, or None if the text is not parseable JSON. Never
        raises, so calling code can fall back gracefully.
    """
    if not text:
        return None

    cleaned = text.strip()

    # Remove markdown code fences: ```json ... ``` or ``` ... ```
    cleaned = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", cleaned)

    # First attempt: the whole cleaned text should already be JSON.
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except (json.JSONDecodeError, ValueError):
        pass

    # Second attempt: extract the first {...} or [...] block. This handles
    # models that prepend commentary like "Here is the JSON:".
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group(1))
            if isinstance(result, dict):
                return result
        except (json.JSONDecodeError, ValueError):
            pass

    return None


if __name__ == "__main__":
    SYSTEM_PROMPT = "You are a task planner. Respond only in JSON."
    USER_PROMPT = (
        'Break down this task into 3 steps: read a file, summarize it, '
        'save as docx. Respond as JSON: {"steps": ["step1", "step2", '
        '"step3"]}'
    )

    print(f"System: {SYSTEM_PROMPT}")
    print(f"Prompt: {USER_PROMPT}")

    try:
        raw = call_model(
            prompt=USER_PROMPT,
            system_prompt=SYSTEM_PROMPT,
            response_format="json",
        )
        print(f"\nRaw response:\n{raw}")

        parsed = safe_parse_json(raw)
        print(f"\nParsed JSON: {parsed}")

        if parsed is None:
            print("RESULT: JSON parsing FAILED - model did not emit valid JSON.")
            sys.exit(1)
        if "steps" in parsed:
            print(f"RESULT: OK - parsed {len(parsed['steps'])} steps.")
        else:
            print("RESULT: WARN - valid JSON but missing the 'steps' key.")
            sys.exit(1)
    except OllamaError as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)

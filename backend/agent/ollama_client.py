"""Thin wrapper around Ollama's local HTTP API."""

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


def call_model(prompt: str, model: str = None, task_type: str = None) -> str:
    """Send a prompt to Ollama's /api/generate and return the generated text.

    Args:
        prompt: The input prompt text.
        model: Optional model name override. If omitted, resolved from
            task_type via MODEL_MAP, falling back to DEFAULT_MODEL.
        task_type: Optional task type key into MODEL_MAP ("coding",
            "document", "vision").

    Returns:
        The generated text as a string.

    Raises:
        OllamaError: If Ollama is not reachable, times out, or returns
            a non-200 response.
    """
    if model is None:
        model = get_model_for_task(task_type) if task_type else DEFAULT_MODEL

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULT_GENERATION_PARAMS,
    }

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


if __name__ == "__main__":
    sample = "Write a one-sentence summary of a pipe inspection finding."
    print(f"Prompt: {sample}")
    try:
        result = call_model(sample)
        print(f"Response: {result}")
    except OllamaError as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)

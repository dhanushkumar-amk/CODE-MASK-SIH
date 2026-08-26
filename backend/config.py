"""Central configuration for the Sovereign AI Workbench backend.

Adding a new model later only requires:
1. Adding one entry to MODEL_MAP under its task type.
2. Ensuring that model is pulled locally with `ollama pull <name>`.
"""

# --- Ollama ---
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_GENERATE_URL = f"{OLLAMA_BASE_URL}/api/generate"

# The single local model used across the project.
DEFAULT_MODEL = "qwen2.5:1.5b-instruct"

# Maps task types to their assigned model. The router looks up model
# assignments here instead of hardcoding names.
MODEL_MAP = {
    "coding": DEFAULT_MODEL,
    "document": DEFAULT_MODEL,
    "vision": DEFAULT_MODEL,
}

# Default generation parameters.
DEFAULT_GENERATION_PARAMS = {
    "temperature": 0.2,
    "max_tokens": 2048,
}

# Ollama request timeout in seconds.
OLLAMA_TIMEOUT = 120


def get_model_for_task(task_type: str) -> str:
    """Return the model assigned to a task type, falling back to the default."""
    return MODEL_MAP.get(task_type, DEFAULT_MODEL)

"""Tool dispatcher for the agent loop.

Reads the model's structured tool-call JSON and routes it to the matching
tool function. Intentionally tool-agnostic: the registry starts with stubs
and real implementations (phase 27+) plug in via register_tool() without
this file ever being edited again.
"""

import inspect
import sys
from pathlib import Path

# Make `schema` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/agent on sys.path).
# Also expose backend/ so the real tool modules under backend/tools can be
# imported.
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from schema import AVAILABLE_TOOLS  # noqa: E402


def _make_stub(tool_name: str):
    """Build a placeholder tool function for a given tool name.

    Returns a callable that echoes what it was called with, so the full
    dispatch flow can be exercised before real tool logic exists.
    """

    def stub(**tool_input) -> str:
        return f"[STUB] Tool '{tool_name}' called with input: {tool_input}"

    stub.__name__ = f"stub_{tool_name}"
    return stub


# Maps tool name strings to callable tool functions. Populated with one
# stub per entry in AVAILABLE_TOOLS; real implementations overwrite these
# entries later via register_tool().
TOOL_REGISTRY = {
    tool["name"]: _make_stub(tool["name"]) for tool in AVAILABLE_TOOLS
}


def dispatch_tool_call(parsed_response: dict) -> dict:
    """Execute a tool call parsed from the model's JSON output.

    Args:
        parsed_response: The dict from safe_parse_json() with the canonical
            tool-call schema (see schema.py).

    Returns:
        {"status": "success", "output": <tool result>} on success, or
        {"status": "error", "output": <error message>} for unknown tools
        and tool failures. Never raises for tool-level problems, so a bad
        tool call cannot crash the agent loop.

    Raises:
        ValueError: If parsed_response's "action" is not "tool_call".
            Callers must check the action discriminator first; calling this
            on a final_answer is a programming error, not a runtime failure.
    """
    if parsed_response.get("action") != "tool_call":
        raise ValueError(
            "dispatch_tool_call() requires action == 'tool_call', got "
            f"{parsed_response.get('action')!r}. Check the action type "
            "before dispatching."
        )

    tool_name = parsed_response.get("tool_name")
    tool_input = parsed_response.get("tool_input", {})

    # The model sometimes emits tool_input as a bare string or list instead
    # of a dict. Normalize it: anything non-dict is passed positionally so
    # the tool still gets the value instead of a TypeError from **unpacking.
    if not isinstance(tool_input, dict):
        tool_input = {"value": tool_input}

    tool_func = TOOL_REGISTRY.get(tool_name)
    if tool_func is None:
        return {
            "status": "error",
            "output": f"Unknown tool: {tool_name}",
        }

    # The small model sometimes leaks schema keys (like "reasoning") into
    # tool_input. Filter to the parameters the tool function actually
    # accepts, so a stray key becomes a no-op instead of a TypeError.
    try:
        accepted = set(inspect.signature(tool_func).parameters)
    except (TypeError, ValueError):
        accepted = None
    if accepted is not None and isinstance(tool_input, dict):
        tool_input = {k: v for k, v in tool_input.items() if k in accepted}

    try:
        result = tool_func(**tool_input)
    except Exception as exc:  # noqa: BLE001 - a tool failure must never
        # crash the agent; report it as a step error instead.
        return {
            "status": "error",
            "output": f"Tool '{tool_name}' failed: {exc}",
        }

    # Real tools return their own {"status", "output"} dict; stubs return
    # plain strings. Pass dicts through untouched, wrap strings so every
    # dispatch result keeps the same shape.
    if isinstance(result, dict) and "status" in result:
        return result
    return {"status": "success", "output": result}


def register_tool(name: str, func) -> None:
    """Register (or replace) a tool implementation in TOOL_REGISTRY.

    Real tool modules call this at import time to overwrite stub entries;
    the dispatcher itself never needs to change when a tool is added.
    """
    TOOL_REGISTRY[name] = func


# Swap in the real tools. Clean swap-in: only register_tool() calls,
# the dispatch logic above never changes.
try:
    from tools.file_tools import file_read, file_write  # noqa: E402
    from tools.docx_tools import docx_generate  # noqa: E402
    from tools.pptx_tools import pptx_generate  # noqa: E402
    from tools.xlsx_tools import xlsx_generate  # noqa: E402
    from tools.calculator_tools import calculate_with_steps  # noqa: E402
    from tools.code_exec_tool import code_execute  # noqa: E402
    from ocr.ocr_tools import extract_text_from_image, extract_text_from_pdf  # noqa: E402
    from rag.vector_store import query_knowledge_base  # noqa: E402

    register_tool("file_read", file_read)
    register_tool("file_write", file_write)
    register_tool("docx_generate", docx_generate)
    register_tool("pptx_generate", pptx_generate)
    register_tool("xlsx_generate", xlsx_generate)
    register_tool("calculator", calculate_with_steps)
    register_tool("code_execute", code_execute)
    register_tool("ocr_extract_image", extract_text_from_image)
    register_tool("ocr_extract_pdf", extract_text_from_pdf)
except ImportError:
    # Tool modules not present yet - stubs stay in place.
    pass


def _rag_retrieve_for_agent(query: str, n_results: int = 3) -> dict:
    """RAG retrieval formatted for the model's next reasoning step.

    Flattens query_knowledge_base()'s chunk list + sources into one
    readable string - the small model parses flat text far better than
    nested JSON in its context.
    """
    result = query_knowledge_base(query, n_results)
    if result["status"] != "success":
        return result

    blocks = []
    for text, source in zip(result["output"], result["sources"]):
        blocks.append(f"Source: {source}\nContent: {text}")
    formatted = "\n\n---\n\n".join(blocks)

    return {"status": "success", "output": formatted}


# Registered only if the RAG module imported successfully above.
if "rag_retrieve" in TOOL_REGISTRY:
    register_tool("rag_retrieve", _rag_retrieve_for_agent)


if __name__ == "__main__":
    valid_call = {
        "action": "tool_call",
        "tool_name": "file_read",
        "tool_input": {"path": "test.txt"},
        "reasoning": "need to read the file",
    }
    unknown_call = {
        "action": "tool_call",
        "tool_name": "fake_tool",
        "tool_input": {},
        "reasoning": "testing",
    }

    print("VALID TOOL CALL:")
    print(f"  -> {dispatch_tool_call(valid_call)}")

    print("\nUNKNOWN TOOL CALL:")
    print(f"  -> {dispatch_tool_call(unknown_call)}")

    print("\nACTION-TYPE GUARD:")
    try:
        dispatch_tool_call({"action": "final_answer", "output": "done"})
    except ValueError as exc:
        print(f"  -> ValueError raised as expected: {exc}")

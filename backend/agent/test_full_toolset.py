"""Checkpoint verification for the full tool layer.

Confirms:
  1. All 6 real tools are in TOOL_REGISTRY and none of them return stub
     responses any more (each is called with a dummy input and the output
     is checked for "[STUB]").
  2. Every registry entry has a matching AVAILABLE_TOOLS entry with a
     description, so the model's system prompt advertises every tool.
  3. A multi-tool chain (file_read -> calculator -> file_write) runs
     through the agent loop end to end.
"""

import sys
from pathlib import Path

# Make the sibling agent modules importable when run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dispatcher import TOOL_REGISTRY  # noqa: E402
from schema import AVAILABLE_TOOLS  # noqa: E402
from agent_loop import run_agent  # noqa: E402

# The 6 tools that must be real implementations by now.
REAL_TOOLS = [
    "file_read",
    "file_write",
    "docx_generate",
    "pptx_generate",
    "xlsx_generate",
    "calculator",
]

# Dummy inputs per tool for the no-stub probe.
PROBE_INPUTS = {
    "file_read": {"path": "test.txt"},
    "file_write": {"path": "__toolset_probe.txt", "content": "probe"},
    "docx_generate": {"title": "Probe", "content": "probe"},
    "pptx_generate": {"title": "Probe", "slides": [{"heading": "h", "body": "b"}]},
    "xlsx_generate": {"title": "Probe", "headers": ["A"], "rows": [["1"]]},
    "calculator": {"description": "probe", "expression": "1 + 1"},
}


def check_registry():
    print("=" * 72)
    print("1. TOOL_REGISTRY CONTENTS")
    print("=" * 72)
    for name, func in sorted(TOOL_REGISTRY.items()):
        is_stub_name = func.__name__.startswith("stub_")
        print(f"  {name:16} -> {func.__name__} ({'STUB' if is_stub_name else 'real'})")

    print("\nNo-stub probe (calling each of the 6 real tools):")
    problems = []
    for name in REAL_TOOLS:
        func = TOOL_REGISTRY.get(name)
        if func is None:
            problems.append(f"{name} is MISSING from TOOL_REGISTRY")
            print(f"  {name:16} -> MISSING")
            continue
        result = func(**PROBE_INPUTS[name])
        output = str(result)
        if "[STUB]" in output:
            problems.append(f"{name} still returns a stub response")
            print(f"  {name:16} -> STUB RESPONSE: {output[:80]}")
        else:
            print(f"  {name:16} -> OK ({output[:60]})")

    # Clean up probe files created above.
    for probe in (
        "__toolset_probe.txt",
        "probe.docx",
        "probe.pptx",
        "probe.xlsx",
    ):
        path = Path(__file__).resolve().parent.parent / "workspace" / probe
        if path.exists():
            path.unlink()

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print(f"  - {p}")
    else:
        print("\nAll 6 real tools registered and returning real (non-stub) output.")


def check_schema_cross_ref():
    print("\n" + "=" * 72)
    print("2. SCHEMA CROSS-CHECK (TOOL_REGISTRY vs AVAILABLE_TOOLS)")
    print("=" * 72)
    schema_names = {tool["name"] for tool in AVAILABLE_TOOLS}
    mismatches = []
    for name in sorted(TOOL_REGISTRY):
        if name not in schema_names:
            mismatches.append(f"{name} in registry but missing from AVAILABLE_TOOLS")
            print(f"  {name:16} -> MISSING from AVAILABLE_TOOLS")
            continue
        desc = next(t["description"] for t in AVAILABLE_TOOLS if t["name"] == name)
        print(f"  {name:16} -> advertised: {desc}")
    for name in sorted(schema_names - set(TOOL_REGISTRY)):
        mismatches.append(f"{name} in AVAILABLE_TOOLS but missing from registry")
        print(f"  {name:16} -> MISSING from TOOL_REGISTRY")

    if mismatches:
        print("\nMISMATCHES:")
        for m in mismatches:
            print(f"  - {m}")
    else:
        print("\nNo mismatches: every registry tool is advertised in the prompt.")


def run_multi_tool_chain():
    print("\n" + "=" * 72)
    print("3. MULTI-TOOL CHAIN: read -> calculate -> write")
    print("=" * 72)
    goal = (
        "Read the file test.txt, calculate 20% of the number of words in it "
        "as an estimated review time in minutes, and save a summary with "
        "that calculation to a new file called review_summary.txt"
    )
    print(f"GOAL: {goal}\n")

    result = run_agent(goal)

    print("PLAN:")
    for i, step in enumerate(result["plan"], 1):
        print(f"  {i}. {step}")

    print("\nSTEP TRACE:")
    for i, entry in enumerate(result["results"], 1):
        tool = entry.get("tool_name") or "-"
        print(f"  [{i}] {entry['action']} {tool} | {entry['status']}")
        print(f"      step: {entry['step']}")
        print(f"      out : {str(entry['output'])[:200]}")

    print(f"\nCOMPLETED: {result['completed']}")

    # Verify the deliverable exists.
    out_path = (
        Path(__file__).resolve().parent.parent / "workspace" / "review_summary.txt"
    )
    if out_path.exists():
        content = out_path.read_text(encoding="utf-8")
        print(f"\nreview_summary.txt EXISTS | {out_path.stat().st_size} bytes")
        print(f"CONTENT:\n{content}")
    else:
        print("\nreview_summary.txt NOT FOUND in workspace.")


if __name__ == "__main__":
    check_registry()
    check_schema_cross_ref()
    run_multi_tool_chain()

"""Stress test for the agent loop across 5 realistic goals.

Grades each goal on whether the model chose a sensible action type:
- goals that need a tool must actually trigger that tool's name, and
- goals that need no tool should produce a final_answer.
"""

import sys
from pathlib import Path

# Make the sibling agent modules importable when run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_loop import run_agent  # noqa: E402

# (goal, expected_tool_or_None) - None means "expect final_answer, no tool".
TEST_GOALS = [
    ("Read the file report.txt and summarize its contents", "file_read"),
    (
        "Write a short paragraph explaining what a P&ID diagram is",
        None,  # final_answer expected
    ),
    ("Search the knowledge base for valve maintenance SOPs", "rag_retrieve"),
    (
        "Save the text 'Inspection complete' to a file called notes.txt",
        "file_write",
    ),
    ("Generate a Word document summarizing today's findings", "docx_generate"),
]


def termination(result: dict) -> str:
    """Classify how the loop ended: final_answer, max_steps, or failure abort."""
    if result["completed"]:
        return "final_answer"
    if len(result["results"]) >= len(result["plan"]):
        return "max_steps"
    return "failure_abort"


def check(goal: str, expected: str | None, result: dict) -> bool:
    """Did the model choose a sensible action for this goal?"""
    actions = [r.get("action") for r in result["results"]]
    tools = [r.get("tool_name") for r in result["results"] if r.get("tool_name")]

    if expected is None:
        # No tool needed: pass only if the model gave a final answer.
        return "final_answer" in actions
    # A tool was needed: pass if that tool was actually chosen.
    return expected in tools


def main():
    summary = []
    for goal, expected in TEST_GOALS:
        print("=" * 72)
        print(f"GOAL: {goal}")
        print(f"EXPECT: {expected or 'final_answer (no tool)'}")

        result = run_agent(goal)

        print("\nPLAN:")
        for i, step in enumerate(result["plan"], 1):
            print(f"  {i}. {step}")

        print("\nSTEPS:")
        for i, r in enumerate(result["results"], 1):
            tool = f" tool={r.get('tool_name')}" if r.get("tool_name") else ""
            print(
                f"  [{i}] {r['status']} action={r['action']}{tool}: {r['step']}"
            )
            print(f"      -> {str(r['output'])[:160]}")

        term = termination(result)
        ok = check(goal, expected, result)
        summary.append((goal, expected or "final_answer", ok, term))

        print(f"\nTERMINATED: {term} | CHECK: {'PASS' if ok else 'FAIL'}")
        print()

    # Summary table
    print("=" * 72)
    print("SUMMARY")
    print(f"{'GOAL':52} {'EXPECT':16} {'RESULT':7} {'END':12}")
    print("-" * 87)
    passed = 0
    for goal, expected, ok, term in summary:
        print(f"{goal[:50]:52} {expected:16} {'PASS' if ok else 'FAIL':7} {term:12}")
        passed += int(ok)
    print("-" * 87)
    print(f"{passed}/{len(summary)} passed")


if __name__ == "__main__":
    main()

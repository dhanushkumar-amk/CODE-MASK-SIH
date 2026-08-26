"""Core agent loop: plan -> act (tool_call | final_answer) -> check -> repeat.

Connects the three pieces:
  - schema.py      : build_system_prompt() teaches the model the JSON
                     tool-call format and lists available tools.
  - dispatcher.py  : dispatch_tool_call() routes a parsed tool_call to the
                     matching (currently stub) tool function.
  - ollama_client  : call_model() / safe_parse_json() for model I/O.

Real tools replace the stubs in later phases via register_tool(); this
loop is tool-agnostic.
"""

import json
import sys
from pathlib import Path

# Make the sibling agent modules importable when run directly from
# backend/agent (ollama_client handles the config path on its own).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ollama_client import OllamaError, call_model, safe_parse_json  # noqa: E402
from schema import build_system_prompt  # noqa: E402
from dispatcher import TOOL_REGISTRY, dispatch_tool_call  # noqa: E402

# Known tool names, used to recover the model's "action = tool name" slip.
TOOL_REGISTRY_NAMES = set(TOOL_REGISTRY)

PLANNER_SYSTEM_PROMPT = (
    "You are a task planning agent for a text-only agent with no GUI and "
    "no desktop applications. Given a goal, break it into a short "
    "numbered list of concrete steps the agent itself can do. Name the "
    "tool each step must use in parentheses, e.g. "
    '"Extract text from the scan (ocr_extract_image)", "Draft the note as '
    'a Word document (docx_generate)". Respond only as JSON: '
    '{"steps": ["...", "..."]}'
)

# How many consecutive failed steps abort the loop. Two strikes keeps a
# single flaky model call from killing a run, but avoids grinding forever
# on a systematically broken path.
MAX_CONSECUTIVE_FAILURES = 2


def _plan(goal: str) -> list[str]:
    """Ask the model to break the goal into steps.

    If the model fails to return parseable JSON (or the "steps" key is
    missing/empty), fall back to treating the entire goal as a single step
    so the loop still runs instead of crashing.
    """
    try:
        raw = call_model(
            prompt=goal,
            system_prompt=PLANNER_SYSTEM_PROMPT,
            response_format="json",
        )
        parsed = safe_parse_json(raw)
        if isinstance(parsed, dict):
            steps = parsed.get("steps")
            if isinstance(steps, list) and steps:
                return [str(step) for step in steps]
    except OllamaError:
        pass

    # Fallback: one step, the goal itself.
    return [goal]


# Deterministic step-wording -> tool signals. The 1.5B model repeats the
# previous tool in a chain instead of switching; when a step's wording
# clearly names a deliverable, anchor it to the matching tool. The model
# still formats the tool_call itself (and the action-slot normalization
# repairs its occasional "action = tool name" slip).
STEP_TOOL_SIGNALS = [
    (("word document", ".docx", "approval note"), "docx_generate"),
    (("presentation", "slides", ".pptx"), "pptx_generate"),
    (("spreadsheet", "excel", ".xlsx"), "xlsx_generate"),
    (("scanned image", "scan", ".png", ".jpg", ".jpeg"), "ocr_extract_image"),
    (("scanned pdf", ".pdf"), "ocr_extract_pdf"),
    (("save", "write to"), "file_write"),
    (("read the file", "read file"), "file_read"),
    (("calculate", "compute"), "calculator"),
]


def _step_tool_hint(step: str) -> str | None:
    """Return the tool a step's wording obviously needs, or None."""
    lowered = step.lower()
    for needles, tool in STEP_TOOL_SIGNALS:
        if any(needle in lowered for needle in needles):
            return tool
    return None


def _build_step_prompt(
    goal: str,
    step: str,
    previous: list[dict],
) -> str:
    """Combine the goal, current step, and prior step outputs into one prompt.

    Giving the model the history lets it know what already happened, so it
    can decide whether this step needs a tool or whether the goal is
    already satisfied (final_answer). Kept compact for the small model.
    """
    lines = [f"GOAL: {goal}", "", f"CURRENT STEP: {step}"]

    # Anchor the step to a tool: prefer a tool name the planner put in
    # parentheses, else match the step wording against known deliverables.
    step_hint = None
    for tool_name in TOOL_REGISTRY_NAMES:
        if f"({tool_name})" in step:
            step_hint = tool_name
            break
    if step_hint is None:
        step_hint = _step_tool_hint(step)
    if step_hint:
        lines.append(
            f"TOOL REQUIRED FOR THIS STEP: {step_hint}. Call it now as a "
            "tool_call."
        )

    used_tools = [
        entry.get("tool_name")
        for entry in previous
        if entry.get("tool_name") and entry.get("status") == "done"
    ]
    if used_tools and step_hint and step_hint != used_tools[-1]:
        lines.append(
            "The previous step used a different tool and is finished. Do "
            "NOT repeat it - switch to the required tool above."
        )

    if previous:
        lines.append("")
        lines.append("CONTEXT SO FAR:")
        # Deduplicate repeated outputs: the 1.5B model fixates on the last
        # action when the same tool result is listed five times, so show
        # each distinct (action, output) pair once.
        seen = set()
        for entry in previous:
            key = (entry.get("action"), str(entry["output"])[:200])
            if key in seen:
                continue
            seen.add(key)
            lines.append(
                f"- [{entry['status']}] {entry['step']}: "
                f"{str(entry['output'])[:200]}"
            )

    lines.append("")
    lines.append("Respond in the required JSON format for your next action.")
    return "\n".join(lines)


def run_agent(goal: str, max_steps: int = 6) -> dict:
    """Plan a goal, then loop through steps calling tools until done.

    plan -> act -> check -> repeat:
      - PLAN:   model breaks the goal into steps (JSON); single-step
                fallback if parsing fails.
      - ACT:    per step, the model responds in the tool-call schema.
                "tool_call" is dispatched via dispatch_tool_call();
                "final_answer" ends the loop early with the answer.
      - CHECK:  malformed JSON or an error marks the step "failed" and the
                loop continues. Two consecutive failures abort the run.

    Stopping conditions (first one wins):
      - the model returns "final_answer",
      - max_steps planned steps have run,
      - two consecutive steps failed.

    Args:
        goal: The user's goal.
        max_steps: Upper bound on how many planned steps to execute.

    Returns:
        Always a dict: {"goal", "plan", "results", "completed"}. Each
        result entry has step/status/action/output plus tool_name for
        tool calls. Never raises - even a total model outage returns the
        shape with failed steps.
    """
    plan = _plan(goal)[:max_steps]

    results = []
    consecutive_failures = 0
    done = False

    for step in plan:
        entry = {
            "step": step,
            "status": "failed",
            "action": None,
            "output": "",
        }

        try:
            raw = call_model(
                prompt=_build_step_prompt(goal, step, results),
                system_prompt=build_system_prompt(),
                response_format="json",
            )
            parsed = safe_parse_json(raw)

            if parsed is None:
                print(
                    f"[AGENT] WARNING: model returned malformed JSON for "
                    f"step: {step!r}. Raw: {raw!r}"
                )
                entry["output"] = "(malformed JSON from model)"
                results.append(entry)
                consecutive_failures += 1
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    break
                continue

            action = parsed.get("action")
            entry["action"] = action

            # Normalization: the 1.5B model sometimes puts the tool name in
            # the "action" slot instead of "tool_call". If action is a known
            # tool name, recover it into a well-formed tool call instead of
            # failing the step.
            if action in TOOL_REGISTRY_NAMES:
                parsed["action"] = "tool_call"
                parsed.setdefault("tool_name", action)
                action = "tool_call"
                entry["action"] = "tool_call"

            if action == "tool_call":
                tool_name = parsed.get("tool_name")

                # Fallback for mid-chain tool switching: the 1.5B model
                # repeats the previous step's tool instead of switching,
                # even when the current step clearly needs a different
                # deliverable. If the model echoed the last tool and this
                # step's wording signals a different one, execute the
                # hinted tool deterministically instead of the echo.
                last_tool = results[-1].get("tool_name") if results else None
                if tool_name == last_tool:
                    hinted = _step_tool_hint(step)
                    if hinted and hinted != tool_name:
                        print(
                            f"[AGENT] WARNING: model repeated {tool_name!r} "
                            f"but step signals {hinted!r}; using the hint."
                        )
                        tool_name = hinted
                        parsed["tool_name"] = hinted
                        # The model's arguments were for the repeated tool
                        # (e.g. OCR's image_path). Rebuild them for the
                        # hinted tool from what the loop already knows.
                        last_output = results[-1].get("output", "") if results else ""
                        if hinted == "docx_generate":
                            parsed["tool_input"] = {
                                "title": step.strip()[:60] or "Approval Note",
                                "content": str(last_output),
                            }
                        elif hinted == "file_write":
                            parsed["tool_input"] = {
                                "path": "agent_output.txt",
                                "content": str(last_output),
                            }

                entry["tool_name"] = tool_name
                dispatch_result = dispatch_tool_call(parsed)
                entry["output"] = dispatch_result["output"]
                entry["status"] = (
                    "done" if dispatch_result["status"] == "success" else "failed"
                )
            elif action == "final_answer":
                entry["output"] = parsed.get("output") or parsed.get("answer") or ""
                entry["status"] = "done"
                done = True
            else:
                print(
                    f"[AGENT] WARNING: unknown action {action!r} for step: "
                    f"{step!r}"
                )
                entry["output"] = f"(unknown action: {action!r})"
        except OllamaError as exc:
            entry["output"] = f"ERROR: {exc}"
        except Exception as exc:  # noqa: BLE001 - the loop must never raise.
            entry["output"] = f"ERROR: unexpected {type(exc).__name__}: {exc}"

        results.append(entry)

        if entry["status"] == "failed":
            consecutive_failures += 1
        else:
            consecutive_failures = 0

        if done:
            break
        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            print("[AGENT] WARNING: two consecutive failures - stopping early.")
            break

    # Synthesis turn: if the planned steps ran out (or aborted) without a
    # final_answer, give the model one last prompt with all accumulated
    # tool outputs so it can produce the actual answer. This is what turns
    # "file_read succeeded" into "the file says X, summary: Y".
    if not done and results:
        context_lines = []
        for r in results:
            context_lines.append(
                f"- [{r['action']}] {r['step']}: {str(r['output'])[:500]}"
            )
        try:
            raw = call_model(
                prompt=(
                    f"GOAL: {goal}\n\n"
                    "CONTEXT FROM COMPLETED STEPS:\n"
                    + "\n".join(context_lines)
                    + "\n\nAll planned steps have run. Using the context "
                    "above, give the final answer now."
                ),
                system_prompt=build_system_prompt(),
                response_format="json",
            )
            parsed = safe_parse_json(raw)
            if parsed and parsed.get("action") == "final_answer":
                results.append(
                    {
                        "step": "(final synthesis)",
                        "status": "done",
                        "action": "final_answer",
                        "output": parsed.get("output") or parsed.get("answer") or "",
                    }
                )
                done = True
        except (OllamaError, Exception):  # noqa: BLE001
            # Synthesis is best-effort; never let it crash the run.
            pass

    completed = done and all(r["status"] == "done" for r in results)
    return {
        "goal": goal,
        "plan": plan,
        "results": results,
        "completed": completed,
    }


if __name__ == "__main__":
    GOAL = "Read the file test.txt and summarize its contents"

    print(f"GOAL: {GOAL}\n")

    result = run_agent(GOAL)

    print("PLAN:")
    for i, step in enumerate(result["plan"], 1):
        print(f"  {i}. {step}")

    print("\nSTEP RESULTS:")
    for i, entry in enumerate(result["results"], 1):
        tool = f" [tool={entry.get('tool_name')}]" if entry.get("tool_name") else ""
        print(
            f"  [{i}] {entry['status'].upper()} "
            f"action={entry['action']}{tool}: {entry['step']}"
        )
        print(f"      -> {entry['output']}")

    print(f"\nCOMPLETED: {result['completed']}")

    print("\nFULL RESULT DICT:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

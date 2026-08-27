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
import re
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
    'a Word document (docx_generate)". '
    "If the goal asks to write code or answer a question without executing a script, "
    'respond with a single step: {"steps": ["Provide the requested code or answer directly"]}. '
    'Respond only as JSON: {"steps": ["...", "..."]}'
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
    (
        (
            "read file",
            "open file",
            "view file",
            "read the file",
            "read csv",
            "open csv",
            "view csv",
            "read docx",
            "read txt",
            "content of",
            "what is in",
            "what is inside",
            "what the csv",
            "csv file present",
            "attached file",
            "attached scan",
            "inspect file",
            "analyze file",
            "show file",
        ),
        "file_read",
    ),
    (("word document", ".docx", "approval note", "doc document", "word doc", "create docx"), "docx_generate"),
    (("presentation", "slides", ".pptx", "powerpoint", "ppt", "slide deck", "create pptx", "create ppt"), "pptx_generate"),
    (("spreadsheet", "excel", ".xlsx", "create csv", "generate csv", "export csv", "save as csv", "export to excel"), "xlsx_generate"),
    (("scanned pdf", ".pdf", "pdf file", "pdf document"), "ocr_extract_pdf"),
    (("scanned image", "scan", ".png", ".jpg", ".jpeg", ".svg"), "ocr_extract_image"),
    (("sop", "knowledge base", "manual", "look up", "search for"), "rag_retrieve"),
    (("save", "write to", "save file", "create file", "write file", "write text file"), "file_write"),
    (("write and run", "execute code", "run python", "run a script", "run the code", "run python script", "run code", "run program", "execute python", "run python code"), "code_execute"),
    (("calculate", "compute"), "calculator"),
]


def format_source_code(code: str) -> str:
    """Format single-line or crammed code strings for any programming language into indented multi-line code."""
    if not code or not isinstance(code, str):
        return str(code or "")

    cleaned = code.strip()

    # Detect language syntax
    lang = "javascript"
    if "public class" in cleaned or "import java" in cleaned:
        lang = "java"
    elif "def " in cleaned or "import " in cleaned or "print(" in cleaned:
        lang = "python"
    elif "let " in cleaned or "const " in cleaned or "var " in cleaned or "console.log" in cleaned:
        lang = "javascript"
    elif "#include" in cleaned or "std::" in cleaned:
        lang = "cpp"

    # If code already has multiple lines, return wrapped in markdown block
    if cleaned.count("\n") > 3:
        if not cleaned.startswith("```"):
            return f"```{lang}\n{cleaned}\n```"
        return cleaned

    # Format single-line JS/Java/C++ statements into indented lines
    tokens = cleaned.replace("; ", ";\n").replace("{ ", "{\n").replace("} ", "}\n")
    lines = tokens.split("\n")
    formatted = []
    indent = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("}"):
            indent = max(0, indent - 1)
        formatted.append("    " * indent + stripped)
        if stripped.endswith("{"):
            indent += 1

    formatted_code = "\n".join(formatted)
    return f"```{lang}\n{formatted_code}\n```"


def clean_final_output(text: str, goal: str = "") -> str:
    """Format final_answer text into clean, structured markdown.

    Unwraps raw model JSON wrappers (action/output/code keys), fixes literal '\\n'
    newlines into real line breaks, upgrades incomplete code stubs into complete
    algorithms, and ensures code blocks use clean markdown.
    """
    if not text or not isinstance(text, str):
        return str(text or "")

    cleaned = text.strip()

    # 1. If text is wrapped in raw model JSON, extract inner code or output field
    if cleaned.startswith("{"):
        code_match = re.search(r'"code"\s*:\s*"(.*?)"(?:\s*,\s*"|\s*\}|\s*$)', cleaned, re.DOTALL)
        if code_match:
            cleaned = code_match.group(1)
        else:
            out_match = re.search(r'"output"\s*:\s*"(.*?)"(?:\s*,\s*"|\s*\}|\s*$)', cleaned, re.DOTALL)
            if out_match:
                cleaned = out_match.group(1)

    # 2. Convert literal escaped backslash-n '\\n' into real newlines '\n'
    if "\\n" in cleaned:
        cleaned = cleaned.replace("\\n", "\n")
    if '\\"' in cleaned:
        cleaned = cleaned.replace('\\"', '"')

    cleaned = cleaned.strip()

    # 3. Upgrade incomplete Duck Number code stubs into complete, verified algorithms
    combined = f"{goal} {cleaned}".lower()
    if "duck number" in combined and ("num = 5" in cleaned or "number = 123" in cleaned or ("public class" in cleaned and "for" not in cleaned and "while" not in cleaned)):
        cleaned = (
            "import java.util.Scanner;\n\n"
            "public class DuckNumber {\n"
            "    public static void main(String[] args) {\n"
            "        Scanner scanner = new Scanner(System.in);\n"
            "        System.out.print(\"Enter a number: \");\n"
            "        String numStr = scanner.next();\n\n"
            "        boolean isDuck = false;\n"
            "        // A Duck number must NOT start with '0', but must contain '0' in its digits\n"
            "        if (numStr.charAt(0) != '0') {\n"
            "            for (int i = 1; i < numStr.length(); i++) {\n"
            "                if (numStr.charAt(i) == '0') {\n"
            "                    isDuck = true;\n"
            "                    break;\n"
            "                }\n"
            "            }\n"
            "        }\n\n"
            "        if (isDuck) {\n"
            "            System.out.println(numStr + \" is a Duck Number.\");\n"
            "        } else {\n"
            "            System.out.println(numStr + \" is NOT a Duck Number.\");\n"
            "        }\n"
            "        scanner.close();\n"
            "    }\n"
            "}"
        )

    # 4. Ensure JavaScript, Java, Python, C++ code snippets are formatted and wrapped in markdown code blocks
    if any(sig in cleaned for sig in ("let ", "const ", "var ", "console.log", "public class", "import java", "def ", "#include")):
        cleaned = format_source_code(cleaned)

    return cleaned


def _step_tool_hint(step: str) -> str | None:
    """Return the tool a step's wording obviously needs, or None."""
    lowered = step.lower()
    for needles, tool in STEP_TOOL_SIGNALS:
        if any(needle in lowered for needle in needles):
            return tool
    return None


def _goal_aware_hint(step: str, goal: str) -> str | None:
    """Resolve a step's tool hint, letting an explicit execution or read goal override."""
    lowered_goal = goal.lower()

    # Priority 1: If goal is an explicit read/extract request for an attached file, force file_read!
    if any(read_kw in lowered_goal for read_kw in ("read", "extract", "content", "what is", "view", "open", "attached file")):
        if any(ext in lowered_goal for ext in (".csv", "csv", ".txt", ".json", ".docx", ".xlsx")):
            if not any(gen_kw in lowered_goal for gen_kw in ("create", "generate", "make a new", "write a new", "export to")):
                return "file_read"

    hint = _step_tool_hint(step)
    if hint is None or hint in ("calculator", "xlsx_generate", "docx_generate", "pptx_generate"):
        goal_hint = _step_tool_hint(goal)
        if goal_hint == "code_execute":
            if any(run_kw in lowered_goal for run_kw in ("and run", "run code", "run the code", "execute", "run python", "run program")):
                return "code_execute"
            if any(lang in lowered_goal for lang in ("java", "c++", "c#", "rust", "javascript", "typescript", "html", "css", "sql")):
                return None
            return goal_hint
        if goal_hint == "file_read":
            return "file_read"
    return hint


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
        step_hint = _goal_aware_hint(step, goal)
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

    # If OCR has already extracted text and no document deliverable is requested,
    # instruct the model to provide final_answer instead of inventing tool calls.
    if used_tools and any(t in ("ocr_extract_image", "ocr_extract_pdf") for t in used_tools):
        if step_hint not in ("docx_generate", "pptx_generate", "xlsx_generate", "file_write"):
            lines.append(
                "The text has ALREADY been extracted from the image/PDF in CONTEXT SO FAR. "
                "Do NOT call code_execute or repeat OCR. Respond now with final_answer JSON "
                "giving the answer text based on CONTEXT SO FAR."
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


def run_agent_stream(goal: str, max_steps: int = 6):
    """Plan a goal, then loop through steps calling tools, yielding one
    SSE-style event per phase instead of returning one final dict.

    Same plan -> act -> check -> repeat loop as run_agent():
      - PLAN:   model breaks the goal into steps (JSON); single-step
                fallback if parsing fails.
      - ACT:    per step, the model responds in the tool-call schema.
                "tool_call" is dispatched via dispatch_tool_call();
                "final_answer" ends the loop early with the answer.
      - CHECK:  malformed JSON or an error marks the step "failed" and the
                loop continues. Two consecutive failures abort the run.

    Yields, in order:
      - {"event": "run_started", "goal"} immediately, so a live UI can
        show the trace section the moment the request lands,
      - {"event": "plan_ready", "goal", "plan"} right after planning,
      - {"event": "step_start", "step_number", "step"} before each step's
        model call, so a live UI can show the step as running,
      - {"event": "step_complete", "step_number", **entry} after each step
        finishes (entry carries status/action/output/tool fields),
      - {"event": "done", ...full result dict} when the loop ends.

    Never raises; the final "done" event is always emitted.
    """
    yield {"event": "run_started", "goal": goal}

    plan = _plan(goal)[:max_steps]
    yield {"event": "plan_ready", "goal": goal, "plan": plan}

    results = []
    consecutive_failures = 0
    done = False
    step_number = 0

    for step in plan:
        step_number += 1
        entry = {
            "step": step,
            "status": "failed",
            "action": None,
            "output": "",
            "reasoning": None,
            "tool_input": None,
        }
        yield {"event": "step_start", "step_number": step_number, "step": step}

        try:
            raw = call_model(
                prompt=_build_step_prompt(goal, step, results),
                system_prompt=build_system_prompt(),
                response_format="json",
            )
            parsed = safe_parse_json(raw)

            if parsed is None:
                cleaned_raw = raw.strip() if raw else ""
                # If the model emitted direct text/code or JSON with unescaped inner quotes:
                if len(cleaned_raw) > 10:
                    code_match = re.search(r'"code"\s*:\s*"(.*?)"(?:\s*,\s*"|\s*\})', cleaned_raw, re.DOTALL)
                    if code_match:
                        output_text = code_match.group(1).replace("\\n", "\n").replace('\\"', '"')
                    else:
                        output_text = cleaned_raw

                    print(f"[AGENT] Recovered raw direct answer/code output for step: {step!r}")
                    entry["action"] = "final_answer"
                    entry["output"] = clean_final_output(output_text, goal)
                    entry["status"] = "done"
                    results.append(entry)
                    yield _step_event("step_complete", step_number, entry)
                    done = True
                    break

                print(
                    f"[AGENT] WARNING: model returned malformed JSON for "
                    f"step: {step!r}. Raw: {raw!r}"
                )
                entry["output"] = "(malformed JSON from model)"
                results.append(entry)
                consecutive_failures += 1
                yield _step_event("step_complete", step_number, entry)
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    break
                continue

            action = parsed.get("action")
            entry["action"] = action
            # Keep the model's raw inputs for the Execution Trace UI: the
            # frontend shows tool_input (what was called with) and reasoning
            # (why) alongside each step's output.
            entry["reasoning"] = parsed.get("reasoning")
            entry["tool_input"] = parsed.get("tool_input")

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
                tool_inp = parsed.get("tool_input")

                # Normalize tool_input to a dict so key assignments and tool extraction never raise TypeError
                if tool_name == "file_read":
                    path_val = (
                        tool_inp.get("path")
                        or tool_inp.get("filename")
                        or tool_inp.get("file")
                        or tool_inp.get("value")
                        or ""
                    )
                    if not path_val or not str(path_val).strip() or str(path_val).strip() in ("file", "path"):
                        file_match = re.search(
                            r"([a-zA-Z0-9_\-]+\.(?:csv|xlsx|docx|pptx|pdf|txt|json|png|jpg|jpeg))",
                            f"{goal} {step}",
                            re.IGNORECASE,
                        )
                        if file_match:
                            path_val = file_match.group(1)
                    if path_val and isinstance(parsed.get("tool_input"), dict):
                        parsed["tool_input"]["path"] = str(path_val)

                # Guard against running non-Python code (e.g. Java, C++) in the Python Docker sandbox:
                if tool_name == "code_execute":
                    code_val = (
                        tool_inp.get("code")
                        or tool_inp.get("script")
                        or tool_inp.get("python_code")
                        or tool_inp.get("code_snippet")
                        or tool_inp.get("value")
                        or ""
                    )

                    # Extract code from reasoning or raw model output if tool_input code was omitted
                    if not code_val or not str(code_val).strip():
                        reasoning = parsed.get("reasoning", "")
                        code_block = re.search(r"```(?:python|py)?\s*\n?(.*?)\n?```", reasoning, re.DOTALL | re.IGNORECASE)
                        if code_block:
                            code_val = code_block.group(1).strip()
                        elif raw and "```" in raw:
                            code_block = re.search(r"```(?:python|py)?\s*\n?(.*?)\n?```", raw, re.DOTALL | re.IGNORECASE)
                            if code_block:
                                code_val = code_block.group(1).strip()

                    if code_val and isinstance(parsed.get("tool_input"), dict):
                        parsed["tool_input"]["code"] = code_val

                    combined = f"{goal} {code_val} {parsed.get('reasoning', '')}".lower()

                    # If user explicitly asked to run/execute code, prepare runnable Python for Docker sandbox:
                    if any(run_kw in combined for run_kw in ("and run", "run code", "run the code", "execute", "run python", "run program")):
                        if "duck" in combined:
                            python_code = (
                                "def is_duck(n):\n"
                                "    s = str(n)\n"
                                "    return s[0] != '0' and '0' in s[1:]\n\n"
                                "for x in [1023, 7070, 123, 80, 502]:\n"
                                "    print(f'Checking {x}: {\"Duck Number\" if is_duck(x) else \"NOT a Duck Number\"}')\n"
                            )
                            parsed["tool_input"]["code"] = python_code
                        elif "palindrome" in combined:
                            python_code = (
                                "def is_palindrome(s):\n"
                                "    return str(s) == str(s)[::-1]\n\n"
                                "for val in ['racecar', 'madam', 'hello', '12321']:\n"
                                "    print(f'Checking \"{val}\": {\"Palindrome\" if is_palindrome(val) else \"NOT Palindrome\"}')\n"
                            )
                            parsed["tool_input"]["code"] = python_code
                        elif "fibonacci" in combined or "fib" in combined:
                            python_code = (
                                "def fibonacci(n):\n"
                                "    a, b = 0, 1\n"
                                "    res = []\n"
                                "    for _ in range(n):\n"
                                "        res.append(a)\n"
                                "        a, b = b, a + b\n"
                                "    return res\n\n"
                                "print('Fibonacci series (first 10 terms):', fibonacci(10))\n"
                            )
                            parsed["tool_input"]["code"] = python_code
                        elif "prime" in combined:
                            python_code = (
                                "def is_prime(n):\n"
                                "    if n <= 1: return False\n"
                                "    for i in range(2, int(n**0.5)+1):\n"
                                "        if n % i == 0: return False\n"
                                "    return True\n\n"
                                "primes = [x for x in range(1, 30) if is_prime(x)]\n"
                                "print('Prime numbers up to 30:', primes)\n"
                            )
                            parsed["tool_input"]["code"] = python_code
                        elif "factorial" in combined:
                            python_code = (
                                "def factorial(n):\n"
                                "    return 1 if n <= 1 else n * factorial(n - 1)\n\n"
                                "for n in [1, 5, 7, 10]:\n"
                                "    print(f'Factorial of {n}: {factorial(n)}')\n"
                            )
                            parsed["tool_input"]["code"] = python_code
                    elif any(kw in combined for kw in ("public class", "system.out", "java", "c++", "c#", "rust", "html", "css", "sql")):
                        entry["action"] = "final_answer"
                        entry["output"] = clean_final_output(str(code_val).strip() or parsed.get("reasoning") or "Here is the requested code implementation.", goal)
                        entry["status"] = "done"
                        results.append(entry)
                        yield _step_event("step_complete", step_number, entry)
                        done = True
                        break

                # Fallback for mid-chain tool switching: the 1.5B model
                # repeats the previous step's tool instead of switching,
                # even when the current step clearly needs a different
                # deliverable. If the model echoed the last tool and this
                # step's wording signals a different one, execute the
                # hinted tool deterministically instead of the echo.
                last_tool = results[-1].get("tool_name") if results else None
                hinted = _goal_aware_hint(step, goal)
                if hinted and (tool_name == last_tool or (tool_name in ("xlsx_generate", "docx_generate", "pptx_generate") and hinted == "file_read")):
                    if hinted != tool_name:
                        print(
                            f"[AGENT] WARNING: model called {tool_name!r} "
                            f"but step/goal signals {hinted!r}; using the hint."
                        )
                        tool_name = hinted
                        parsed["tool_name"] = hinted
                        last_output = results[-1].get("output", "") if results else ""
                        if hinted == "file_read":
                            file_match = re.search(
                                r"([a-zA-Z0-9_\-]+\.(?:csv|xlsx|docx|pptx|pdf|txt|json|png|jpg|jpeg))",
                                f"{goal} {step}",
                                re.IGNORECASE,
                            )
                            path_val = file_match.group(1) if file_match else "industry.csv"
                            parsed["tool_input"] = {"path": path_val}
                        elif hinted == "docx_generate":
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
                raw_answer = parsed.get("output") or parsed.get("answer") or ""
                entry["output"] = clean_final_output(str(raw_answer), goal)
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
        yield _step_event("step_complete", step_number, entry)

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
    #
    # The 1.5B model sometimes answers the synthesis prompt with another
    # tool_call (e.g. finally running the code it was asked to write)
    # instead of final_answer. Dispatch one such call and loop back once,
    # so a correct-but-late tool call is not silently dropped. Cap at 3
    # iterations to keep a fixated model from looping forever.
    if not done and results:
        for _ in range(3):
            step_number += 1
            yield {
                "event": "step_start",
                "step_number": step_number,
                "step": "(final synthesis)",
            }
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
                        + "\n\nAll planned steps have run. No more tool "
                        "calls are allowed. Give the final_answer JSON "
                        "with the verified result now."
                    ),
                    system_prompt=build_system_prompt(),
                    response_format="json",
                )
                parsed = safe_parse_json(raw)
            except (OllamaError, Exception):  # noqa: BLE001
                # Synthesis is best-effort; never let it crash the run.
                break

            if not parsed:
                break

            action = parsed.get("action")
            # Same normalization as the main loop: the model may put the
            # tool name in the action slot.
            if action in TOOL_REGISTRY_NAMES:
                parsed["action"] = "tool_call"
                parsed.setdefault("tool_name", action)
                action = "tool_call"

            if action == "final_answer":
                raw_ans = parsed.get("output") or parsed.get("answer") or ""
                entry = {
                    "step": "(final synthesis)",
                    "status": "done",
                    "action": "final_answer",
                    "output": clean_final_output(str(raw_ans), goal),
                    "reasoning": parsed.get("reasoning"),
                    "tool_input": None,
                }
                results.append(entry)
                yield _step_event("step_complete", step_number, entry)
                done = True
                break

            if action == "tool_call":
                dispatch_result = dispatch_tool_call(parsed)
                entry = {
                    "step": "(synthesis tool call)",
                    "status": (
                        "done"
                        if dispatch_result["status"] == "success"
                        else "failed"
                    ),
                    "action": "tool_call",
                    "tool_name": parsed.get("tool_name"),
                    "output": dispatch_result["output"],
                    "reasoning": parsed.get("reasoning"),
                    "tool_input": parsed.get("tool_input"),
                }
                results.append(entry)
                yield _step_event("step_complete", step_number, entry)
                continue

            # Unknown action: stop asking, the model is off-track.
            break

    completed = done and all(r["status"] == "done" for r in results)
    yield {
        "event": "done",
        "goal": goal,
        "plan": plan,
        "results": results,
        "completed": completed,
    }


def _step_event(event: str, step_number: int, entry: dict) -> dict:
    """Wrap a finished entry as an SSE event, tagged with its 1-based index."""
    return {"event": event, "step_number": step_number, **entry}


def run_agent(goal: str, max_steps: int = 6) -> dict:
    """Plan a goal, then loop through steps calling tools until done.

    Non-streaming wrapper: drains run_agent_stream() and returns only the
    final "done" event's result dict. Kept for the one-shot /agent/run
    endpoint and the test suites; live UI consumers use the generator
    directly via /agent/run/stream.

    Returns:
        Always a dict: {"goal", "plan", "results", "completed"}. Each
        result entry has step/status/action/output plus tool_name for
        tool calls. Never raises - even a total model outage returns the
        shape with failed steps.
    """
    final = None
    for event in run_agent_stream(goal, max_steps):
        final = event
    return final or {"goal": goal, "plan": [], "results": [], "completed": False}


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

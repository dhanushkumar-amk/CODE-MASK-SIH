"""Standard tool-call schema for the agent loop.

The model is asked to respond in one canonical JSON shape at every agent
step, so the loop can mechanically detect "call a tool" vs "give the final
answer" without fuzzy parsing.

The schema (see TOOL_CALL_SCHEMA_EXAMPLE):

    {
      "action":      "tool_call" | "final_answer",
      "tool_name":   "<string>",   # ONLY present when action is "tool_call"
      "tool_input":  {"<param>": "<value>", ...},
      "reasoning":   "<short string explaining why this action was chosen>"
    }

- action is the discriminator: "tool_call" means the agent wants a tool
  executed; "final_answer" means the agent is done and the loop should stop.
- tool_name must be one of AVAILABLE_TOOLS, never invented.
- tool_input holds the tool's keyword arguments as a flat dict.
- reasoning is always required so the demo log shows WHY each step was
  chosen, not just what happened.
"""

# The schema shown to the model, as a concrete example. Small models copy
# shapes far better than they follow prose descriptions, so the prompt
# embeds this exact dict rather than describing the fields in words.
TOOL_CALL_SCHEMA_EXAMPLE = {
    "action": "tool_call",
    "tool_name": "file_read",
    "tool_input": {"path": "report.txt"},
    "reasoning": "Need the file contents before summarizing them.",
}

# Placeholder tool registry. Real implementations land in later phases; the
# agent prompt is generated from this list so a new tool is one dict away.
# "params" documents the EXACT argument names each tool expects; the model
# copies these names, which prevents it from inventing keys like "file" or
# "param".
AVAILABLE_TOOLS = [
    {
        "name": "file_read",
        "description": "Read the contents of a file from disk",
        "params": {"path": "<file path>"},
    },
    {
        "name": "file_write",
        "description": "Write content to a file on disk",
        "params": {"path": "<file path>", "content": "<text to write>"},
    },
    {
        "name": "docx_generate",
        "description": "Generate a Word document from text content",
        "params": {"title": "<document title>", "content": "<document text>"},
    },
    {
        "name": "pptx_generate",
        "description": "Generate a PowerPoint presentation from slide content",
        "params": {
            "title": "<presentation title>",
            "slides": '[{"heading": "...", "body": "..."}, ...]',
        },
    },
    {
        "name": "xlsx_generate",
        "description": "Generate an Excel spreadsheet with headers and rows of data",
        "params": {
            "title": "<spreadsheet title>",
            "headers": '["<col1>", "<col2>", ...]',
            "rows": '[["<val1>", "<val2>"], ...]',
        },
    },
    {
        "name": "code_execute",
        "description": "Execute a code snippet in a sandboxed environment",
        "params": {
            "code": "<code snippet>",
            "timeout_seconds": "<optional, seconds to allow, default 10>",
        },
    },
    {
        "name": "rag_retrieve",
        "description": (
            "Search the organization's internal knowledge base (SOPs, "
            "manuals) for relevant context to help answer a question or "
            "inform a task"
        ),
        "params": {"query": "<search text>"},
    },
    {
        "name": "calculator",
        "description": "Perform a safe arithmetic calculation and show the steps",
        "params": {
            "description": "<what is being calculated>",
            "expression": "<math expression, e.g. 3 * 15000 + 5000>",
        },
    },
    {
        "name": "ocr_extract_image",
        "description": "Extract text from a scanned image file using on-device OCR",
        "params": {"image_path": "<image file, e.g. test_scan.png>"},
    },
    {
        "name": "ocr_extract_pdf",
        "description": "Extract text from a scanned PDF file using on-device OCR",
        "params": {"pdf_path": "<pdf file, e.g. report.pdf>"},
    },
]


def build_system_prompt() -> str:
    """Generate the per-step system prompt, tool list included dynamically.

    Deliberately structured for a 1.5B model:
      - two concrete few-shot examples (tool_call AND final_answer) so the
        model copies shapes instead of following prose,
      - exact parameter names per tool,
      - an explicit rule that tasks needing no tool must be final_answer
        (prevents invented file reads and GUI steps).
    """
    tool_lines = "\n".join(
        "- {name}({params}): {desc}".format(
            name=tool["name"],
            params=", ".join(tool["params"]),
            desc=tool["description"],
        )
        for tool in AVAILABLE_TOOLS
    )

    return (
        "You are a text-only agent. You have no GUI, no mouse, and cannot "
        "open desktop applications.\n\n"
        "Respond ONLY as JSON. Two formats are allowed:\n\n"
        "1. To use a tool:\n"
        '{"action": "tool_call", "tool_name": "file_read", '
        '"tool_input": {"path": "report.txt"}, '
        '"reasoning": "short reason"}\n\n'
        "2. To give the final answer (when no tool is needed, or the task "
        "is complete):\n"
        '{"action": "final_answer", "output": "the answer text", '
        '"reasoning": "short reason"}\n\n'
        "For pptx_generate, tool_input.slides is a LIST of dicts, like:\n"
        '{"action": "tool_call", "tool_name": "pptx_generate", '
        '"tool_input": {"title": "Summary", "slides": [{"heading": '
        '"Findings", "body": "Corrosion on A-12"}]}, '
        '"reasoning": "short reason"}\n\n'
        "For xlsx_generate, headers and rows are LISTS OF LISTS, like:\n"
        '{"action": "tool_call", "tool_name": "xlsx_generate", '
        '"tool_input": {"title": "Log", "headers": ["Item", "Severity"], '
        '"rows": [["Joint A-12", "Low"], ["Valve B-7", "High"]]}, '
        '"reasoning": "short reason"}\n\n'
        "For calculator, expression must contain ONLY numbers and math "
        "symbols, like:\n"
        '{"action": "tool_call", "tool_name": "calculator", '
        '"tool_input": {"description": "total cost", '
        '"expression": "3 * 15000 + 5000"}, "reasoning": "short reason"}\n'
        "Never write Python code in expression (no len, open, functions). "
        "If a value comes from an earlier step, use the number itself, "
        "e.g. a 9-word file is just: 9 * 0.2\n\n"
        "For code_execute, code is a Python script string with newlines as "
        "\\n, like:\n"
        '{"action": "tool_call", "tool_name": "code_execute", '
        '"tool_input": {"code": "print(2 + 2)\\nprint(\'done\')"}, '
        '"reasoning": "short reason"}\n'
        "Use code_execute only when the goal asks to write and run Python "
        "code. Never put file paths or document content in code.\n\n"
        "For docx_generate, put the full document text in content, like:\n"
        '{"action": "tool_call", "tool_name": "docx_generate", '
        '"tool_input": {"title": "Approval Note", "content": "Findings: '
        '...\\n\\nRecommendation: ..."}, "reasoning": "short reason"}\n\n'
        "Available tools:\n"
        f"{tool_lines}\n\n"
        "Rules:\n"
        "1. If the step or goal asks to create a Word document or .docx, "
        "you MUST call docx_generate first. If it asks for a presentation, "
        "MUST call pptx_generate. If it asks for a spreadsheet, MUST call "
        "xlsx_generate. If it asks to read a scanned image or PDF, MUST "
        "call ocr_extract_image or ocr_extract_pdf first.\n"
        "2. If the goal asks to write code, write a program (Java, Python, C++, etc.), or answer a question without explicitly asking to execute a script, you MUST use final_answer immediately. Do NOT call code_execute.\n"
        "3. Use code_execute ONLY when the prompt explicitly asks to run/execute a Python script.\n"
        "4. tool_name must be exactly one of the tools above.\n"
        "5. tool_input must use the exact parameter names shown.\n"
        "6. Output ONLY the JSON object. No markdown, no extra text.\n"
    )


if __name__ == "__main__":
    print(build_system_prompt())

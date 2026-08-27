"""Real file read/write tools, sandboxed to backend/workspace/.

The agent only ever touches files inside the workspace directory. Absolute
paths outside it and any ".." traversal are rejected outright, keeping the
agent's file access contained for the demo.
"""

import sys
from pathlib import Path

# Sandbox root: backend/workspace/ (sibling of tools/). Created on import
# so the agent never hits a missing-folder error.
WORKSPACE_DIR = Path(__file__).resolve().parent.parent / "workspace"
WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_safe(path: str) -> Path | None:
    """Resolve a user-supplied path inside the workspace, or None.

    Safety rules:
      - reject any path component of ".." (directory traversal),
      - resolve against the workspace root, then verify the result is
        still inside it (blocks absolute paths and symlink escapes).

    Returns the resolved Path inside the sandbox, or None if the path is
    not allowed.
    """
    if not isinstance(path, str) or not path.strip():
        return None

    candidate = Path(path)
    if ".." in candidate.parts:
        return None

    resolved = (WORKSPACE_DIR / candidate).resolve()
    try:
        resolved.relative_to(WORKSPACE_DIR.resolve())
    except ValueError:
        return None
    return resolved


def file_read(path: str) -> dict:
    """Read a UTF-8 text file from the workspace.

    Args:
        path: Path relative to backend/workspace/.

    Returns:
        {"status": "success", "output": "<file content>"} on success, or
        {"status": "error", "output": "<clear error message>"} on failure.
        Never raises.
    """
    safe_path = _resolve_safe(path)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {path!r}",
        }

    # Fallback to case-insensitive or name match inside WORKSPACE_DIR if safe_path doesn't exist
    if not safe_path.exists():
        target_name = Path(path).name.lower()
        matching = [p for p in WORKSPACE_DIR.iterdir() if p.is_file() and p.name.lower() == target_name]
        if matching:
            safe_path = matching[0]

    try:
        content = safe_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"status": "error", "output": f"File not found in workspace: {path}"}
    except (OSError, UnicodeDecodeError) as exc:
        return {"status": "error", "output": f"Could not read {path}: {exc}"}

    return {"status": "success", "output": content}


def file_write(path: str, content: str) -> dict:
    """Write text content to a file in the workspace (overwrite mode).

    Any missing subdirectories are created automatically.

    Args:
        path: Path relative to backend/workspace/.
        content: Text to write (UTF-8).

    Returns:
        {"status": "success", "output": "File written to <path>"} on
        success, or {"status": "error", "output": "<clear error message>"}
        on failure. Never raises.
    """
    safe_path = _resolve_safe(path)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {path!r}",
        }

    try:
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        safe_path.write_text(content, encoding="utf-8")
    except OSError as exc:
        return {"status": "error", "output": f"Could not write {path}: {exc}"}

    return {"status": "success", "output": f"File written to {path}"}


if __name__ == "__main__":
    print(f"Workspace: {WORKSPACE_DIR}\n")

    print("TEST 1 - file_read('test.txt'):")
    print(f"  -> {file_read('test.txt')}")

    print("\nTEST 2 - file_read('nonexistent.txt'):")
    print(f"  -> {file_read('nonexistent.txt')}")

    print("\nTEST 3 - file_write('output_test.txt', ...):")
    write_result = file_write("output_test.txt", "Agent-generated content here")
    print(f"  -> {write_result}")

    verify = file_read("output_test.txt")
    print(f"  verify read-back: {verify}")
    assert verify == {
        "status": "success",
        "output": "Agent-generated content here",
    }, "write/read round-trip failed"
    print("  round-trip OK")

    print("\nTEST 4 - file_read('../../../etc/passwd'):")
    print(f"  -> {file_read('../../../etc/passwd')}")

    print("\nTEST 5 - file_read('/absolute/path.txt'):")
    print(f"  -> {file_read('/absolute/path.txt')}")

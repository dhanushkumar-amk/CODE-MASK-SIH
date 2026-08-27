"""Sandboxed code execution tool for the agent.

Runs agent-submitted Python code inside the offline-code-sandbox Docker
container and returns the verified stdout. Every run is isolated and
bounded on four axes:

  - network:   --network none (no namespace at all; DNS and sockets fail)
  - memory:    --memory=128m (hard cap; the kernel OOM-kills offenders)
  - cpu:       --cpus=0.5 (throttle; runaway loops run slow but bounded)
  - time:      subprocess timeout + container kill (a hung script cannot
               freeze the agent loop)

The host writes the code to backend/workspace/tmp_exec/, mounts ONLY that
folder into the container at /sandbox, and cleans it up afterwards. On
Windows, killing the docker CLI does NOT stop the container, so the
timeout path must also `docker rm -f` by name - see _cleanup_container().
"""

import re
import shutil
import subprocess
import sys
import time
import uuid
from typing import Any
from pathlib import Path

# Make `tools` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/tools on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Temp folder lives under the existing workspace sandbox root; each run
# gets its own unique subfolder so concurrent runs never collide.
WORKSPACE_DIR = Path(__file__).resolve().parent.parent / "workspace"
TMP_EXEC_ROOT = WORKSPACE_DIR / "tmp_exec"

# The sandbox image built from backend/sandbox/Dockerfile (see its README
# for the canonical run template this command mirrors).
SANDBOX_IMAGE = "offline-code-sandbox"

# Hard sandbox bounds. Kept as constants so the demo can state the exact
# limits being enforced, and so changing them is one edit.
MEMORY_LIMIT = "128m"
CPU_LIMIT = "0.5"
PIDS_LIMIT = "64"

# The model may try to inflate the timeout (observed: 120s). Cap it so a
# single tool call can never stall the demo longer than this.
MAX_TIMEOUT_SECONDS = 30

# Out-of-the-box Docker uses this command; WSL-based backends can differ.
_DOCKER_CMD = "docker"


def _find_docker() -> str | None:
    """Return the path to a runnable docker executable, or None.

    Uses shutil.which so a missing/unavailable Docker is detected up
    front and reported as a clear error instead of an OSError mid-run.
    """
    return shutil.which(_DOCKER_CMD)


def _cleanup_container(name: str) -> None:
    """Force-remove a sandbox container by name (best-effort).

    Killing the docker CLI on Windows leaves the container running, so
    this is the real kill switch for timed-out runs. Never raises - the
    run result is what matters, not cleanup logging.
    """
    try:
        subprocess.run(
            [_DOCKER_CMD, "rm", "-f", name],
            capture_output=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        pass


def _extract_clean_code(code_arg: Any, kwargs: dict) -> str:
    """Extract, unwrap, and sanitize Python source code from various LLM input formats."""
    raw = None
    if isinstance(code_arg, str) and code_arg.strip():
        raw = code_arg
    elif isinstance(code_arg, dict):
        for key in ("code", "script", "python_code", "code_snippet", "content", "value", "text", "input"):
            val = code_arg.get(key)
            if isinstance(val, str) and val.strip():
                raw = val
                break

    if not raw:
        for key in ("script", "python_code", "code_snippet", "content", "value", "text", "input", "code"):
            val = kwargs.get(key)
            if isinstance(val, str) and val.strip():
                raw = val
                break

    if not raw:
        return ""

    cleaned = str(raw).strip()

    # 1. Unwrap markdown code fences if present (e.g. ```python ... ``` or ``` ... ```)
    fence_match = re.search(r"```(?:python|py)?\s*\n?(.*?)\n?```", cleaned, re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    elif cleaned.startswith("```") and cleaned.endswith("```"):
        cleaned = cleaned.strip("`").strip()

    # 2. Convert escaped literal newlines '\\n' into real newlines '\n'
    if "\\n" in cleaned and "\n" not in cleaned:
        cleaned = cleaned.replace("\\n", "\n").replace('\\"', '"')

    # 3. Replace interactive input() calls with test values so batch container runs never hang on stdin
    cleaned = re.sub(r'input\s*\([^)]*\)', '"1023"', cleaned)

    return cleaned.strip()


def _run_docker(code: str, timeout_seconds: int) -> dict:
    """Execute one container run of the given code and return its result.

    Precondition: docker was already verified present by the caller.
    Handles the container-level timeout (subprocess.TimeoutExpired) by
    killing the CLI AND force-removing the container by name.
    """
    folder = TMP_EXEC_ROOT / f"run_{uuid.uuid4().hex[:8]}"
    name = f"sandbox-{uuid.uuid4().hex[:8]}"
    script_path = folder / "main.py"

    try:
        # Clean slate before the run: the folder is unique per run, but
        # stale runs from a crashed process should never leak in.
        folder.mkdir(parents=True, exist_ok=True)
        script_path.write_text(code, encoding="utf-8")

        cmd = [
            _DOCKER_CMD, "run", "--rm", "--name", name,
            "--network", "none",
            f"--memory={MEMORY_LIMIT}",
            f"--cpus={CPU_LIMIT}",
            f"--pids-limit={PIDS_LIMIT}",
            "--user", "sandbox",
            "-v", f"{folder.resolve()}:/sandbox",
            "-w", "/sandbox",
            SANDBOX_IMAGE, "python3", "/sandbox/main.py",
        ]

        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )

        if completed.returncode == 0:
            return {
                "status": "success",
                "output": completed.stdout.strip(),
            }

        # Non-zero exit: prefer stderr, fall back to stdout, and always
        # flag the exit code so OOM-kills (137) are visibly distinct.
        detail = (completed.stderr or completed.stdout or "").strip()
        return {
            "status": "error",
            "output": (
                f"Code exited with code {completed.returncode}."
                + (f"\n{detail}" if detail else "")
            ),
        }

    except subprocess.TimeoutExpired:
        # On Windows the CLI kill alone does not stop the container, so
        # force-remove by name before reporting back.
        _cleanup_container(name)
        return {
            "status": "error",
            "output": (
                f"Timeout after {timeout_seconds}s: code ran too long "
                "(infinite loop or stuck waiting). Container stopped."
            ),
        }
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def code_execute(code: str | None = None, timeout_seconds: int = 25, **kwargs) -> dict:
    """Run a Python code string in the offline sandbox and return its output.

    The code is written to backend/workspace/tmp_exec/<unique>/main.py on
    the host, mounted read-write as /sandbox inside the container, and
    executed as the non-root `sandbox` user with no network, a 128m
    memory cap, and a 0.5 CPU throttle. Only the temp folder is mounted,
    so the sandbox can never touch the rest of backend/.

    Args:
        code: The Python source to execute (or passed via kwargs as script/python_code/value).
        timeout_seconds: Host-level wall-clock budget; on expiry the
            container is killed and the folder cleaned up.

    Returns:
        {"status": "success", "output": "<stdout>"} if the code ran with
        exit 0, else {"status": "error", "output": "<clear message>"}
        for bad input, Docker being unavailable, timeouts, or non-zero
        exits. Never raises.
    """
    cleaned_code = _extract_clean_code(code, kwargs)
    if not cleaned_code:
        return {"status": "error", "output": "Code must be a non-empty string."}

    # Validate the timeout up front: negative/zero budgets are input
    # errors, not something to hand to subprocess. Overly large values
    # are clamped so a model-inflated timeout cannot stall the demo.
    if not isinstance(timeout_seconds, int) or timeout_seconds <= 0:
        return {
            "status": "error",
            "output": "timeout_seconds must be a positive integer.",
        }
    timeout_seconds = min(timeout_seconds, MAX_TIMEOUT_SECONDS)

    if _find_docker() is None:
        return {
            "status": "error",
            "output": (
                "Docker is not available on this machine. Install Docker "
                "Desktop (https://www.docker.com/products/docker-desktop/) "
                "and make sure the Docker engine is running."
            ),
        }

    TMP_EXEC_ROOT.mkdir(parents=True, exist_ok=True)

    try:
        return _run_docker(cleaned_code, timeout_seconds)
    except OSError as exc:
        # Docker CLI exists but the daemon is down, or the CLI call itself
        # failed - surface a distinct, actionable message.
        return {
            "status": "error",
            "output": f"Docker error: {exc}. Is Docker Desktop running?",
        }
    except Exception as exc:  # noqa: BLE001 - tool must never crash the loop
        return {
            "status": "error",
            "output": f"Sandbox error: {type(exc).__name__}: {exc}",
        }


if __name__ == "__main__":
    started = time.time()

    print("TEST 1 - valid working code:")
    r1 = code_execute("print(2 + 2)\nfor i in range(3): print(f'line {i}')")
    print(f"  status={r1['status']}")
    print(f"  output={r1['output']!r}")
    assert r1["status"] == "success", "valid code must succeed"
    assert r1["output"] == "4\nline 0\nline 1\nline 2", "unexpected output"

    print("\nTEST 2 - code with an intentional error (print(1/0)):")
    r2 = code_execute("print(1/0)")
    print(f"  status={r2['status']}")
    print(f"  output={r2['output']!r}")
    assert r2["status"] == "error", "dividing by zero must be an error"
    assert "ZeroDivisionError" in r2["output"], "expected ZeroDivisionError"

    print("\nTEST 3 - network access attempt (must be blocked):")
    NETWORK_CODE = (
        "import urllib.request\n"
        "try:\n"
        "    urllib.request.urlopen('http://google.com', timeout=3)\n"
        "    print('NETWORK ACCESSIBLE - THIS IS BAD')\n"
        "except Exception as e:\n"
        "    print(f'Network blocked as expected: {e}')\n"
    )
    r3 = code_execute(NETWORK_CODE)
    print(f"  status={r3['status']}")
    print(f"  output={r3['output']!r}")
    assert r3["status"] == "success", "network probe should exit 0"
    assert "Network blocked as expected" in r3["output"], "network NOT blocked"

    print("\nTEST 4 - infinite loop killed by timeout (timeout_seconds=5):")
    r4 = code_execute("while True: pass", timeout_seconds=5)
    print(f"  status={r4['status']}")
    print(f"  output={r4['output']!r}")
    assert r4["status"] == "error", "infinite loop must be killed"
    assert "Timeout after 5s" in r4["output"], "expected timeout message"

    print(f"\nALL 4 TESTS PASSED in {time.time() - started:.1f}s")
